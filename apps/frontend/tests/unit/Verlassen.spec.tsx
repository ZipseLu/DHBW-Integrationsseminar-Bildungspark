import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { verlustText } from '@/components/VerlassenDialog'

/**
 * FE-27: leaving the KI-Erstellung with unsaved variants asks first,
 * so generated worksheets are not lost by accident.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const worksheet = {
  titel: 'Gabelstapler', berufsfeld: 'Lagerlogistik, Handel & Versand', stufe: 'A', format: 'text', sprache: 'Leichte Sprache',
  lernziel: 'Güter entladen', einleitung: 'Text.', aufgaben: [{ nr: 1, typ: 'offen', anweisung: 'Schreibe.' }], woerterbuch: [], hinweisAnleiter: '',
}
const meta = { provider: 'gemini', model: 'mock', mocked: true, durationMs: 1, promptVersion: '1.0.3', attempts: 1, usage: null, validation: { ok: true, hinweise: [] } }

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u === '/api/ai/arbeitsblatt') return json({ worksheet, meta })
      if (u === '/api/arbeitsblaetter' && init?.method === 'POST') {
        return json({ arbeitsblatt: { id: 'neu-1', titel: worksheet.titel, inhalt: worksheet, status: 'entwurf', version: 1 } }, 201)
      }
      if (u === '/api/lehrplaene') return json({ anzahl: 0, lernziele: [] })
      return json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503)
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function navigate(label: string) {
  const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
  fireEvent.click(within(nav).getByRole('button', { name: new RegExp(label) }))
}

async function eineVarianteErstellen() {
  render(<App />)
  navigate('KI-Erstellung')
  fireEvent.click(screen.getByRole('button', { name: '✦ 1 Variante generieren' }))
  const bereich = await screen.findByRole('region', { name: 'Erstellte Varianten' })
  await within(bereich).findByText('✓ 1 Variante erstellt')
  return bereich
}

describe('Warnung vor Verlust nicht gespeicherter Varianten (FE-27)', () => {
  it('fragt vor dem Seitenwechsel und bleibt auf Wunsch auf der Seite', async () => {
    await eineVarianteErstellen()
    navigate('Dashboard')

    const dialog = screen.getByRole('dialog', { name: 'Nicht gespeicherte Varianten' })
    expect(dialog).toHaveTextContent('1 Variante ist noch nicht gespeichert.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zurück zu den Varianten' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'KI-Erstellung' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Erstellte Varianten' })).toBeInTheDocument()
  })

  it('wechselt nach „Trotzdem wechseln“ die Seite', async () => {
    await eineVarianteErstellen()
    navigate('Dashboard')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trotzdem wechseln' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Übersicht' })).toBeInTheDocument()

    // Back on the KI page there is nothing left to lose, so no question
    navigate('KI-Erstellung')
    navigate('Dashboard')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('fragt nicht, wenn alle Varianten gespeichert sind', async () => {
    const bereich = await eineVarianteErstellen()
    fireEvent.click(within(bereich).getByRole('button', { name: '💾 Alle zur Bibliothek hinzufügen' }))
    await within(bereich).findByText('✓ Alle in der Bibliothek')

    navigate('Dashboard')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Übersicht' })).toBeInTheDocument()
  })

  it('lässt den Browser beim Schließen des Tabs warnen', async () => {
    await eineVarianteErstellen()
    const event = new window.Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('formuliert die Warnung je nach Stand', () => {
    expect(verlustText({ ungespeichert: 1, laeuft: false })).toBe('1 Variante ist noch nicht gespeichert. Wenn du die Seite wechselst, geht sie verloren.')
    expect(verlustText({ ungespeichert: 3, laeuft: false })).toBe('3 Varianten sind noch nicht gespeichert. Wenn du die Seite wechselst, gehen sie verloren.')
    expect(verlustText({ ungespeichert: 0, laeuft: true })).toContain('erstellt gerade noch Varianten')
  })
})
