/**
 * Web-Suche nach Arbeitsblaettern im Internet.
 *
 * Zwei Modi:
 *  - 'scrape' (Standard): fragt die DuckDuckGo-HTML-Suche per POST an und
 *    liest die Treffer mit cheerio aus. Kein API-Key, kein Cloud-Konto noetig.
 *    Blockiert DuckDuckGo die Anfrage (Bot-Schutz), werden ersatzweise die
 *    ebenfalls schluesselfreien Yahoo- und Bing-Suchen abgefragt.
 *  - 'mock': liefert simulierte Platzhalter (fuer Entwicklung ohne Internet).
 *
 * Suchoperatoren werden als Teil des `q`-Parameters an die Suchmaschine
 * uebergeben:
 *   filetype:pdf | docx   -> schraenkt auf Dateityp ein
 *   intitle:              -> durchsucht nur den Titel
 *   "exakte phrase"       -> erzwingt genaue Wortgruppe
 *
 * Wenn alle Suchmaschinen fehlschlagen, fallen wir auf Mock-Treffer zurueck,
 * damit die Oberflaeche funktionsfaehig bleibt.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import https from 'node:https'
import { config } from '../config.js'

const DUCKDUCKGO_HTML_URL = 'https://html.duckduckgo.com/html/'
// Mehrere Yahoo-Hosts: einzelne Hosts antworten sporadisch mit HTTP 500.
// Die Rotation verteilt die Anfragen und macht die Suche deutlich robuster.
const YAHOO_SEARCH_HOSTS = [
  'search.yahoo.com',
  'de.search.yahoo.com',
  'uk.search.yahoo.com',
  'ca.search.yahoo.com',
  'au.search.yahoo.com',
]
const BING_SEARCH_URL = 'https://www.bing.com/search'

const ALLOWED_FILE_TYPES = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'])

// Ohne Keep-Alive: langlebige Server-Prozesse halten sonst veraltete
// Verbindungen, die Yahoo sporadisch mit ECONNRESET beendet.
const SEARCH_AGENT = new https.Agent({ keepAlive: false })

/** Merkt sich den zuletzt erfolgreichen Yahoo-Host fuer die naechste Suche. */
let yahooHostIndex = 0

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const HTML_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Holt eine HTML-Seite per GET. Die Suchmaschinen schliessen einzelne
 * Verbindungen sporadisch ohne Antwort; ein zweiter Versuch faengt das ab.
 */
async function fetchHtml(url, attempts = 2) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await axios.get(url, {
        headers: HTML_HEADERS,
        httpsAgent: SEARCH_AGENT,
        timeout: config.webSearch.timeoutMs,
        maxRedirects: 5,
        responseType: 'text',
        validateStatus: (status) => status >= 200 && status < 500,
      })
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) await sleep(300)
    }
  }
  throw lastError
}

/** Ergebnis einer Websuche */
export class WebSearchError extends Error {
  constructor(message, status = 503, code = 'web_search_error') {
    super(message)
    this.name = 'WebSearchError'
    this.status = status
    this.code = code
  }
}

/** Extrahiert die Dateiendung aus einer URL, falls erkennbar */
function extractFileType(url) {
  try {
    const match = new URL(url).pathname.match(/\.([a-zA-Z0-9]{2,5})$/)
    return match ? match[1].toLowerCase() : null
  } catch {
    return null
  }
}

/** Mock-Ergebnisse ohne Internet (strukturell wie echte Treffer, aber simuliert) */
function mockResults(query, fileType, maxResults) {
  const q = query.trim()
  const extension = fileType || 'pdf'
  const slug = encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))
  const sources = ['lehrer-online.de', '4teachers.de', 'ihk-bildungshaus.de', 'bibb.de']

  return sources.slice(0, maxResults).map((source, index) => ({
    title: `Simulierter Treffer zu ${q}`,
    url: `https://www.${source}/material/${slug}/arbeitsblatt-${index + 1}.${extension}`,
    snippet: `Simulierter Treffer zum Suchbegriff "${q}".`,
    source,
    fileType: extension,
    mocked: true,
  }))
}

/**
 * Ergaenzt einen Dateityp-Filter. Ohne expliziten Filter wird auf PDF und
 * DOCX eingeschraenkt, damit die Suche echte Dokumente statt normaler
 * Webseiten (Wikipedia, Rezeptportale, ...) liefert.
 */
function withFileType(query, fileType) {
  if (fileType) {
    if (!ALLOWED_FILE_TYPES.has(fileType)) {
      throw new WebSearchError('Dieser Dateityp wird nicht unterstuetzt.', 400, 'validation_error')
    }

    const explicitFilter = query.match(/\bfiletype:([a-z0-9]+)\b/i)?.[1]?.toLowerCase()
    if (explicitFilter) return query.replace(/\bfiletype:[a-z0-9]+\b/i, `filetype:${fileType}`)
    return `${query} filetype:${fileType}`
  }

  // Eigene filetype:-Operatoren des Nutzers nicht ueberschreiben.
  if (/\bfiletype:/i.test(query)) return query
  return `${query} (filetype:pdf OR filetype:docx)`
}

/** True, wenn der Treffer eine echte Dokumentdatei ist. */
function isDocumentResult(result, fileType) {
  const extension = result.fileType
  if (!extension || !ALLOWED_FILE_TYPES.has(extension)) return false
  return !fileType || extension === fileType
}

/** Entfernt den fuehrenden "www."-Praefix fuer eine kompakte Quellenangabe. */
function sourceFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

/** Bereinigt HTML-Text auf eine einzeilige Beschreibung. */
function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isHttpUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function toResult({ title, url, snippet }) {
  return {
    title: title || '(ohne Titel)',
    url,
    snippet: snippet || '',
    source: sourceFromUrl(url),
    // Nur die tatsaechlich erkennbare Endung melden – der gewuenschte Filter
    // ist keine Garantie dafuer, dass der Treffer wirklich eine Datei ist.
    fileType: extractFileType(url),
    mocked: false,
  }
}

/**
 * DuckDuckGo liefert Links als Redirect ueber /l/?uddg=<ziel>. Diese Funktion
 * loest den Redirect auf und verwirft alle Nicht-HTTP-Ziele.
 */
function resolveDuckDuckGoUrl(href) {
  if (!href) return ''

  let candidate = href.trim()
  if (candidate.startsWith('//')) candidate = `https:${candidate}`

  try {
    const parsed = new URL(candidate, 'https://duckduckgo.com')
    const redirectTarget = parsed.searchParams.get('uddg')
    const target = redirectTarget ? new URL(redirectTarget) : parsed
    if (!isHttpUrl(target.toString())) return ''
    if (/^duckduckgo\.com$/i.test(target.hostname)) return ''
    return target.toString()
  } catch {
    return ''
  }
}

/** DuckDuckGo-HTML-Scraper – keine API, kein Key. */
async function duckduckgoSearch(query, fileType, maxResults) {
  const searchQuery = withFileType(query, fileType)

  let response
  try {
    response = await axios.post(DUCKDUCKGO_HTML_URL, new URLSearchParams({ q: searchQuery }).toString(), {
      headers: {
        ...HTML_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      httpsAgent: SEARCH_AGENT,
      timeout: config.webSearch.timeoutMs,
      maxRedirects: 5,
      responseType: 'text',
      // 202 liefert eine Bot-Schutz-Seite; die wird unten erkannt.
      validateStatus: (status) => status >= 200 && status < 500,
    })
  } catch {
    throw new WebSearchError('DuckDuckGo ist nicht erreichbar.', 503, 'web_search_unavailable')
  }

  const html = String(response.data ?? '')
  if (response.status >= 400 || /anomaly|challenge/i.test(html)) {
    throw new WebSearchError('DuckDuckGo hat die Anfrage blockiert.', 503, 'web_search_unavailable')
  }

  const $ = cheerio.load(html)
  const results = []
  const seenUrls = new Set()

  $('.result').each((_, element) => {
    if (results.length >= maxResults) return false

    const $result = $(element)
    // Anzeigen (result--ad) sind keine organischen Treffer.
    if ($result.hasClass('result--ad')) return

    const $link = $result.find('.result__a').first()
    if ($link.length === 0) return

    const url = resolveDuckDuckGoUrl($link.attr('href'))
    if (!url || seenUrls.has(url)) return

    seenUrls.add(url)
    results.push(
      toResult(
        {
          title: cleanText($link.text()),
          url,
          snippet: cleanText($result.find('.result__snippet').first().text()),
        },
      ),
    )
  })

  return results
}

/** Loest Yahoos Redirect-Links (/RU=<ziel>/RK=...) auf. */
function resolveYahooUrl(href) {
  if (!href) return ''

  const match = href.match(/\/RU=([^/]+)/)
  let candidate = href
  if (match) {
    try {
      candidate = decodeURIComponent(match[1])
    } catch {
      candidate = href
    }
  }

  return isHttpUrl(candidate) ? candidate : ''
}

/**
 * Loest Bings Redirect-Links (bing.com/ck/a?...&u=a1<base64url>) auf.
 * Der Parameter `u` enthaelt das Ziel als base64url-kodierte URL.
 */
function resolveBingUrl(href) {
  if (!href) return ''

  const candidate = href.startsWith('//') ? `https:${href}` : href

  try {
    const parsed = new URL(candidate, 'https://www.bing.com')
    const encoded = parsed.searchParams.get('u')

    if (encoded?.startsWith('a1')) {
      const base64 = encoded
        .slice(2)
        .replace(/-/g, '+')
        .replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      const decoded = Buffer.from(padded, 'base64').toString('utf8')
      if (isHttpUrl(decoded)) return decoded
    }

    // Unaufgeloeste Bing-Weiterleitungen sind keine brauchbaren Treffer.
    if (parsed.hostname === 'www.bing.com' && parsed.pathname.startsWith('/ck/a')) return ''

    return isHttpUrl(parsed.toString()) ? parsed.toString() : ''
  } catch {
    return ''
  }
}

/** Yahoo-Scraper als schluesselfreier Ersatz, wenn DuckDuckGo blockiert. */
async function yahooSearch(query, fileType, maxResults) {
  const searchQuery = withFileType(query, fileType)

  let response
  const startIndex = yahooHostIndex
  for (let offset = 0; offset < YAHOO_SEARCH_HOSTS.length; offset += 1) {
    const hostIndex = (startIndex + offset) % YAHOO_SEARCH_HOSTS.length
    const host = YAHOO_SEARCH_HOSTS[hostIndex]
    const url = `https://${host}/search?p=${encodeURIComponent(searchQuery)}&vl=lang_de`

    try {
      // Ein Versuch pro Host: bei HTTP 500 ist meist der Host das Problem,
      // ein anderer Host liefert dagegen sofort Ergebnisse.
      const candidate = await fetchHtml(url, 1)
      if (candidate.status < 400) {
        response = candidate
        yahooHostIndex = hostIndex
        break
      }
    } catch {
      // Naechsten Host versuchen.
    }
  }

  if (!response) {
    throw new WebSearchError('Yahoo ist nicht erreichbar.', 503, 'web_search_unavailable')
  }

  const $ = cheerio.load(String(response.data ?? ''))
  const results = []
  const seenUrls = new Set()

  $('div.algo').each((_, element) => {
    if (results.length >= maxResults) return false

    const $result = $(element)
    const $link = $result.find('div.compTitle a').first()
    if ($link.length === 0) return

    const url = resolveYahooUrl($link.attr('href'))
    if (!url || seenUrls.has(url)) return

    // Yahoo liefert je nach Host zwei Layouts: Der Titel steht entweder im
    // aria-label des Links bzw. in einem eigenen Titel-Span, waehrend der
    // Breadcrumb (z. B. "www.zebis.ch · sites · default") in einem
    // verschachtelten Span steckt. Beides wird hier getrennt.
    const $title = $result.find('h3').first()
    const $cleanTitle = $title.clone()
    $cleanTitle.find('.p-crumb').parent().remove()
    const title = cleanText(
      $link.attr('aria-label') ||
        $title.find('span.d-b.fz-20').first().text() ||
        $cleanTitle.text() ||
        $link.text(),
    )

    seenUrls.add(url)
    results.push(
      toResult(
        {
          title,
          url,
          snippet: cleanText($result.find('div.compText').first().text()),
        },
      ),
    )
  })

  return results
}

/** Bing-Scraper als weiterer schluesselfreier Ersatz. */
async function bingSearch(query, fileType, maxResults) {
  const searchQuery = withFileType(query, fileType)
  const url = `${BING_SEARCH_URL}?q=${encodeURIComponent(searchQuery)}&setlang=de`

  let response
  try {
    response = await fetchHtml(url)
  } catch {
    throw new WebSearchError('Bing ist nicht erreichbar.', 503, 'web_search_unavailable')
  }

  if (response.status >= 400) {
    throw new WebSearchError(`Bing antwortete mit ${response.status}.`, 503, 'web_search_unavailable')
  }

  const $ = cheerio.load(String(response.data ?? ''))
  const results = []
  const seenUrls = new Set()

  $('li.b_algo').each((_, element) => {
    if (results.length >= maxResults) return false

    const $result = $(element)
    const $link = $result.find('h2 a').first()
    if ($link.length === 0) return

    const url = resolveBingUrl($link.attr('href'))
    if (!url || seenUrls.has(url)) return

    seenUrls.add(url)
    results.push(
      toResult(
        {
          title: cleanText($link.text()),
          url,
          snippet: cleanText(
            $result.find('.b_caption p, p.b_algoSlug, .b_snippet').first().text(),
          ),
        },
      ),
    )
  })

  return results
}

/**
 * Fuehrt eine Websuche nach Arbeitsblaettern durch.
 * @param {string} query Suchbegriff (kann Operatoren wie filetype:, intitle:, "..." enthalten)
 * @param {string} [fileType] optionaler Dateityp-Filter (pdf, docx, ...)
 * @returns {Promise<Array<{title: string, url: string, snippet: string, source: string, fileType: string|null, mocked: boolean}>>}
 */
export async function searchWeb(query, fileType) {
  if (typeof query !== 'string' || query.trim() === '') {
    throw new WebSearchError('Suchbegriff ist erforderlich und darf nicht leer sein.', 400, 'validation_error')
  }

  const normalizedQuery = query.trim()
  const normalizedFileType = typeof fileType === 'string' ? fileType.trim().toLowerCase() : ''
  if (normalizedFileType && !ALLOWED_FILE_TYPES.has(normalizedFileType)) {
    throw new WebSearchError('Dieser Dateityp wird nicht unterstuetzt.', 400, 'validation_error')
  }

  const maxResults = config.webSearch.maxResults

  if (config.webSearch.provider === 'mock') {
    return mockResults(normalizedQuery, normalizedFileType, maxResults)
  }

  const engines = [duckduckgoSearch, yahooSearch, bingSearch]
  for (const engine of engines) {
    try {
      const results = await engine(normalizedQuery, normalizedFileType, maxResults)
      const documents = results.filter((result) => isDocumentResult(result, normalizedFileType))

      if (documents.length > 0) {
        if (engine !== engines[0]) {
          console.warn(`[web-search] Fallback über ${engine.name}: ${documents.length} Dokumente`)
        }
        return documents
      }

      if (results.length > 0) {
        console.warn(`[web-search] ${engine.name}: ${results.length} Treffer, aber keine Dokumente`)
      }
    } catch (error) {
      // Validierungsfehler immer durchreichen, Suchfehler beim naechsten Anbieter versuchen.
      if (error instanceof WebSearchError && error.status === 400) throw error
      console.warn(`[web-search] ${engine.name} nicht verfügbar: ${error?.message || error}`)
    }
  }

  console.warn('[web-search] Keine echte Dokumentquelle erreichbar – liefere simulierte Treffer.')
  return mockResults(normalizedQuery, normalizedFileType, maxResults)
}
