import type { Format, HistoryAction, Level, NavItem, Sprache, StaffRole } from '@/types'

export const LEVELS: readonly Level[] = ['T', 'A', 'F', 'B']

export const LEVEL_STYLES: Record<Level, { bg: string; text: string; label: string }> = {
  T: { bg: '#D4EDDA', text: '#1A5C32', label: 'Talentstufe' },
  A: { bg: '#D0E4F7', text: '#1A3A5C', label: 'Aufbaustufe' },
  F: { bg: '#FFF3CD', text: '#7A5C00', label: 'Fachstufe' },
  B: { bg: '#FAD9C8', text: '#7A2E00', label: 'Berufsstufe' },
}

export type FormatOption = { id: Format; label: string; icon: string; desc: string }

export const FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'text', label: 'Standard-Text', icon: '𝐓', desc: 'Klassisches Textarbeitsblatt in Leichter oder Standardsprache' },
  { id: 'piktogramm', label: 'Mit Piktogrammen', icon: '◉', desc: 'Für Leseanfänger: Aufgaben durch Symbole & Bilder unterstützt' },
  { id: 'mathefrei', label: 'Ohne Rechnen', icon: '≠', desc: 'Für Rechenschwäche: Keine Rechenaufgaben, nur qualitatives Verstehen' },
  { id: 'piktogramm-mathefrei', label: 'Piktogramm + Mathefrei', icon: '◎', desc: 'Kombination: Symbole & keine Rechenschritte – maximale Barrierefreiheit' },
]

export function formatOption(format: Format): FormatOption {
  // FORMAT_OPTIONS deckt alle Formate ab, daher ist das Ergebnis nie undefined
  return FORMAT_OPTIONS.find((option) => option.id === format) as FormatOption
}

export const FORMAT_BADGE_COLORS: Record<Format, { bg: string; color: string }> = {
  text: { bg: '#EBF0F8', color: '#1E3A5F' },
  piktogramm: { bg: '#F3E8FF', color: '#7A2E9A' },
  mathefrei: { bg: '#FFF3CD', color: '#7A5C00' },
  'piktogramm-mathefrei': { bg: '#FAD9C8', color: '#7A2E00' },
}

/** Persona-Buchstabe je (Niveau, Format) – entspricht dem 4×4-Raster der Projektkonzeption */
export const PERSONA_MAP: Record<Level, Record<Format, string>> = {
  T: { text: 'A', piktogramm: 'B', mathefrei: 'C', 'piktogramm-mathefrei': 'D' },
  A: { text: 'E', piktogramm: 'F', mathefrei: 'G', 'piktogramm-mathefrei': 'H' },
  F: { text: 'I', piktogramm: 'J', mathefrei: 'K', 'piktogramm-mathefrei': 'L' },
  B: { text: 'M', piktogramm: 'N', mathefrei: 'O', 'piktogramm-mathefrei': 'P' },
}

export const SPRACHEN: readonly Sprache[] = ['Leichte Sprache', 'Standardsprache']

export const BERUFSBILDER: readonly string[] = [
  'Lagerlogistik',
  'Küche & Gastronomie',
  'Reinigung & Gebäudepflege',
  'Metallverarbeitung',
]

export const ALLE_BERUFSBILDER = 'Alle Berufsbilder'

export const HISTORY_ACTION_STYLES: Record<HistoryAction, { bg: string; text: string; icon: string }> = {
  erstellt: { bg: '#D4EDDA', text: '#1A5C32', icon: '✦' },
  bearbeitet: { bg: '#D0E4F7', text: '#1A3A5C', icon: '✎' },
  'KI-angepasst': { bg: '#EDE9FE', text: '#5B21B6', icon: '⚡' },
  freigegeben: { bg: '#FFF3CD', text: '#7A5C00', icon: '✓' },
  archiviert: { bg: '#FAD9C8', text: '#7A2E00', icon: '⬡' },
}

export type NavEntry = { id: NavItem; label: string; title: string; icon: string; adminOnly?: boolean }

export const NAV_ITEMS: readonly NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', title: 'Übersicht', icon: '◈' },
  { id: 'arbeitsblaetter', label: 'Arbeitsblätter', title: 'Arbeitsblätter', icon: '▦' },
  { id: 'ki-erstellung', label: 'KI-Erstellung', title: 'KI-Erstellung', icon: '✦' },
  { id: 'teilnehmer', label: 'Teilnehmende', title: 'Teilnehmende', icon: '◎' },
  { id: 'berichte', label: 'Berichte', title: 'Berichte', icon: '◱' },
  { id: 'benutzerverwaltung', label: 'Benutzerverwaltung', title: 'Benutzerverwaltung', icon: '⊙', adminOnly: true },
  { id: 'einstellungen', label: 'Einstellungen', title: 'Einstellungen', icon: '⚙' },
]

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrator',
  dozent: 'Dozent/in',
  assistent: 'Assistent/in',
}
