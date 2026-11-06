import { ALLE_BERUFSBILDER, LEVELS, LEVEL_STYLES } from '@/data/constants'
import {
  ApiError,
  fetchArbeitsblaetter,
  type ArbeitsblattFilter,
  type GespeichertesArbeitsblatt,
  type VerlaufEintrag,
} from '@/lib/api'
import { todayIso } from '@/lib/date'
import type { WorksheetFilter } from '@/lib/worksheetFilter'
import type { HistoryEntry, Level, NiveauRow, Worksheet } from '@/types'

/**
 * Bridge between the backend's saved worksheets
 * (GET /api/arbeitsblaetter) and the worksheets page.
 *
 * The page displays cards of type `Worksheet`. A saved sheet has exactly
 * one proficiency level; the competency description of the level comes from
 * LEVEL_STYLES because the backend list does not deliver the content.
 *
 * The search term (`search`) is passed as `q` to the backend's online search
 * (GET /api/arbeitsblaetter?q=...) and executed there via LIKE over title,
 * learning objective, training module and occupational field – it is no longer
 * filtered locally only in the browser.
 */

/** At most this many pages à 100 entries are loaded (protection against infinite loops) */
const MAX_PAGES = 20
const PER_PAGE = 100

/** Mapping of the page filter to the query parameters of the backend endpoint */
export function pageFilterToBackendFilter(filter: Pick<
  WorksheetFilter,
  'berufsbild' | 'baustein' | 'ausbildungsbaustein' | 'niveau' | 'sprache' | 'format'
>): ArbeitsblattFilter {
  const backend: ArbeitsblattFilter = {}
  if (filter.berufsbild && filter.berufsbild !== ALLE_BERUFSBILDER) backend.berufsfeld = filter.berufsbild
  if (filter.baustein !== 'Alle') backend.baustein = filter.baustein
  if (filter.ausbildungsbaustein && filter.ausbildungsbaustein !== 'Alle' && filter.ausbildungsbaustein !== ALLE_BERUFSBILDER)
    backend.ausbildungsbaustein = filter.ausbildungsbaustein
  if (filter.niveau !== 'Alle') backend.stufe = [filter.niveau]
  if (filter.sprache !== 'Alle') backend.sprache = [filter.sprache]
  if (filter.format !== 'Alle') backend.format = [filter.format]
  return backend
}

/**
 * Loads all non-archived worksheets, newest first.
 * @param search Search term passed as `q` to the backend's online search.
 * Empty = all worksheets.
 */
export async function loadSavedWorksheets(
  search = '',
  filter: Pick<
    WorksheetFilter,
    'berufsbild' | 'baustein' | 'ausbildungsbaustein' | 'niveau' | 'sprache' | 'format'
  > = {
    berufsbild: ALLE_BERUFSBILDER,
    baustein: 'Alle',
    ausbildungsbaustein: ALLE_BERUFSBILDER,
    niveau: 'Alle',
    sprache: 'Alle',
    format: 'Alle',
  },
): Promise<GespeichertesArbeitsblatt[]> {
  const entries: GespeichertesArbeitsblatt[] = []
  const backendFilter = pageFilterToBackendFilter(filter)
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetchArbeitsblaetter({
      ...backendFilter,
      q: search.trim() || undefined,
      seite: page,
      proSeite: PER_PAGE,
      sortierung: 'neueste',
    })
    if (!response || !Array.isArray(response.eintraege)) {
      throw new ApiError('The backend sent an unexpected response.', 0, 'invalid_response')
    }
    entries.push(...response.eintraege)
    if (page >= response.seiten) break
  }
  return entries
}

const LEERE_ZEILE: NiveauRow = { kompetenz: '', beispiel: '' }

/** A saved sheet as a card of the worksheets page; `nummer` is the display ID */
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
    backend: { id: blatt.id, status: blatt.status, version: blatt.version, favorit: blatt.favorit, geaendertAm: blatt.geaendertAm },
  }
}

/** Backend history in the format of the history display */
export function historyAusVerlauf(eintraege: VerlaufEintrag[]): HistoryEntry[] {
  return eintraege.map((e) => ({
    version: e.version,
    date: todayIso(new Date(e.erstelltAm)),
    time: uhrzeit(new Date(e.erstelltAm)),
    author: e.autor ?? 'unbekannt',
    action: e.aktion,
    note: e.notiz ?? '',
  }))
}

/** Local time of day as "HH:MM" */
function uhrzeit(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Readable error message for the page */
export function fehlertext(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Unknown error while loading.'
}
