import { BERUFSBILD_LAGER } from '@/data/constants'
import type { AppSettings } from '@/types'

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  accentColor: '#C4632A',
  primaryColor: '#1E3A5F',
  sidebarCompact: false,
  defaultBerufsbild: BERUFSBILD_LAGER,
  aiAutoExpand: true,
  showPersonaBadges: true,
  language: 'de',
  dateFormat: 'DD.MM.YYYY',
  exportFormat: 'docx',
  emailNotifications: false,
  worksheetReminders: true,
  autoSave: true,
}

export const ACCENT_COLORS = ['#C4632A', '#2A6B4B', '#1E5FA0', '#7A2E9A', '#C4A020', '#C42A2A'] as const
export const PRIMARY_COLORS = ['#1E3A5F', '#1A5C32', '#4A1A6B', '#5C3A1A', '#1A4A5C', '#3A1A1A'] as const

const LIGHT = {
  '--background': '#f5f1e8',
  '--foreground': '#1a1714',
  '--card': '#fdfaf3',
  '--card-foreground': '#1a1714',
  '--muted': '#ebe5d6',
  '--muted-foreground': '#6b6354',
  '--border': '#d5cebb',
}

const DARK = {
  '--background': '#1A1714',
  '--foreground': '#F5F1E8',
  '--card': '#242019',
  '--card-foreground': '#F5F1E8',
  '--muted': '#2C2820',
  '--muted-foreground': '#9B9283',
  '--border': '#3A352C',
}

/** Setzt Farben und Hell/Dunkel als CSS-Variablen auf <html> */
export function applyTheme(settings: AppSettings, root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--accent', settings.accentColor)
  root.style.setProperty('--primary', settings.primaryColor)
  root.style.setProperty('--ring', settings.primaryColor)
  for (const [name, value] of Object.entries(settings.darkMode ? DARK : LIGHT)) {
    root.style.setProperty(name, value)
  }
}

const STORAGE_KEY = 'bildungspark.einstellungen'

/**
 * Einstellungen liegen im Prototyp nur im Browser (localStorage).
 * Ist der Speicher gesperrt oder leer, gelten die Standardwerte.
 */
export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Speicher nicht verfuegbar (z. B. privates Fenster): Einstellungen gelten nur bis zum Neuladen
  }
}
