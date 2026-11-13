import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../AuthenticatedTestApp'
import { LEVELS } from '@/data/constants'
import { AA_TEXT, hexToRgb, kontrast, mische, mitKontrast } from '@/lib/kontrast'
import { ACCENT_COLORS, DEFAULT_SETTINGS, PRIMARY_COLORS, applyTheme, themeFarben } from '@/lib/settings'

/**
 * FE-15: Barrierefreiheit der Oberfläche.
 * Prüft die Kontrastberechnung (WCAG 2.1 AA), die daraus abgeleiteten
 * Theme-Farben für alle wählbaren Farben in Hell und Dunkel sowie
 * Sprunglink, Landmarken und Seitentitel.
 */

describe('Kontrast nach WCAG 2.1', () => {
  it('berechnet bekannte Kontrastverhältnisse', () => {
    expect(kontrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(kontrast('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
    expect(kontrast('#777777', '#777777')).toBe(1)
    // Grenzfall aus der WCAG-Praxis: #767676 auf Weiß erreicht gerade 4,5 : 1
    expect(kontrast('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(kontrast('#777777', '#FFFFFF')).toBeLessThan(4.5)
  })

  it('liest kurze und lange Hex-Farben und lehnt anderes ab', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
    expect(hexToRgb('1E3A5F')).toEqual([30, 58, 95])
    expect(() => hexToRgb('rgb(0,0,0)')).toThrow()
  })

  it('mischt Farben anteilig', () => {
    expect(mische('#000000', '#FFFFFF', 0)).toBe('#000000')
    expect(mische('#000000', '#FFFFFF', 1)).toBe('#FFFFFF')
    expect(mische('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })

  it('lässt ausreichende Farben unverändert und passt zu schwache an', () => {
    expect(mitKontrast('#1E3A5F', ['#FDFAF3'])).toBe('#1E3A5F')

    const dunkler = mitKontrast('#C4632A', ['#FDFAF3'])
    expect(dunkler).not.toBe('#C4632A')
    expect(kontrast(dunkler, '#FDFAF3')).toBeGreaterThanOrEqual(AA_TEXT)

    const heller = mitKontrast('#1E3A5F', ['#242019'], AA_TEXT, 'heller')
    expect(kontrast(heller, '#242019')).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('Theme-Farben', () => {
  const kombinationen = [false, true].flatMap((darkMode) =>
    ACCENT_COLORS.flatMap((accentColor) => PRIMARY_COLORS.map((primaryColor) => ({ ...DEFAULT_SETTINGS, darkMode, accentColor, primaryColor }))),
  )

  it.each(kombinationen.map((s) => [`${s.darkMode ? 'dunkel' : 'hell'} ${s.accentColor}/${s.primaryColor}`, s] as const))(
    'erreicht 4,5 : 1 für alle Textfarben (%s)',
    (_name, settings) => {
      const t = themeFarben(settings)
      const flaechen = [t['--background'], t['--card'], t['--muted']]
      const getoent = [...flaechen, t['--tint-success'], t['--tint-info']]

      // Heller Text auf Buttons und Navigation
      expect(kontrast('#FDFAF3', t['--accent'])).toBeGreaterThanOrEqual(AA_TEXT)
      expect(kontrast('#FDFAF3', t['--primary'])).toBeGreaterThanOrEqual(AA_TEXT)

      // Fließtext und Hinweistexte
      for (const bg of flaechen) {
        expect(kontrast(t['--foreground'], bg)).toBeGreaterThanOrEqual(AA_TEXT)
        expect(kontrast(t['--muted-foreground'], bg)).toBeGreaterThanOrEqual(AA_TEXT)
      }

      // Farbige Texte – auch auf den getönten Flächen
      const farbig = ['--accent-text', '--primary-text', '--danger', '--success', ...LEVELS.map((l) => `--stufe-${l}-text`)]
      for (const name of farbig) {
        for (const bg of getoent) expect(kontrast(t[name], bg), `${name} auf ${bg}`).toBeGreaterThanOrEqual(AA_TEXT)
      }
      for (const bg of getoent) expect(kontrast(t['--foreground'], bg)).toBeGreaterThanOrEqual(AA_TEXT)

      // Fokusrahmen braucht mindestens 3 : 1 zum Hintergrund
      expect(kontrast(t['--ring'], t['--background'])).toBeGreaterThanOrEqual(3)
    },
  )

  it('setzt Variablen und Farbschema auf das Element', () => {
    const el = document.createElement('div')
    applyTheme({ ...DEFAULT_SETTINGS, darkMode: true }, el)
    expect(el.style.getPropertyValue('--accent-text')).toMatch(/^#[0-9A-F]{6}$/)
    expect(el.style.getPropertyValue('--stufe-T-text')).toMatch(/^#[0-9A-F]{6}$/)
    expect(el.style.colorScheme).toBe('dark')
  })
})

describe('Bedienung mit Tastatur und Screenreader', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'db_unavailable', message: 'nicht verfügbar' }), { status: 503, headers: { 'Content-Type': 'application/json' } })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bietet einen Sprunglink zum Hauptinhalt', () => {
    render(<App />)
    const link = screen.getByRole('link', { name: 'Zum Inhalt springen' })
    expect(link).toHaveAttribute('href', '#inhalt')
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'inhalt')
    expect(main).toHaveAttribute('tabindex', '-1')
  })

  it('setzt den Seitentitel beim Seitenwechsel', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
    fireEvent.click(within(nav).getByRole('button', { name: /Teilnehmende/ }))
    expect(document.title).toBe('Teilnehmende – Arbeitsblattverwaltung')
    expect(within(nav).getByRole('button', { name: /Teilnehmende/ })).toHaveAttribute('aria-current', 'page')
  })

  it('zeigt in der dunklen Navigation einen hellen Fokusrahmen', () => {
    render(<App />)
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' }).closest('aside')).toHaveClass('fokus-hell')
  })
})
