import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'

/**
 * Komponententests: rendern die App in jsdom und klicken sie durch.
 * Simulierte Wartezeiten sind im Testmodus 0 ms (siehe lib/simulation.ts).
 * Die KI-Erstellung ruft das Backend auf – hier mit gemocktem fetch
 * (ausfuehrliche Tests in KiErstellung.spec.tsx).
 */

const emptyLehrplaene = () => new Response(JSON.stringify({ anzahl: 0, lernziele: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  // Die KI-Erstellung fragt beim Oeffnen GET /api/lehrplaene ab – ohne Import: leere Liste
  vi.stubGlobal('fetch', vi.fn(async () => emptyLehrplaene()))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderApp() {
  render(<App />)
}

function navigate(label: string) {
  const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
  fireEvent.click(within(nav).getByRole('button', { name: new RegExp(label) }))
}

describe('Start', () => {
  it('oeffnet direkt die Arbeitsblaetter, ohne Anmeldung', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Arbeitsblätter' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anmelden' })).not.toBeInTheDocument()
    expect(screen.getByText('Celine Hager')).toBeInTheDocument()
  })
})

describe('Navigation', () => {
  it.each(['Dashboard', 'Teilnehmende', 'Berichte', 'Benutzerverwaltung', 'Einstellungen'])('Seite "%s" ist vorhanden, aber leer', (label) => {
    renderApp()
    navigate(label)
    expect(document.querySelector('main')).toBeEmptyDOMElement()
  })

  it('"+ Arbeitsblatt erstellen" fuehrt zur KI-Erstellung', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: '+ Arbeitsblatt erstellen' }))
    expect(screen.getByRole('heading', { level: 1, name: 'KI-Erstellung' })).toBeInTheDocument()
  })
})

describe('Arbeitsblätter', () => {
  it('filtert die Liste ueber die Suche', () => {
    renderApp()
    fireEvent.change(screen.getByLabelText('Arbeitsblätter durchsuchen'), { target: { value: 'anrichten' } })
    expect(screen.getByText('1 Ergebnisse')).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Speisen anrichten' })).toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn nichts gefunden wird', () => {
    renderApp()
    fireEvent.change(screen.getByLabelText('Arbeitsblätter durchsuchen'), { target: { value: 'xyz' } })
    expect(screen.getByText('Keine Arbeitsblätter gefunden.')).toBeInTheDocument()
  })

  it('klappt den Aufbau mit allen vier Niveaustufen auf', () => {
    renderApp()
    const card = screen.getByRole('article', { name: 'Begleitpapiere prüfen' })
    fireEvent.click(within(card).getByRole('button', { name: /Aufbau/ }))
    expect(within(card).getByText('BINNENDIFFERENZIERUNG NACH NIVEAUSTUFEN')).toBeInTheDocument()
    expect(within(card).getAllByText(/^Beispiel:/)).toHaveLength(4)
  })

  it('oeffnet Vorschau und Verlauf im Seitenpanel', () => {
    renderApp()
    const card = screen.getByRole('article', { name: 'Begleitpapiere prüfen' })
    fireEvent.click(within(card).getByRole('button', { name: /Verlauf/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('3 Versionen · Neueste zuerst')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('erzeugt im Anpassen-Panel vier Varianten', async () => {
    renderApp()
    const card = screen.getByRole('article', { name: 'Güter entladen' })
    fireEvent.click(within(card).getByRole('button', { name: /Anpassen/ }))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '✦ 4 Varianten erstellen' }))
    expect(await within(dialog).findByText('✓ 4 Varianten bereit')).toBeInTheDocument()
  })

  it('speichert eine hochgeladene Datei direkt in der Bibliothek', async () => {
    renderApp()
    const file = new File(['Inhalt'], 'Gabelstapler_Sicherheit.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Arbeitsblatt hochladen'), { target: { files: [file] } })

    fireEvent.click(await screen.findByRole('button', { name: /Direkt speichern/ }))

    const list = screen.getByRole('heading', { name: 'Gespeicherte Dokumente' }).closest('section') as HTMLElement
    expect(within(list).getByText('Gabelstapler_Sicherheit.pdf')).toBeInTheDocument()
    expect(within(list).getByText(/Celine Hager/)).toBeInTheDocument()
  })
})

describe('KI-Erstellung', () => {
  it('generiert Varianten fuer die gewaehlten Niveaus und Formate', async () => {
    const worksheet = {
      titel: 'Gabelstapler', berufsfeld: 'Lagerlogistik, Handel & Versand', stufe: 'T', format: 'text', sprache: 'Leichte Sprache',
      lernziel: 'Güter entladen', einleitung: 'Text.', aufgaben: [{ nr: 1, typ: 'offen', anweisung: 'Schreibe.' }], woerterbuch: [], hinweisAnleiter: '',
    }
    const meta = { provider: 'gemini', model: 'mock', mocked: true, durationMs: 1, promptVersion: '1.0.0', attempts: 0, usage: null, validation: { ok: true, hinweise: [] } }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/lehrplaene' ? emptyLehrplaene() : new Response(JSON.stringify({ worksheet, meta }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      ),
    )

    renderApp()
    navigate('KI-Erstellung')

    fireEvent.change(screen.getByLabelText(/THEMA \/ TITEL/), { target: { value: 'Gabelstapler' } })
    fireEvent.click(screen.getByRole('button', { name: /^T\s*Tätigkeit$/ }))

    fireEvent.click(screen.getByRole('button', { name: '✦ 2 Varianten generieren' }))

    const result = await screen.findByRole('region', { name: 'Erstellte Varianten' })
    expect(within(result).getByText('✓ 2 Varianten erstellt')).toBeInTheDocument()
    expect(within(result).getByText(/„Gabelstapler"/)).toBeInTheDocument()
  })

  it('zeigt simulierte Suchtreffer', async () => {
    renderApp()
    navigate('KI-Erstellung')

    fireEvent.change(screen.getByLabelText('Suchbegriff für die Internetsuche'), { target: { value: 'Hygiene' } })
    fireEvent.click(screen.getByRole('button', { name: /Suchen/ }))

    expect(await screen.findByText('5 Ergebnisse für „Hygiene"')).toBeInTheDocument()
  })
})
