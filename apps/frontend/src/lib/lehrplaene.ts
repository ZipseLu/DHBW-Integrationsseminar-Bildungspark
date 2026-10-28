import { BERUFSBILDER, BERUFSBILD_GASTRO, BERUFSBILD_LAGER, BERUFSBILD_METALL } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import { lernzielFromWorksheet, type LehrplanLernziel, type LernzielInput } from '@/lib/api'

/** Ein Lehrplan-Dokument (eine DOCX-Datei des Bildungsparks) mit seinen Lernzielen */
export type LehrplanDokument = {
  id: string
  berufsfeld: string
  /** Teilqualifizierung, z. B. "Fachlagerist (IHK)" */
  tq: string
  baustein: number
  ausbildungsbaustein: string
  /** Abschnittsnummer, wenn der Baustein auf mehrere Dateien verteilt ist (TQ Metall) */
  abschnitt: number | null
  lernziele: LernzielInput[]
}

/** Bezeichnung der Teilqualifizierung je Berufsfeld (laut Kopfzeile der Lehrpläne) */
export const TQ_LABELS: Record<string, string> = {
  [BERUFSBILD_LAGER]: 'Fachlagerist (IHK)',
  [BERUFSBILD_GASTRO]: 'Ausbildungsberufe im Gastrobereich',
  [BERUFSBILD_METALL]: 'Industriemechanik · Feinwerkmechanik · Maschinen- und Anlagenführung (HWK)',
}

/** Farbe und Kennbuchstabe der Lehrplan-Karten je Berufsfeld (aus dem Figma-Mockup) */
export const FIELD_STYLES: Record<string, { color: string; bg: string; mark: string }> = {
  [BERUFSBILD_LAGER]: { color: '#1A5C32', bg: '#E4F1E7', mark: 'L' },
  [BERUFSBILD_METALL]: { color: '#1A3A5C', bg: '#E2ECF5', mark: 'M' },
  [BERUFSBILD_GASTRO]: { color: '#7A2E00', bg: '#F8E8DD', mark: 'G' },
}

const FALLBACK_STYLE = { color: '#6B6354', bg: '#EBE5D6', mark: '?' }

export function fieldStyle(berufsfeld: string) {
  return FIELD_STYLES[berufsfeld] ?? FALLBACK_STYLE
}

/** Beispiel-Lernziele aus den lokalen Daten, wenn das Backend keine Lehrpläne liefert */
export function beispielLernziele(): (LernzielInput & { abschnitt: number | null; quelle?: string })[] {
  return WORKSHEETS.map((w) => ({ ...lernzielFromWorksheet(w), abschnitt: null }))
}

/**
 * Fasst Lernziele zu Lehrplan-Dokumenten zusammen.
 * Mit Import: eine Karte je Quelldatei. Ohne Import: je Berufsfeld, Baustein und Ausbildungsbaustein.
 * Sortierung: Berufsfelder wie in BERUFSBILDER, dann Baustein, dann Abschnitt.
 */
export function groupLehrplaene(lernziele: readonly (LernzielInput & Partial<Pick<LehrplanLernziel, 'abschnitt' | 'tq' | 'quelle'>>)[]): LehrplanDokument[] {
  const docs = new Map<string, LehrplanDokument>()

  for (const ziel of lernziele) {
    const key = ziel.quelle ?? `${ziel.berufsfeld}|${ziel.baustein}|${ziel.ausbildungsbaustein}`
    let doc = docs.get(key)
    if (!doc) {
      doc = {
        id: key,
        berufsfeld: ziel.berufsfeld,
        tq: TQ_LABELS[ziel.berufsfeld] ?? ziel.tq ?? '',
        baustein: ziel.baustein,
        ausbildungsbaustein: ziel.ausbildungsbaustein,
        abschnitt: ziel.quelle ? (ziel.abschnitt ?? null) : null,
        lernziele: [],
      }
      docs.set(key, doc)
    }
    const { berufsfeld, baustein, ausbildungsbaustein, titel, niveaus } = ziel
    doc.lernziele.push({ berufsfeld, baustein, ausbildungsbaustein, titel, niveaus })
  }

  const order = (field: string) => {
    const index = BERUFSBILDER.indexOf(field)
    return index === -1 ? BERUFSBILDER.length : index
  }

  return [...docs.values()].sort(
    (a, b) => order(a.berufsfeld) - order(b.berufsfeld) || a.baustein - b.baustein || (a.abschnitt ?? 0) - (b.abschnitt ?? 0),
  )
}

export function filterLehrplaene(docs: readonly LehrplanDokument[], berufsfeld: string | null, search: string): LehrplanDokument[] {
  const query = search.trim().toLowerCase()
  return docs.filter((doc) => {
    if (berufsfeld && doc.berufsfeld !== berufsfeld) return false
    if (!query) return true
    return [doc.berufsfeld, doc.tq, doc.ausbildungsbaustein, ...doc.lernziele.map((l) => l.titel)].some((value) => value.toLowerCase().includes(query))
  })
}

/** "Baustein 2 · Abschnitt 3" bzw. "Baustein 1" */
export function bausteinLabel(doc: LehrplanDokument): string {
  return doc.abschnitt ? `Baustein ${doc.baustein} · Abschnitt ${doc.abschnitt}` : `Baustein ${doc.baustein}`
}

/** Was die KI-Erstellung beim Wechsel aus den Lehrplänen vorauswählt */
export type KiVorauswahl = { berufsfeld: string; baustein: number; titel: string }

export function vorauswahlFor(doc: LehrplanDokument, ziel: LernzielInput = doc.lernziele[0]): KiVorauswahl {
  return { berufsfeld: doc.berufsfeld, baustein: doc.baustein, titel: ziel?.titel ?? '' }
}
