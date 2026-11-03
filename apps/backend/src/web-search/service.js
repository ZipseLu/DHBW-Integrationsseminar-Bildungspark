/**
 * Web-Suche nach Arbeitsblättern im Internet.
 *
 * Zwei Modi:
 *  - 'scrape' (Standard): ruft DuckDuckGo HTML (https://html.duckduckgo.com/html/?q=...)
 *    auf und parset die Treffer. Kein API-Key, kein Cloud-Konto nötig.
 *  - 'mock': liefert simulierte Platzhalter (für Entwicklung ohne Internet).
 *
 * Suchoperatoren werden als Teil des `q`-Parameters an DuckDuckGo übergeben:
 *   filetype:pdf | docx   -> schränkt auf Dateityp ein
 *   intitle:              -> durchsucht nur den Titel
 *   "exakte phrase"       -> erzwingt genaue Wortgruppe
 *
 * Wenn das Scraping fehlschlägt (z. B. blockiert), fallen wir auf Mock-Treffer zurück,
 * damit die Oberfläche funktionsfähig bleibt.
 */

import { config } from '../config.js'

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

/** Mock-Ergebnisse ohne Internet (strukturell wie echte Treffer, aber simuliert) */
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
    mocked: true,
  }))

  return results.slice(0, maxResults)
}

/** DuckDuckGo HTML-Scraper – keine API, kein Key */
async function duckduckgoSearch(query, maxResults) {
  const url = 'https://html.duckduckgo.com/html/?' + new URLSearchParams({ q: query })

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(config.ai.timeoutMs),
  })

  if (!response.ok) {
    throw new WebSearchError(`DuckDuckGo antwortete mit ${response.status}`, 503, 'web_search_unavailable')
  }

  const html = await response.text()

  const results = []
  // DuckDuckGo HTML: Ergebnisse stehen in <div class="result"> ... </div>
  const resultBlocks = html.match(/<div class="result results_links.*?<\/div>\s*<\/div>/gs) ?? []

  for (const block of resultBlocks.slice(0, maxResults)) {
    const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/s)
    const snippetMatch = block.match(/class="result__snippet"[^>]*>(.*?)<\/div>/s)

    if (!titleMatch) continue

    let url = titleMatch[1]
    // DuckDuckGo leitet über redirect-Links: https://duckduckgo.com/l/?uddg=...
    const uddgMatch = url.match(/uddg=([^&]+)/)
    if (uddgMatch) {
      try {
        url = decodeURIComponent(uddgMatch[1])
      } catch {
        // falls dekodierung fehlschlägt, original lassen
      }
    }

    let title = titleMatch[2]
    title = title.replace(/<[^>]*>/g, '').trim() // HTML-Tags entfernen

    let snippet = ''
    if (snippetMatch) {
      snippet = snippetMatch[1].replace(/<[^>]*>/g, '').trim()
    }

    results.push({
      title: title || '(ohne Titel)',
      url: url || '',
      snippet: snippet || '',
      source: new URL(url || 'https://example.com').hostname,
      fileType: extractFileType(url),
      mocked: false,
    })
  }

  return results
}

/**
 * Führt eine Websuche nach Arbeitsblättern durch.
 * @param {string} query Suchbegriff (kann Operatoren wie filetype:, intitle:, "..." enthalten)
 * @returns {Promise<Array<{title,url,snippet,source,fileType,mocked}>>}
 */
export async function searchWeb(query) {
  const maxResults = config.webSearch.maxResults
  const provider = config.webSearch.provider

  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new WebSearchError('Suchbegriff ist erforderlich und darf nicht leer sein.', 400, 'validation_error')
  }

  try {
    if (provider === 'mock') {
      return mockResults(query.trim(), maxResults)
    }

    // 'scrape' oder unbekannt: DuckDuckGo-Scraper versuchen
    const scraped = await duckduckgoSearch(query.trim(), maxResults)

    if (scraped.length === 0) {
      // Keine Treffer vom Scraper -> auf Mock fallen
      return mockResults(query.trim(), maxResults).map((r) => ({ ...r, mocked: true }))
    }

    return scraped
  } catch (error) {
    // Scraping fehlgeschlagen (netzwerk, blockiert, ...) -> Mock als Fallback
    if (error instanceof WebSearchError && error.status === 400) {
      throw error
    }
    return mockResults(query.trim(), maxResults).map((r) => ({ ...r, mocked: true }))
  }
}
