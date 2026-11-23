import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { DEFAULT_SETTINGS, loadSettings } from '@/lib/settings'

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
