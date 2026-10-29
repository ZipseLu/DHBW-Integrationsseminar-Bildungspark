import { LEVELS, LEVEL_STYLES } from '@/data/constants'
import { ApiError, fetchArbeitsblaetter, type GespeichertesArbeitsblatt, type VerlaufEintrag } from '@/lib/api'
import { todayIso } from '@/lib/date'
import type { HistoryEntry, Level, NiveauRow, Worksheet } from '@/types'

/**
 * Brücke zwischen den gespeicherten Arbeitsblättern des Backends
 * (GET /api/arbeitsblaetter) und der Arbeitsblätter-Seite.
 *
 * Die Seite zeigt Karten vom Typ `Worksheet`. Ein gespeichertes Blatt hat genau
 * eine Niveaustufe; die Kompetenzbeschreibung der Stufe kommt aus LEVEL_STYLES,
 * weil die Liste des Backends keinen Inhalt mitliefert.
 */

/** Höchstens so viele Seiten à 100 Einträge werden geladen (Schutz vor Endlosschleifen) */
const MAX_SEITEN = 20
const PRO_SEITE = 100

/** Lädt alle nicht archivierten Blätter, neueste zuerst */
export async function ladeGespeicherteArbeitsblaetter(): Promise<GespeichertesArbeitsblatt[]> {
  const alle: GespeichertesArbeitsblatt[] = []
  for (let seite = 1; seite <= MAX_SEITEN; seite++) {
    const antwort = await fetchArbeitsblaetter({ seite, proSeite: PRO_SEITE, sortierung: 'neueste' })
    if (!antwort || !Array.isArray(antwort.eintraege)) {
      throw new ApiError('Das Backend hat eine unerwartete Antwort geschickt.', 0, 'invalid_response')
    }
    alle.push(...antwort.eintraege)
    if (seite >= antwort.seiten) break
  }
  return alle
}

const LEERE_ZEILE: NiveauRow = { kompetenz: '', beispiel: '' }

/** Ein gespeichertes Blatt als Karte der Arbeitsblätter-Seite; `nummer` ist die Anzeige-ID */
export function worksheetAusGespeichertem(blatt: GespeichertesArbeitsblatt, nummer: number): Worksheet {
  const niveaus = Object.fromEntries(LEVELS.map((l) => [l, LEERE_ZEILE])) as Record<Level, NiveauRow>
  niveaus[blatt.stufe] = { kompetenz: LEVEL_STYLES[blatt.stufe].beschreibung, beispiel: '' }

  return {
    id: nummer,
    title: blatt.titel,
    berufsbild: blatt.berufsfeld,
    baustein: blatt.baustein ?? 0,
    ausbildungsbaustein: blatt.ausbildungsbaustein ?? '',
    abschnitt: { titel: blatt.lernziel, niveaus },
    createdBy: blatt.erstelltVon ?? 'unbekannt',
    date: todayIso(new Date(blatt.geaendertAm)),
    aiGenerated: blatt.kiGeneriert,
    participants: 0,
    format: blatt.format,
    sprache: blatt.sprache,
    niveaus: [blatt.stufe],
    backend: { id: blatt.id, status: blatt.status, version: blatt.version, favorit: blatt.favorit },
  }
}

/** Verlauf des Backends im Format der Verlaufsanzeige */
export function historyAusVerlauf(eintraege: VerlaufEintrag[]): HistoryEntry[] {
  return eintraege.map((e) => ({
    version: e.version,
    date: todayIso(new Date(e.erstelltAm)),
    author: e.autor ?? 'unbekannt',
    action: e.aktion,
    note: e.notiz ?? '',
  }))
}

/** Lesbare Fehlermeldung für die Seite */
export function fehlertext(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Unbekannter Fehler beim Laden.'
}
