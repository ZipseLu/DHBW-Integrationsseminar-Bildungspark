/** Niveaustufen: Talent-, Aufbau-, Fach- und Berufsstufe */
export type Level = 'T' | 'A' | 'F' | 'B'

/** Barrierefreiheits-Formate eines Arbeitsblatts */
export type Format = 'text' | 'piktogramm' | 'mathefrei' | 'piktogramm-mathefrei'

export type Sprache = 'Leichte Sprache' | 'Standardsprache'

export type NavItem =
  | 'dashboard'
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
  sprache: Sprache
  /** Niveaustufen, für die dieses Arbeitsblatt hinterlegt ist */
  niveaus: Level[]
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
