/** Niveaustufen T/A/F/B der binnendifferenzierten Lehrplaene (Bezeichnungen: LEVEL_STYLES in data/constants.ts) */
export type Level = 'T' | 'A' | 'F' | 'B'

/** Barrierefreiheits-Formate eines Arbeitsblatts */
export type Format = 'text' | 'piktogramm' | 'mathefrei' | 'piktogramm-mathefrei'

export type Sprache = 'Leichte Sprache' | 'Standardsprache'

export type NavItem =
  | 'dashboard'
  | 'lehrplaene'
  | 'arbeitsblaetter'
  | 'ki-erstellung'
  | 'teilnehmer'
  | 'berichte'
  | 'benutzerverwaltung'
  | 'einstellungen'

export type StaffRole = 'admin' | 'dozent' | 'assistent'

export type StaffUser = {
  id: string
  name: string
  initials: string
  role: StaffRole
  email: string
  /** Anlagedatum YYYY-MM-DD (nur Anzeige in der Benutzerverwaltung) */
  createdAt?: string
}

export type NiveauRow = { kompetenz: string; beispiel: string }

export type Abschnitt = { titel: string; niveaus: Record<Level, NiveauRow> }

export type Worksheet = {
  id: number
  title: string
  berufsbild: string
  baustein: number
  ausbildungsbaustein: string
  abschnitt: Abschnitt
  createdBy: string
  date: string
  aiGenerated: boolean
  participants: number
  format: Format
}

export type SavedDocument = {
  id: string
  name: string
  size: string
  pages: number
  savedAt: string
  savedBy: string
  berufsbild: string
  thema: string
}

export type HistoryAction = 'erstellt' | 'bearbeitet' | 'KI-angepasst' | 'freigegeben' | 'archiviert'

export type HistoryEntry = {
  version: number
  date: string
  author: string
  action: HistoryAction
  note: string
}

export type WebResult = {
  title: string
  url: string
  snippet: string
  source: string
}

/** Status eines Berufsfelds im Lernweg einer/eines Teilnehmenden */
export type StationStatus = 'abgeschlossen' | 'aktiv' | 'ausstehend'

/** Ein Berufsfeld im Lernweg – Reihenfolge der Liste = Reihenfolge des Lernwegs */
export type BerufStation = {
  berufsbild: string
  level: Level
  format: Format
  /** Fortschritt in Prozent */
  progress: number
  status: StationStatus
  startDate: string
  endDate?: string
  worksheetsDone: number
}

/**
 * Anonymisiertes Teilnehmerprofil (§ 60 SGB IX): nur eine pseudonyme Kennung,
 * keine Namen und keine Diagnosen.
 */
export type Participant = {
  id: string
  level: Level
  progress: number
  lastActive: string
  berufsbilder: BerufStation[]
}

export type AppSettings = {
  darkMode: boolean
  accentColor: string
  primaryColor: string
  sidebarCompact: boolean
  defaultBerufsbild: string
  aiAutoExpand: boolean
  showPersonaBadges: boolean
  language: 'de' | 'en'
  dateFormat: 'DD.MM.YYYY' | 'YYYY-MM-DD'
  exportFormat: 'docx' | 'pdf'
  emailNotifications: boolean
  worksheetReminders: boolean
  autoSave: boolean
}
