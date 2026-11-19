import type { Lernstand } from '@/lib/api'
import type { BerufStation, Format, Level, Participant, Worksheet } from '@/types'

/** Arbeitsblaetter, die zu einem Berufsfeld gehoeren (Reihenfolge = Lernreihenfolge) */
export function worksheetsFor(worksheets: readonly Worksheet[], berufsbild: string): Worksheet[] {
  return worksheets.filter((w) => w.berufsbild === berufsbild)
}

/** Erledigte Arbeitsblaetter einer Station, begrenzt auf die vorhandenen Arbeitsblaetter */
export function doneCount(station: BerufStation, worksheets: readonly Worksheet[]): number {
  const total = worksheetsFor(worksheets, station.berufsbild).length
  return station.status === 'abgeschlossen' ? total : Math.min(station.worksheetsDone, total)
}

/** FE-30: progress of one station in the learning path, the same numbers everywhere */
export type StationsStand = {
  erledigt: number
  /** null with sample data (the sample worksheets have no fixed total per person) */
  gesamt: number | null
  /** percent for the progress bar */
  fortschritt: number
  blaetter: { key: string; titel: string; baustein: number | null; erledigt: boolean }[]
}

/**
 * With participants from the backend (`lernstand` given, null = nothing assigned yet) the
 * numbers come from the learning progress (BE-04); a closed station counts as 100 %.
 * Without the backend the prototype keeps the sample worksheets and the stored progress.
 */
export function stationsStand(station: BerufStation, lernstand: Lernstand | null | undefined, worksheets: readonly Worksheet[]): StationsStand {
  if (lernstand !== undefined) {
    const feld = lernstand?.berufsfelder.find((b) => b.berufsfeld === station.berufsbild)
    const erledigt = [...(feld?.erledigt ?? [])].reverse()
    // Worksheets done before assignments existed are only stored as a number on the station
    if (!feld?.anzahl.gesamt && station.worksheetsDone > 0) {
      return {
        erledigt: station.worksheetsDone,
        gesamt: null,
        fortschritt: station.status === 'abgeschlossen' ? 100 : station.progress,
        blaetter: [],
      }
    }
    return {
      erledigt: feld?.anzahl.erledigt ?? 0,
      gesamt: feld?.anzahl.gesamt ?? 0,
      fortschritt: station.status === 'abgeschlossen' ? 100 : (feld?.fortschritt ?? 0),
      blaetter: [...erledigt, ...(feld?.offen ?? [])].map((z) => ({
        key: z.id,
        titel: z.arbeitsblatt.titel,
        baustein: z.arbeitsblatt.baustein,
        erledigt: z.status === 'erledigt',
      })),
    }
  }
  const liste = worksheetsFor(worksheets, station.berufsbild)
  const done = doneCount(station, worksheets)
  return {
    erledigt: done,
    gesamt: null,
    fortschritt: station.progress,
    blaetter: liste.map((w, i) => ({ key: String(w.id), titel: w.title, baustein: w.baustein, erledigt: i < done })),
  }
}

/** "2 von 3 AB erledigt", "keine AB zugeordnet" or – with sample data – "3 AB erledigt" */
export function stationsStandText(stand: StationsStand): string {
  if (stand.gesamt === null) return `${stand.erledigt} AB erledigt`
  if (stand.gesamt === 0) return 'keine AB zugeordnet'
  return `${stand.erledigt} von ${stand.gesamt} AB erledigt`
}

/**
 * FE-30: closes station `index` (100 %, end date today) and starts the next pending one.
 * `erledigt` = worksheets done according to the learning progress; it is kept on the station.
 */
export function schliesseStationAb(p: Participant, index: number, today: string, erledigt = 0): Participant {
  const naechste = p.berufsbilder.findIndex((b, i) => i > index && b.status === 'ausstehend')
  const berufsbilder = p.berufsbilder.map((b, i): BerufStation => {
    if (i === index) {
      return { ...b, status: 'abgeschlossen', progress: 100, endDate: today, worksheetsDone: Math.max(b.worksheetsDone, erledigt) }
    }
    if (i === naechste) return { ...b, status: 'aktiv', startDate: b.startDate || today }
    return b
  })
  return { ...p, berufsbilder, level: naechste >= 0 ? p.berufsbilder[naechste].level : p.level, lastActive: today }
}

/**
 * FE-30: reopens a closed station. Only one station may be active, so the currently
 * active one goes back to "ausstehend" (its dates and numbers stay).
 */
export function oeffneStationWieder(p: Participant, index: number, today: string): Participant {
  const berufsbilder = p.berufsbilder.map((b, i): BerufStation => {
    if (i === index) return { ...b, status: 'aktiv', endDate: undefined, startDate: b.startDate || today }
    if (b.status === 'aktiv') return { ...b, status: 'ausstehend' }
    return b
  })
  return { ...p, berufsbilder, level: p.berufsbilder[index].level, lastActive: today }
}

export function activeStation(p: Participant): BerufStation | undefined {
  return p.berufsbilder.find((b) => b.status === 'aktiv')
}

/** Eingabe im Teilnehmer-Dialog: ein Berufsfeld mit Niveau und Format */
export type StationDraft = { berufsbild: string; level: Level; format: Format }

/**
 * Baut aus den Eingaben des Dialogs den Lernweg.
 * Bestehende Stationen behalten Fortschritt und Status, neue starten als
 * "aktiv" (erste Station) bzw. "ausstehend".
 */
export function buildStations(drafts: readonly StationDraft[], existing: readonly BerufStation[], today: string): BerufStation[] {
  return drafts.map((draft, i) => {
    const previous = existing.find((b) => b.berufsbild === draft.berufsbild)
    if (previous) return { ...previous, level: draft.level, format: draft.format }
    return {
      berufsbild: draft.berufsbild,
      level: draft.level,
      format: draft.format,
      progress: 0,
      status: i === 0 ? 'aktiv' : 'ausstehend',
      startDate: i === 0 ? today : '',
      worksheetsDone: 0,
    }
  })
}

/**
 * Pseudonymous ID such as "IW3-4421" (FE-28) – same rule as the backend
 * (apps/backend/src/teilnehmende/schema.js, KENNUNG_RE). Lower case is accepted
 * and converted to upper case.
 */
export const KENNUNG_RE = /^[A-Z][A-Z0-9]{1,4}-\d{1,6}$/

export const normalisiereKennung = (value: string) => value.trim().toUpperCase()

/** Error message for the ID field, or null if the ID is valid */
export function pruefeKennung(value: string): string | null {
  const kennung = normalisiereKennung(value)
  if (!kennung) return 'Bitte die IW3-Nummer der Person eintragen, z. B. IW3-4421.'
  if (!KENNUNG_RE.test(kennung)) return 'Die Kennung muss wie IW3-4421 aufgebaut sein (Buchstaben/Ziffern, Bindestrich, Nummer) – keine Namen.'
  return null
}

export function moveItem<T>(list: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= list.length) return [...list]
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
