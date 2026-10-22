import type { WebResult } from '@/types'

/**
 * Simulierte Internetsuche fuer den Prototyp.
 * Die Treffer sind Platzhalter und verlinken auf nicht existierende Seiten.
 */
export function simulateWebResults(query: string): WebResult[] {
  const q = query.trim()
  const slug = encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))

  return [
    {
      title: `Arbeitsblatt: ${q} – Aufgaben & Lösungen (PDF)`,
      url: `www.lehrer-online.de/unterricht/berufsbildung/materialien/${slug}/arbeitsblatt.pdf`,
      snippet: `Direkt downloadbares Arbeitsblatt zu „${q}" mit Aufgaben auf verschiedenen Niveaustufen inkl. Lösungsblatt. Kostenlos, als PDF und Word verfügbar.`,
      source: 'lehrer-online.de',
    },
    {
      title: `${q} – Differenziertes Arbeitsblatt (Word, kostenlos)`,
      url: `www.4teachers.de/material/download/${slug}-arbeitsblatt-differenziert.docx`,
      snippet: `Differenziertes Arbeitsblatt zu „${q}" in drei Schwierigkeitsstufen. Als bearbeitbares Word-Dokument direkt herunterladbar und anpassbar.`,
      source: '4teachers.de',
    },
    {
      title: `IHK: Lernaufgabe „${q}" für Ausbildungsbetriebe`,
      url: `www.ihk-bildungshaus.de/ausbildung/lernmaterialien/${slug}/lernaufgabe.pdf`,
      snippet: `Offizielle IHK-Lernaufgabe zu „${q}" – geeignet für die betriebliche Ausbildung, mit Kompetenzraster und Bewertungsbogen.`,
      source: 'ihk-bildungshaus.de',
    },
    {
      title: `${q}: Unterrichtseinheit mit Arbeitsblättern (ZIP)`,
      url: `www.berufsbildung-online.de/downloads/unterrichtseinheiten/${slug}.zip`,
      snippet: `Komplette Unterrichtseinheit zu „${q}" als ZIP-Paket: Arbeitsblätter, Präsentation, Lehrerhandreichung und Bewertungsbögen in einem Download.`,
      source: 'berufsbildung-online.de',
    },
    {
      title: `BIBB: Ausbildungsmaterial „${q}" (offizielle Quelle)`,
      url: `www.bibb.de/de/berufsbildung/material/${slug}/arbeitsblatt-ausbildung.pdf`,
      snippet: `Bundesinstitut für Berufsbildung (BIBB): Offizielles Ausbildungsmaterial zu „${q}" mit Lernzielen, Kompetenzbeschreibungen und praxisorientierten Aufgaben.`,
      source: 'bibb.de',
    },
  ]
}
