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

export function activeStation(p: Participant): BerufStation | undefined {
  return p.berufsbilder.find((b) => b.status === 'aktiv')
}

/** Eingabe im Teilnehmer-Dialog: ein Berufsfeld mit Niveau und Format */
export type StationDraft = { berufsbild: string; level: Level; format: Format }

export const normalisiereKennung = (id: string) => id.trim().toUpperCase()
export function pruefeProfil(id: string, drafts: readonly StationDraft[]): string | null {
  if (!id.trim()) return 'Bitte geben Sie die IW3-Nummer an.'
  if (!/^[A-Z][A-Z0-9]{1,4}-\d{1,6}$/.test(normalisiereKennung(id))) return 'Bitte eine pseudonyme Kennung wie IW3-4421 eingeben. Keine Namen verwenden.'
  if (!drafts.length || drafts.length > 10) return 'Bitte wählen Sie ein bis zehn Berufsbereiche.'
  const fields = drafts.map((d) => d.berufsbild.trim().toLowerCase())
  if (fields.some((f) => !f) || new Set(fields).size !== fields.length) return 'Jeder Berufsbereich darf nur einmal vorkommen.'
  return null
}

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
      status: i === 0 && !existing.some((b) => b.status === 'aktiv') ? 'aktiv' : 'ausstehend',
      startDate: i === 0 && !existing.some((b) => b.status === 'aktiv') ? today : '',
      worksheetsDone: 0,
    }
  })
}

/** Naechste freie Kennung "TN-001", "TN-002", … wenn keine eigene angegeben wurde */
export function nextParticipantId(participants: readonly Participant[]): string {
  let n = participants.length + 1
  const taken = new Set(participants.map((p) => p.id))
  while (taken.has(`TN-${String(n).padStart(3, '0')}`)) n++
  return `TN-${String(n).padStart(3, '0')}`
}

export function moveItem<T>(list: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= list.length) return [...list]
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
