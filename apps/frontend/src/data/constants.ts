import type { Format, HistoryAction, Level, NavItem, Sprache, StaffRole, Worksheet } from '@/types'

export const LEVELS: readonly Level[] = ['T', 'A', 'F', 'B']

/**
 * Niveaustufen der binnendifferenzierten Lehrplaene des Bildungsparks.
 *
 * Belegt sind in den Lehrplaenen nur die Buchstaben T, A, F, B und die
 * Kompetenzformel je Stufe (`beschreibung`). Die Bezeichnungen folgen dem
 * Vier-Stufen-Modell der BAG WfbM (taetigkeits-, arbeitsplatz-, berufsfeld-,
 * berufsbildorientiert), auf das auch das Infoblatt des Bildungsparks verweist
 * ("taetigkeits- bis berufsbildorientiert"). Die frueheren Mockup-Labels
 * "Talent-/Aufbau-/Fach-/Berufsstufe" hatten keine Quelle.
 * Bestaetigung durch den Bildungspark steht aus – siehe docs/fachliche-grundlagen.md.
 */
export const LEVEL_STYLES: Record<Level, { bg: string; text: string; label: string; beschreibung: string }> = {
  T: { bg: '#D4EDDA', text: '#1A5C32', label: 'Tätigkeit', beschreibung: 'Tätigkeitsorientiert: beherrscht einen erlernten Arbeitsschritt' },
  A: { bg: '#D0E4F7', text: '#1A3A5C', label: 'Arbeitsplatz', beschreibung: 'Arbeitsplatzorientiert: beherrscht einige erlernte Arbeitsschritte' },
  F: { bg: '#FFF3CD', text: '#7A5C00', label: 'Berufsfeld', beschreibung: 'Berufsfeldorientiert: wendet Erlerntes in bekannten Situationen an' },
  B: { bg: '#FAD9C8', text: '#7A2E00', label: 'Berufsbild', beschreibung: 'Berufsbildorientiert: wendet Erlerntes in neuen Situationen an' },
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

/** Niveaustufen, für die ein Arbeitsblatt hinterlegt ist, in der Reihenfolge T/A/F/B */
export function niveausOf(worksheet: Worksheet): Level[] {
  return LEVELS.filter((l) => worksheet.niveaus.includes(l))
}

/**
 * FE-43: persona letter per (level, format) – 4×4 grid from the team's project
 * concept (not a requirement of the Bildungspark): T = A–D, A = E–H, F = I–L, B = M–P.
 */
export const PERSONA_MAP: Record<Level, Record<Format, string>> = {
  T: { text: 'A', piktogramm: 'B', mathefrei: 'C', 'piktogramm-mathefrei': 'D' },
  A: { text: 'E', piktogramm: 'F', mathefrei: 'G', 'piktogramm-mathefrei': 'H' },
  F: { text: 'I', piktogramm: 'J', mathefrei: 'K', 'piktogramm-mathefrei': 'L' },
  B: { text: 'M', piktogramm: 'N', mathefrei: 'O', 'piktogramm-mathefrei': 'P' },
}

/** FE-43: what a person with this accessibility format needs (persona overview) */
export const FORMAT_BEDARF: Record<Format, string> = {
  text: 'Liest selbstständig – keine zusätzlichen Symbole oder Anpassungen nötig.',
  piktogramm: 'Versteht Aufgaben besser durch Bilder und Symbole statt reinem Text.',
  mathefrei: 'Hat Schwierigkeiten mit Zahlen – Rechenaufgaben werden durch Verstehensaufgaben ersetzt.',
  'piktogramm-mathefrei': 'Kombinierter Bedarf: Symbole und keine Rechenschritte für größtmögliche Barrierefreiheit.',
}

export const FORMAT_BADGE_COLORS: Record<Format, { bg: string; color: string }> = {
  text: { bg: '#DCEAF7', color: '#00487A' },
  piktogramm: { bg: '#F3E8FF', color: '#7A2E9A' },
  mathefrei: { bg: '#FFF3CD', color: '#7A5C00' },
  'piktogramm-mathefrei': { bg: '#FAD9C8', color: '#7A2E00' },
}

export const SPRACHEN: readonly Sprache[] = ['Leichte Sprache', 'Standardsprache']

/**
 * Berufsfelder laut Infoblatt des Bildungsparks ("Der Andere Leistungsanbieter
 * im Bildungspark"). Binnendifferenzierte Lehrplaene liegen fuer die ersten
 * drei vor (TQ Fachlagerist, TQ Gastrobereich, TQ Metall).
 */
export const BERUFSBILD_LAGER = 'Lagerlogistik, Handel & Versand'
export const BERUFSBILD_GASTRO = 'Gastronomie & Hauswirtschaft'
export const BERUFSBILD_METALL = 'Metalltechnik & Montage'
export const BERUFSBILD_GALA = 'Garten- und Landschaftsbau'
export const BERUFSBILD_PFLEGE = 'Pflege & unterstützende Tätigkeiten'

export const BERUFSBILDER: readonly string[] = [
  BERUFSBILD_LAGER,
  BERUFSBILD_GASTRO,
  BERUFSBILD_METALL,
  BERUFSBILD_GALA,
  BERUFSBILD_PFLEGE,
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
  { id: 'lehrplaene', label: 'Lehrpläne', title: 'Lehrpläne', icon: '▤' },
  { id: 'arbeitsblaetter', label: 'Arbeitsblätter', title: 'Arbeitsblätter', icon: '▦' },
  { id: 'ki-erstellung', label: 'KI-Erstellung', title: 'KI-Erstellung', icon: '✦' },
  { id: 'teilnehmer', label: 'Teilnehmende', title: 'Teilnehmende', icon: '◎' },
  { id: 'benutzerverwaltung', label: 'Benutzerverwaltung', title: 'Benutzerverwaltung', icon: '⊙', adminOnly: true },
  { id: 'einstellungen', label: 'Einstellungen', title: 'Einstellungen', icon: '⚙' },
]

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrator',
  dozent: 'Dozent/in',
  assistent: 'Assistent/in',
}
