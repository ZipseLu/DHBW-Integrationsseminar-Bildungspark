/**
 * FE-35: loads a document found by the web search and returns its text, so the
 * KI-Erstellung can adapt it to a level and format.
 *
 *   docx   paragraphs of word/document.xml (same reader as the uploads)
 *   pdf    read by the configured AI model (Gemini understands PDFs directly);
 *          without an AI key a PDF cannot be read – there is no PDF library
 *   other  not supported (415)
 *
 * The URL comes from the client, so the server must not become a proxy into the
 * internal network: only http(s), no credentials, no private or local addresses
 * (checked after DNS resolution and again for every redirect), size and time limits.
 */
import axios from 'axios'
import dns from 'node:dns/promises'
import https from 'node:https'
import net from 'node:net'
import { config } from '../config.js'
import { generateText, isAiConfigured } from '../ai/provider.js'
import { typAusInhalt } from '../uploads/dateityp.js'
import { docxText, normalisiereText } from '../uploads/text.js'

export const MAX_DOKUMENT_BYTES = 15 * 1024 * 1024
/** The prompt only takes 2000 characters of the template anyway; this keeps responses small */
export const MAX_DOKUMENT_ZEICHEN = 20_000
const LADE_TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 3

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Error with HTTP status and code; the route returns it as JSON */
export class DokumentError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'DokumentError'
    this.status = status
    this.code = code
  }
}

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses */
export function istPrivateAdresse(adresse) {
  if (net.isIPv4(adresse)) {
    const [a, b] = adresse.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  if (net.isIPv6(adresse)) {
    const v6 = adresse.toLowerCase()
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return istPrivateAdresse(mapped[1])
    return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith('ff')
  }
  return true
}

/**
 * Checks scheme, credentials and the resolved addresses of a URL.
 * @param {string} url
 * @param {(host: string) => Promise<Array<{address: string}>>} lookup
 */
export async function pruefeUrl(url, lookup = (host) => dns.lookup(host, { all: true })) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new DokumentError('Die Adresse des Dokuments ist ungültig.', 400, 'validation_error')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new DokumentError('Nur Dokumente aus dem Internet (http/https) können geladen werden.', 400, 'validation_error')
  }
  if (parsed.username || parsed.password) {
    throw new DokumentError('Adressen mit Zugangsdaten werden nicht geladen.', 400, 'validation_error')
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '')
  let adressen
  try {
    adressen = net.isIP(host) ? [{ address: host }] : await lookup(host)
  } catch {
    throw new DokumentError('Die Seite des Dokuments ist nicht erreichbar.', 502, 'dokument_nicht_erreichbar')
  }
  if (adressen.length === 0 || adressen.some((a) => istPrivateAdresse(a.address))) {
    throw new DokumentError('Dokumente aus dem lokalen Netz werden nicht geladen.', 400, 'adresse_nicht_erlaubt')
  }
  return parsed
}

/** Downloads the file; every redirect target is checked again. */
async function ladeDatei(url, { lookup, get }) {
  let aktuell = url
  for (let sprung = 0; sprung <= MAX_REDIRECTS; sprung += 1) {
    await pruefeUrl(aktuell, lookup)
    let response
    try {
      response = await get(aktuell, {
        responseType: 'arraybuffer',
        timeout: LADE_TIMEOUT_MS,
        maxRedirects: 0,
        maxContentLength: MAX_DOKUMENT_BYTES,
        httpsAgent: new https.Agent({ keepAlive: false }),
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*;q=0.5' },
        validateStatus: () => true,
      })
    } catch (error) {
      if (error?.code === 'ERR_BAD_RESPONSE' || /maxContentLength/i.test(error?.message ?? '')) {
        throw new DokumentError('Das Dokument ist zu groß (mehr als 15 MB).', 413, 'dokument_zu_gross')
      }
      throw new DokumentError('Das Dokument konnte nicht geladen werden – die Seite antwortet nicht.', 502, 'dokument_nicht_erreichbar')
    }
    if (response.status >= 300 && response.status < 400 && response.headers?.location) {
      aktuell = new URL(response.headers.location, aktuell).toString()
      continue
    }
    if (response.status >= 400) {
      throw new DokumentError(`Das Dokument konnte nicht geladen werden (die Seite antwortet mit ${response.status}).`, 502, 'dokument_nicht_erreichbar')
    }
    return Buffer.from(response.data ?? [])
  }
  throw new DokumentError('Das Dokument konnte nicht geladen werden (zu viele Weiterleitungen).', 502, 'dokument_nicht_erreichbar')
}

const PDF_SYSTEM =
  'Du liest Arbeitsblätter aus PDF-Dateien. Gib nur den Text des Dokuments wieder, in der Reihenfolge des Dokuments: ' +
  'Überschriften, Erklärtexte, Aufgaben mit Nummern und Antwortmöglichkeiten. Bilder kurz in eckigen Klammern beschreiben. ' +
  'Keine Einleitung, keine Kommentare, kein Markdown.'

/** Reads a PDF with the AI model (Gemini accepts PDFs as inline data). */
async function pdfText(buffer, { ai, aiConfigured }) {
  if (!aiConfigured || config.ai.provider !== 'gemini') {
    throw new DokumentError(
      'PDF-Dateien kann das Backend nur mit eingerichteter Gemini-KI lesen. Bitte ein Word-Dokument wählen oder den Text über „Upload“ einfügen.',
      422,
      'pdf_nicht_lesbar',
    )
  }
  let result
  try {
    result = await ai({
      system: PDF_SYSTEM,
      prompt: 'Gib den vollständigen Text dieses Arbeitsblatts wieder.',
      files: [{ mimeType: 'application/pdf', data: buffer.toString('base64') }],
      temperature: 0,
      maxTokens: 8192,
      signal: AbortSignal.timeout(config.ai.timeoutMs),
    })
  } catch {
    throw new DokumentError('Die KI konnte das PDF gerade nicht lesen. Bitte später erneut versuchen.', 502, 'pdf_nicht_lesbar')
  }
  return result.text ?? ''
}

/** Simulated document for WEB_SEARCH_PROVIDER=mock (the mock hits have no real files) */
function mockDokument(url) {
  return {
    text: `Arbeitsblatt (simuliert)\n\nAufgabe 1: Lies den Text.\nAufgabe 2: Kreuze die richtige Antwort an.\n- Antwort A\n- Antwort B\n\nQuelle: ${url}`,
    dateityp: 'pdf',
    gekuerzt: false,
    mocked: true,
  }
}

/**
 * @param {string} url
 * @param {object} [deps] replacements for tests
 * @returns {Promise<{text: string, dateityp: string, gekuerzt: boolean, mocked: boolean}>}
 */
export async function ladeDokument(url, deps = {}) {
  if ((deps.provider ?? config.webSearch.provider) === 'mock') return mockDokument(url)

  const buffer = await ladeDatei(url, { lookup: deps.lookup, get: deps.get ?? axios.get })
  const dateityp = typAusInhalt(buffer)

  let roh
  if (dateityp === 'docx') {
    try {
      roh = docxText(buffer)
    } catch {
      throw new DokumentError('Die Word-Datei konnte nicht gelesen werden.', 422, 'dokument_nicht_lesbar')
    }
  } else if (dateityp === 'pdf') {
    roh = await pdfText(buffer, { ai: deps.ai ?? generateText, aiConfigured: deps.aiConfigured ?? isAiConfigured() })
  } else {
    throw new DokumentError('Nur PDF- und Word-Dokumente (.docx) können angepasst werden.', 415, 'dateityp_nicht_unterstuetzt')
  }

  const text = normalisiereText(roh)
  if (!text) throw new DokumentError('Das Dokument enthält keinen lesbaren Text.', 422, 'dokument_nicht_lesbar')
  const gekuerzt = text.length > MAX_DOKUMENT_ZEICHEN
  return { text: gekuerzt ? text.slice(0, MAX_DOKUMENT_ZEICHEN) : text, dateityp, gekuerzt, mocked: false }
}
