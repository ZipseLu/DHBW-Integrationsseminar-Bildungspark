import { BERUFSBILD_LAGER, LEVELS, LEVEL_STYLES } from '@/data/constants'
import type { AppSettings } from '@/types'
import { AA_TEXT, mitKontrast } from '@/lib/kontrast'

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  // FE-21: colors of the Bildungspark corporate design (worksheet template)
  accentColor: '#009FE3',
  primaryColor: '#00487A',
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

export const ACCENT_COLORS = ['#009FE3', '#C4632A', '#2A6B4B', '#7A2E9A', '#C4A020', '#C42A2A'] as const
export const PRIMARY_COLORS = ['#00487A', '#1E3A5F', '#1A5C32', '#4A1A6B', '#5C3A1A', '#3A1A1A'] as const

// FE-21: cool neutrals that go with the Bildungspark blue (instead of the cream tones of the mockup)
const LIGHT = {
  '--background': '#F3F7FB',
  '--foreground': '#14202B',
  '--card': '#FFFFFF',
  '--card-foreground': '#14202B',
  '--muted': '#E6EEF6',
  '--muted-foreground': '#4A5866',
  '--border': '#C9D6E3',
  '--tint-success': '#EEF9F1',
  '--tint-info': '#DCEAF7',
}

const DARK = {
  '--background': '#0E1924',
  '--foreground': '#EEF3F8',
  '--card': '#15222F',
  '--card-foreground': '#EEF3F8',
  '--muted': '#1C2B3A',
  '--muted-foreground': '#9DB0C2',
  '--border': '#2A3B4C',
  '--tint-success': '#1B3326',
  '--tint-info': '#1A2C3E',
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

/** Default colors before FE-21 (mockup) */
const ALTE_STANDARDFARBEN = { accentColor: '#C4632A', primaryColor: '#1E3A5F' }

/**
 * Einstellungen liegen im Prototyp nur im Browser (localStorage).
 * Ist der Speicher gesperrt oder leer, gelten die Standardwerte.
 */
export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const gespeichert = JSON.parse(raw) as Partial<AppSettings>
    // FE-21: whoever still has the old default colors of the mockup gets the corporate design
    if (gespeichert.accentColor === ALTE_STANDARDFARBEN.accentColor && gespeichert.primaryColor === ALTE_STANDARDFARBEN.primaryColor) {
      delete gespeichert.accentColor
      delete gespeichert.primaryColor
    }
    return { ...DEFAULT_SETTINGS, ...gespeichert }
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
