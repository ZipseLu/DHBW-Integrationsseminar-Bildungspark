/**
 * Web-Suche nach Arbeitsblättern im Internet.
 *
 * Unterstuetzt drei Provider:
 *  - 'mock'   (Standard, kein API-Key noetig): liefert simulierte, aber
 *              strukturell echte Treffer. Dafuer dafuer dafuer gedacht,
 *              ohne Kosten und ohne Key entwickeln/testen zu koennen.
 *  - 'serpapi': ruft die SerpApi (https://serpapi.com/search.json) auf.
 *              Benötigt WEB_SEARCH_API_KEY.
 *  - 'google': ruft die Google Custom Search JSON API auf.
 *              Benötigt WEB_SEARCH_API_KEY und WEB_SEARCH_ENGINE_ID.
 *
 * Suchoperatoren (ähnlich Google-Hacks) werden vom Client vorgefiltert
 * und als `q` an die API übergeben:
 *   filetype:pdf | docx   -> schränkt auf Dateityp ein
 *   intitle:              -> durchsucht nur den Titel
 *   "exakte phrase"       -> erzwingt genaue Wortgruppe
 *
 * Ohne erreichbare API wirft der Service einen Fehler, den die Route
 * als 503 `web_search_unavailable` zurückgibt.
 */

import { config } from '../config.js'

const WEB_RESULT_SCHEMA = {
  title: 'string',
  url: 'string',
  snippet: 'string',
  source: 'string',
  fileType: 'string | null',
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
  const match = url.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/)
  return match ? match[1].toLowerCase() : null
}

/** Mock-Ergebnisse ohne API-Key (strukturell wie echte Treffer) */
function mockResults(query, maxResults) {
  const q = query.trim()
  const slug = encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))
  const sources = [
    { name: 'lehrer-online.de', pattern: 'Arbeitsblatt: {q} – Aufgaben & Lösungen (PDF)', snippet: 'Direkt downloadbares Arbeitsblatt zu "{q}" mit Aufgaben auf verschiedenen Niveaustufen inkl. Lösungsblatt. Kostenlos, als PDF und Word verfügbar.' },
    { name: '4teachers.de', pattern: '{q} – Differenziertes Arbeitsblatt (Word, kostenlos)', snippet: 'Differenziertes Arbeitsblatt zu "{q}" in drei Schwierigkeitsstufen. Als bearbeitbares Word-Dokument direkt herunterladbar und anpassbar.' },
    { name: 'ihk-bildungshaus.de', pattern: 'IHK: Lernaufgabe "{q}" für Ausbildungsbetriebe', snippet: 'Offizielle IHK-Lernaufgabe zu "{q}" – geeignet für die betriebliche Ausbildung, mit Kompetenzraster und Bewertungsbogen.' },
    { name: 'bibb.de', pattern: 'BIBB: Ausbildungsmaterial "{q}" (offizielle Quelle)', snippet: 'Bundesinstitut für Berufsbildung (BIBB): Offizielles Ausbildungsmaterial zu "{q}" mit Lernzielen, Kompetenzbeschreibungen und praxisorientierten Aufgaben.' },
  ]

  const results = sources.map((s, i) => ({
    title: s.pattern.replace('{q}', q),
    url: `www.${s.name}/material/${slug}/arbeitsblatt-${i + 1}.pdf`,
    snippet: s.snippet.replace('{q}', q),
    source: s.name,
    fileType: 'pdf',
  }))

  return results.slice(0, maxResults)
}

/** SerpApi JSON-Aufruf */
async function serpapiSearch(query, apiKey, maxResults) {
  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    engine: 'google',
    num: String(Math.min(maxResults, 20)),
    hl: 'de',
    gl: 'de',
  })

  const response = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(config.ai.timeoutMs),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new WebSearchError(`SerpApi antwortete mit ${response.status}: ${body}`, 503, 'web_search_unavailable')
  }

  const data = await response.json()
  const results = (data.organic_results ?? []).slice(0, maxResults).map((r) => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
    source: r.source ?? new URL(r.link ?? 'https://example.com').hostname,
    fileType: extractFileType(r.link ?? ''),
  }))

  return results
}

/** Google Custom Search JSON API */
async function googleSearch(query, apiKey, engineId, maxResults) {
  const params = new URLSearchParams({
    q: query,
    key: apiKey,
    cx: engineId,
    num: String(Math.min(maxResults, 10)),
  })

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    signal: AbortSignal.timeout(config.ai.timeoutMs),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new WebSearchError(`Google Custom Search antwortete mit ${response.status}: ${body}`, 503, 'web_search_unavailable')
  }

  const data = await response.json()
  const results = (data.items ?? []).slice(0, maxResults).map((r) => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
    source: r.displayLink ?? new URL(r.link ?? 'https://example.com').hostname,
    fileType: extractFileType(r.link ?? ''),
  }))

  return results
}

/**
 * Führt eine Websuche nach Arbeitsblättern durch.
 * @param {string} query Suchbegriff (kann Operatoren wie filetype:, intitle:, "..." enthalten)
 * @returns {Promise<Array<{title,url,snippet,source,fileType}>>}
 */
export async function searchWeb(query) {
  const maxResults = config.webSearch.maxResults
  const provider = config.webSearch.provider

  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new WebSearchError('Suchbegriff ist erforderlich und darf nicht leer sein.', 400, 'validation_error')
  }

  switch (provider) {
    case 'mock':
      return mockResults(query.trim(), maxResults)

    case 'serpapi':
      if (!config.webSearch.apiKey) {
        throw new WebSearchError('WEB_SEARCH_API_KEY ist nicht gesetzt. Suche läuft im Mock-Modus. Setze WEB_SEARCH_PROVIDER=mock oder trage einen Key ein.', 503, 'web_search_unavailable')
      }
      return serpapiSearch(query.trim(), config.webSearch.apiKey, maxResults)

    case 'google':
      if (!config.webSearch.apiKey || !config.webSearch.engineId) {
        throw new WebSearchError('WEB_SEARCH_API_KEY und WEB_SEARCH_ENGINE_ID müssen gesetzt sein für provider=google.', 503, 'web_search_unavailable')
      }
      return googleSearch(query.trim(), config.webSearch.apiKey, config.webSearch.engineId, maxResults)

    default:
      throw new WebSearchError(`Unbekannter Web-Search-Provider: ${provider}`, 500, 'internal_error')
  }
}
