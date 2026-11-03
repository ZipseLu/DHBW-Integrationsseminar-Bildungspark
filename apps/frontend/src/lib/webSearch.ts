import type { WebResult } from '@/types'
import { apiFetch, ApiError } from '@/lib/api'

/**
 * Websuche nach Arbeitsblättern über das Backend (GET /api/web-search?q=...).
 *
 * Das Backend führt die Suche im Internet durch (SerpApi oder Google Custom Search,
 * je nach WEB_SEARCH_PROVIDER) oder läuft im Mock-Modus ohne API-Key.
 *
 * Wenn das Backend nicht erreichbar ist oder die Suche nicht konfiguriert ist,
 * werden lokale simulierte Treffer zurückgegeben, damit die Oberfläche
 * funktionsfähig bleibt.
 */

const MOCK_SOURCES = [
  { name: 'lehrer-online.de', pattern: 'Arbeitsblatt: {q} – Aufgaben & Lösungen (PDF)', snippet: 'Direkt downloadbares Arbeitsblatt zu "{q}" mit Aufgaben auf verschiedenen Niveaustufen inkl. Lösungsblatt. Kostenlos, als PDF und Word verfügbar.' },
  { name: '4teachers.de', pattern: '{q} – Differenziertes Arbeitsblatt (Word, kostenlos)', snippet: 'Differenziertes Arbeitsblatt zu "{q}" in drei Schwierigkeitsstufen. Als bearbeitbares Word-Dokument direkt herunterladbar und anpassbar.' },
  { name: 'ihk-bildungshaus.de', pattern: 'IHK: Lernaufgabe "{q}" für Ausbildungsbetriebe', snippet: 'Offizielle IHK-Lernaufgabe zu "{q}" – geeignet für die betriebliche Ausbildung, mit Kompetenzraster und Bewertungsbogen.' },
  { name: 'bibb.de', pattern: 'BIBB: Ausbildungsmaterial "{q}" (offizielle Quelle)', snippet: 'Bundesinstitut für Berufsbildung (BIBB): Offizielles Ausbildungsmaterial zu "{q}" mit Lernzielen, Kompetenzbeschreibungen und praxisorientierten Aufgaben.' },
]

function localMockResults(query: string): WebResult[] {
  const q = query.trim()
  const slug = encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))
  return MOCK_SOURCES.map((s, i) => ({
    title: s.pattern.replace('{q}', q),
    url: `www.${s.name}/material/${slug}/arbeitsblatt-${i + 1}.pdf`,
    snippet: s.snippet.replace('{q}', q),
    source: s.name,
    mocked: true,
  }))
}

/**
 * Sucht im Web nach Arbeitsblättern. Nutzt das Backend; bei nicht erreichbarem
 * Backend oder nicht konfigurierter Suche werden lokale simulierte Treffer
 * zurückgegeben.
 */
export async function searchWebResults(query: string): Promise<WebResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  try {
    const response = await apiFetch(`/api/web-search?q=${encodeURIComponent(trimmed)}`)
    const body = (await response.json()) as { results?: WebResult[]; count?: number }
    return Array.isArray(body.results) ? body.results : []
  } catch (error) {
    // Backend nicht erreichbar oder Suche nicht konfiguriert (503) ->
    // lokale simulierte Treffer, damit die Oberfläche funktioniert.
    if (error instanceof ApiError && (error.status === 0 || error.status === 503)) {
      return localMockResults(trimmed)
    }
    throw error
  }
}
