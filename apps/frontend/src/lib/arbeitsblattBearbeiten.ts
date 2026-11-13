import type { Arbeitsblatt, ArbeitsblattStatus, GespeichertesArbeitsblatt } from '@/lib/api'
import { worksheetAusGespeichertem } from '@/lib/gespeicherteArbeitsblaetter'
import type { StaffRole, Worksheet } from '@/types'

/**
 * FE-10: editing, releasing and archiving saved worksheets.
 *
 * Pure helpers used by the editor tab and the status bar of the detail panel.
 * The limits mirror WorksheetSchema / PatchSchema in apps/backend so that the
 * user sees validation errors before the request is sent.
 */

export const LIMITS = {
  titel: 120,
  einleitung: 2000,
  anweisung: 600,
  loesung: 400,
  wort: 80,
  erklaerung: 300,
  hinweisAnleiter: 800,
  notiz: 500,
} as const

/** Returns one German message per problem; an empty list means the draft can be saved */
export function pruefeEntwurf(w: Arbeitsblatt, notiz = ''): string[] {
  const fehler: string[] = []
  const pflicht = (wert: string, max: number, name: string) => {
    if (!wert.trim()) fehler.push(`${name} darf nicht leer sein.`)
    else if (wert.trim().length > max) fehler.push(`${name} ist zu lang (höchstens ${max} Zeichen).`)
  }
  const optional = (wert: string | undefined, max: number, name: string) => {
    if (wert && wert.trim().length > max) fehler.push(`${name} ist zu lang (höchstens ${max} Zeichen).`)
  }

  pflicht(w.titel, LIMITS.titel, 'Titel')
  pflicht(w.einleitung, LIMITS.einleitung, 'Einleitung')
  if (w.aufgaben.length === 0) fehler.push('Das Arbeitsblatt braucht mindestens eine Aufgabe.')
  w.aufgaben.forEach((a, i) => {
    pflicht(a.anweisung, LIMITS.anweisung, `Anweisung von Aufgabe ${i + 1}`)
    optional(a.loesung, LIMITS.loesung, `Lösung von Aufgabe ${i + 1}`)
  })
  w.woerterbuch.forEach((e, i) => {
    pflicht(e.wort, LIMITS.wort, `Wort ${i + 1} im Wörterbuch`)
    pflicht(e.erklaerung, LIMITS.erklaerung, `Erklärung ${i + 1} im Wörterbuch`)
  })
  optional(w.hinweisAnleiter, LIMITS.hinweisAnleiter, 'Hinweis für die Anleitung')
  optional(notiz, LIMITS.notiz, 'Notiz')
  return fehler
}

/** Trims all free-text fields and renumbers tasks, so the backend gets clean data */
export function bereinige(w: Arbeitsblatt): Arbeitsblatt {
  return {
    ...w,
    titel: w.titel.trim(),
    einleitung: w.einleitung.trim(),
    hinweisAnleiter: w.hinweisAnleiter.trim(),
    aufgaben: w.aufgaben.map((a, i) => {
      const aufgabe = { ...a, nr: i + 1, anweisung: a.anweisung.trim() }
      // An emptied solution field means "no solution", not an empty string
      const loesung = a.loesung?.trim()
      if (loesung) aufgabe.loesung = loesung
      else delete aufgabe.loesung
      return aufgabe
    }),
    woerterbuch: w.woerterbuch.map((e) => ({ wort: e.wort.trim(), erklaerung: e.erklaerung.trim() })),
  }
}

/** True when the draft differs from the saved content (ignoring surrounding whitespace) */
export function istGeaendert(original: Arbeitsblatt, entwurf: Arbeitsblatt): boolean {
  return JSON.stringify(bereinige(original)) !== JSON.stringify(bereinige(entwurf))
}

export type StatusAktion = {
  ziel: ArbeitsblattStatus
  label: string
  /** Shown in the confirmation row */
  frage: string
  /** Archiving is the only action with a destructive colour */
  gefaehrlich?: boolean
}

const AKTIONEN: Record<ArbeitsblattStatus, StatusAktion[]> = {
  entwurf: [
    { ziel: 'freigegeben', label: '✓ Freigeben', frage: 'Arbeitsblatt für den Unterricht freigeben?' },
    { ziel: 'archiviert', label: 'Archivieren', frage: 'Arbeitsblatt archivieren? Es verschwindet aus der Liste, der Verlauf bleibt erhalten.', gefaehrlich: true },
  ],
  freigegeben: [
    { ziel: 'entwurf', label: '↩ Zurück auf Entwurf', frage: 'Freigabe zurücknehmen und wieder als Entwurf bearbeiten?' },
    { ziel: 'archiviert', label: 'Archivieren', frage: 'Arbeitsblatt archivieren? Es verschwindet aus der Liste, der Verlauf bleibt erhalten.', gefaehrlich: true },
  ],
  archiviert: [{ ziel: 'entwurf', label: '↩ Wiederherstellen', frage: 'Arbeitsblatt als Entwurf wiederherstellen?' }],
}

/** Status changes are reserved for lecturers and admins; assistants may only edit content */
export function darfStatusAendern(rolle: StaffRole): boolean {
  return rolle === 'admin' || rolle === 'dozent'
}

export function statusAktionen(status: ArbeitsblattStatus, rolle: StaffRole): StatusAktion[] {
  return darfStatusAendern(rolle) ? AKTIONEN[status] : []
}

/** "03.11.2026, 10:15" in the user's local time */
export function formatZeitpunkt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}, ${zwei(d.getHours())}:${zwei(d.getMinutes())}`
}

/**
 * Applies a saved worksheet returned by PATCH to the list of cards.
 * Archived worksheets are removed, because the list only shows active ones.
 */
export function uebernehmeGespeichertes(liste: Worksheet[], blatt: GespeichertesArbeitsblatt): Worksheet[] {
  if (blatt.status === 'archiviert') return liste.filter((w) => w.backend?.id !== blatt.id)
  return liste.map((w) => (w.backend?.id === blatt.id ? worksheetAusGespeichertem(blatt, w.id) : w))
}
