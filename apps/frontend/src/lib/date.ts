/** Kalenderwoche nach ISO 8601 (Woche beginnt Montag, KW 1 enthaelt den 4. Januar) */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** z. B. "KW 43 · Donnerstag, 22. Oktober 2026" */
export function formatHeaderDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
  return `KW ${isoWeek(date)} · ${formatted}`
}

/** Heutiges Datum als YYYY-MM-DD (lokale Zeit) */
export function todayIso(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
