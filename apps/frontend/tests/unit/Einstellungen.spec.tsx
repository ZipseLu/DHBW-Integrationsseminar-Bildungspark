import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { DEFAULT_SETTINGS, loadSettings, mischeEinstellungen } from '@/lib/settings'

/**
 * FE-20: Einstellungen kommen aus dem Backend (pro Konto), localStorage bleibt
 * Cache und Fallback. Der fetch wird hier gezielt nach Route und Methode
 * beantwortet, damit Laden und Speichern getrennt geprüft werden können.
 */

type Put = { url: string; body: { einstellungen?: Record<string, unknown> } }

function antwort(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function stubBackend(remoteEinstellungen: unknown, status = 200): Put[] {
  const puts: Put[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('/api/einstellungen')) {
        if (init?.method === 'PUT') {
          puts.push({ url, body: JSON.parse(String(init.body)) as Put['body'] })
          return antwort({ einstellungen: init.body })
        }
        return antwort(remoteEinstellungen, status)
      }
      // Lehrpläne und andere Seiten brauchen im Test keine echten Daten
      return antwort({ anzahl: 0, lernziele: [] })
    }),
  )
  return puts
}

function einstellungenOeffnen() {
  render(<App />)
  const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
  fireEvent.click(within(nav).getByRole('button', { name: /Einstellungen/ }))
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('style')
})

describe('Einstellungen pro Konto (FE-20)', () => {
  it('lädt die Einstellungen des Kontos beim Start und wendet sie an', async () => {
    stubBackend({ einstellungen: { ...DEFAULT_SETTINGS, darkMode: true, accentColor: '#2A6B4B' } })

    render(<App />)

    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--background')).toBe('#0E1924'))
    expect(loadSettings()).toMatchObject({ darkMode: true, accentColor: '#2A6B4B' })
  })

  it('speichert Änderungen per PUT mit der E-Mail-Adresse des Kontos', async () => {
    const puts = stubBackend({ einstellungen: null })
    einstellungenOeffnen()

    fireEvent.click(screen.getByRole('switch', { name: 'Dunkelmodus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Einstellungen speichern' }))

    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0].url).toContain('konto=c.hager%40bildungspark.example')
    expect(puts[0].body.einstellungen).toMatchObject({ darkMode: true })
    expect(loadSettings().darkMode).toBe(true)
  })

  it('behält den lokalen Stand, wenn das Backend keine Einstellungen liefert', async () => {
    window.localStorage.setItem('bildungspark.einstellungen', JSON.stringify({ ...DEFAULT_SETTINGS, accentColor: '#C42A2A' }))
    stubBackend({ error: 'db_unavailable' }, 503)

    render(<App />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    expect(loadSettings().accentColor).toBe('#C42A2A')
  })
})

describe('Weitere Einstellungen (FE-42)', () => {
  function kiErstellungOeffnen() {
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
    fireEvent.click(within(nav).getByRole('button', { name: /KI-Erstellung/ }))
  }

  const gedrueckt = (gruppe: string) =>
    within(screen.getByRole('group', { name: gruppe }))
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent)

  it('füllt die KI-Erstellung mit den gespeicherten Vorgaben vor', () => {
    stubBackend({ einstellungen: null })
    einstellungenOeffnen()
    const ki = screen.getByRole('region', { name: 'KI-Erstellung' })

    // Level T on, A off; format Piktogramm on, Text off; Standardsprache
    fireEvent.click(within(within(ki).getByRole('group', { name: 'Niveaustufen' })).getByRole('button', { name: /^T/ }))
    fireEvent.click(within(within(ki).getByRole('group', { name: 'Niveaustufen' })).getByRole('button', { name: /^A/ }))
    fireEvent.click(within(within(ki).getByRole('group', { name: 'Barrierefreiheits-Formate' })).getByRole('button', { name: /Mit Piktogrammen/ }))
    fireEvent.click(within(within(ki).getByRole('group', { name: 'Barrierefreiheits-Formate' })).getByRole('button', { name: /Standard-Text/ }))
    fireEvent.click(within(within(ki).getByRole('group', { name: 'Sprachformat' })).getByRole('button', { name: /Standardsprache/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Einstellungen speichern' }))
    expect(loadSettings()).toMatchObject({ kiStufen: ['T'], kiFormate: ['piktogramm'], kiSprache: 'Standardsprache' })

    kiErstellungOeffnen()
    expect(gedrueckt('Niveaustufen').map((t) => t?.charAt(0))).toEqual(['T'])
    expect(gedrueckt('Barrierefreiheits-Formate')).toHaveLength(1)
    expect(gedrueckt('Barrierefreiheits-Formate')[0]).toMatch(/Mit Piktogrammen/)
    expect(gedrueckt('Sprachformat')[0]).toMatch(/Standardsprache/)
  })

  it('vergrößert die Schrift der ganzen Oberfläche', () => {
    stubBackend({ einstellungen: null })
    einstellungenOeffnen()
    fireEvent.click(within(screen.getByRole('group', { name: 'Schriftgröße' })).getByRole('button', { name: 'Sehr groß' }))
    fireEvent.click(screen.getByRole('button', { name: 'Einstellungen speichern' }))

    expect(document.documentElement.style.fontSize).toBe('20px')
    expect(loadSettings().schriftgroesse).toBe('sehr-gross')
  })

  it('setzt nach Rückfrage alles auf Standard zurück', () => {
    window.localStorage.setItem('bildungspark.einstellungen', JSON.stringify({ ...DEFAULT_SETTINGS, darkMode: true, schriftgroesse: 'gross' }))
    stubBackend({ einstellungen: null })
    einstellungenOeffnen()

    fireEvent.click(screen.getByRole('button', { name: 'Auf Standard zurücksetzen' }))
    const frage = screen.getByRole('alertdialog', { name: 'Einstellungen zurücksetzen' })
    fireEvent.click(within(frage).getByRole('button', { name: 'Abbrechen' }))
    expect(loadSettings().darkMode).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Auf Standard zurücksetzen' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Zurücksetzen' }))

    expect(screen.getByText('✓ Auf Standard zurückgesetzt')).toBeInTheDocument()
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(document.documentElement.style.fontSize).toBe('')
    expect(screen.getByRole('switch', { name: 'Dunkelmodus' })).toHaveAttribute('aria-checked', 'false')
  })

  it('ersetzt ungültige gespeicherte Vorgaben durch die Standardwerte', () => {
    const kaputt = { kiStufen: ['X'], kiFormate: [], kiSprache: 'Englisch', schriftgroesse: 'riesig' }
    expect(mischeEinstellungen(kaputt as never)).toMatchObject({ kiStufen: ['A'], kiFormate: ['text'], kiSprache: 'Leichte Sprache', schriftgroesse: 'normal' })
  })
})
