import { BERUFSBILD_LAGER, LEVELS, LEVEL_STYLES } from '@/data/constants'
import type { AppSettings } from '@/types'
import { AA_TEXT, mitKontrast } from '@/lib/kontrast'

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
  '--tint-success': '#F0FBF4',
  '--tint-info': '#EBF0F8',
}

const DARK = {
  '--background': '#1A1714',
  '--foreground': '#F5F1E8',
  '--card': '#242019',
  '--card-foreground': '#F5F1E8',
  '--muted': '#2C2820',
  '--muted-foreground': '#A69D8D',
  '--border': '#3A352C',
  '--tint-success': '#1E3326',
  '--tint-info': '#1B2633',
}

/** Heller Text auf Akzent- und Primärflächen (Buttons, Sidebar) */
const TEXT_AUF_FARBE = ['#FDFAF3', '#FFFFFF']
const DANGER = '#E53E3E'
const SUCCESS = '#2A7A4B'

/**
 * Alle Theme-Variablen für die gewählten Einstellungen (FE-15).
 *
 * - `--accent` / `--primary`: Flächenfarben, bei Bedarf abgedunkelt, damit
 *   heller Text darauf 4,5 : 1 erreicht.
 * - `--accent-text` / `--primary-text` / `--danger` / `--success`: Textfarben,
 *   die auf Hintergrund, Karte und Muted-Flächen 4,5 : 1 erreichen – im
 *   Dunkelmodus aufgehellt statt abgedunkelt.
 * - `--ring`: Fokusrahmen in der lesbaren Primärfarbe.
 */
export function themeFarben(settings: AppSettings): Record<string, string> {
  const basis = settings.darkMode ? DARK : LIGHT
  const flaechen = [basis['--background'], basis['--card'], basis['--muted'], basis['--tint-success'], basis['--tint-info']]
  const richtung = settings.darkMode ? 'heller' : 'dunkler'
  const textFarbe = (farbe: string) => mitKontrast(farbe, flaechen, AA_TEXT, richtung)
  const primaryText = textFarbe(settings.primaryColor)
  return {
    ...basis,
    '--accent': mitKontrast(settings.accentColor, TEXT_AUF_FARBE),
    '--primary': mitKontrast(settings.primaryColor, TEXT_AUF_FARBE),
    '--accent-text': textFarbe(settings.accentColor),
    '--primary-text': primaryText,
    '--danger': textFarbe(DANGER),
    '--success': textFarbe(SUCCESS),
    '--ring': primaryText,
    // Stufenfarben als Text auf Seitenflächen, z. B. var(--stufe-T-text)
    ...Object.fromEntries(LEVELS.map((level) => [`--stufe-${level}-text`, textFarbe(LEVEL_STYLES[level].text)])),
  }
}

/** Textfarbe einer Niveaustufe auf Seiten- und Kartenflächen (hell und dunkel lesbar) */
export const stufeTextVar = (level: string) => `var(--stufe-${level}-text)`

/** Setzt Farben und Hell/Dunkel als CSS-Variablen auf <html> */
export function applyTheme(settings: AppSettings, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(themeFarben(settings))) {
    root.style.setProperty(name, value)
  }
  root.style.colorScheme = settings.darkMode ? 'dark' : 'light'
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
