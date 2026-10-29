import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_USER } from '@/data/users'
import type { GespeichertesArbeitsblatt } from '@/lib/api'
import { historyAusVerlauf, ladeGespeicherteArbeitsblaetter, worksheetAusGespeichertem } from '@/lib/gespeicherteArbeitsblaetter'
import { ArbeitsblaetterPage } from '@/pages/arbeitsblaetter/ArbeitsblaetterPage'

/**
 * FE-01: Die Arbeitsblätter-Seite lädt gespeicherte Blätter aus GET /api/arbeitsblaetter.
 * fetch ist gemockt; die Antworten entsprechen apps/backend/src/routes/arbeitsblaetter.js.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function blatt(teil: Partial<GespeichertesArbeitsblatt> = {}): GespeichertesArbeitsblatt {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    titel: 'Lieferschein prüfen',
    berufsfeld: 'Lagerlogistik, Handel & Versand',
    baustein: 1,
    ausbildungsbaustein: 'Wareneingang',
    lernziel: 'Güter entladen',
    stufe: 'A',
    format: 'piktogramm',
    sprache: 'Leichte Sprache',
    status: 'entwurf',
    kiGeneriert: true,
    favorit: false,
    elternId: null,
    version: 2,
    erstelltVon: 'C. Hager',
    erstelltAm: '2026-10-28T09:00:00.000Z',
    geaendertAm: '2026-10-29T09:00:00.000Z',
    ...teil,
  }
}

const seite = (eintraege: GespeichertesArbeitsblatt[], nr = 1, seiten = 1) => ({ eintraege, seite: nr, proSeite: 100, gesamt: eintraege.length, seiten })

function renderPage() {
  render(<ArbeitsblaetterPage user={CURRENT_USER} savedDocs={[]} onSavedDocsChange={() => {}} favoriteIds={[]} onFavoriteIdsChange={() => {}} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Arbeitsblätter aus dem Backend', () => {
  it('zeigt gespeicherte Blätter statt der Beispieldaten', async () => {
    const fetchMock = vi.fn(async (_url: string) => json(seite([blatt(), blatt({ id: '22222222-2222-4222-8222-222222222222', titel: 'Hände waschen', berufsfeld: 'Gastronomie & Hauswirtschaft', stufe: 'T', status: 'freigegeben' })])))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Arbeitsblätter werden geladen')
    const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })
    expect(within(card).getByText('Entwurf')).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Hände waschen' })).toBeInTheDocument()
    expect(screen.getByText('2 Ergebnisse')).toBeInTheDocument()
    // Beispieldaten erscheinen nicht
    expect(screen.queryByRole('article', { name: 'Begleitpapiere prüfen' })).not.toBeInTheDocument()
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/arbeitsblaetter?')
  })

  it('filtert gespeicherte Blätter nach Berufsbild', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(seite([blatt(), blatt({ id: '22222222-2222-4222-8222-222222222222', titel: 'Hände waschen', berufsfeld: 'Gastronomie & Hauswirtschaft' })]))))
    renderPage()
    await screen.findByRole('article', { name: 'Lieferschein prüfen' })

    fireEvent.change(screen.getByLabelText(/Berufsbild/i), { target: { value: 'Gastronomie & Hauswirtschaft' } })
    expect(screen.getByRole('article', { name: 'Hände waschen' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Lieferschein prüfen' })).not.toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn noch nichts gespeichert ist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(seite([]))))
    renderPage()
    expect(await screen.findByText(/Noch keine Arbeitsblätter gespeichert/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('fällt bei Fehler auf Beispieldaten zurück und lädt auf Knopfdruck neu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
      .mockResolvedValueOnce(json(seite([blatt()])))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Die Datenbank ist nicht verfügbar.')
    expect(screen.getByRole('article', { name: 'Begleitpapiere prüfen' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }))
    expect(await screen.findByRole('article', { name: 'Lieferschein prüfen' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('speichert den Favoriten per PATCH', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'PATCH' ? json({ arbeitsblatt: { ...blatt({ favorit: true }), inhalt: {} } }) : json(seite([blatt()])),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })

    fireEvent.click(within(card).getByRole('button', { name: 'Als Favorit markieren' }))
    expect(within(card).getByRole('button', { name: 'Als Favorit markieren' })).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/arbeitsblaetter/11111111-1111-4111-8111-111111111111')
    expect(JSON.parse(String(init?.body))).toEqual({ favorit: true, autor: 'Celine Hager' })
  })

  it('setzt den Favoriten zurück, wenn das Speichern scheitert', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'PATCH' ? json({ message: 'Datenbank weg' }, 503) : json(seite([blatt()])))),
    )
    renderPage()
    const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })

    fireEvent.click(within(card).getByRole('button', { name: 'Als Favorit markieren' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Favorit konnte nicht gespeichert werden: Datenbank weg')
    expect(within(card).getByRole('button', { name: 'Als Favorit markieren' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('lädt den Verlauf aus dem Backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).endsWith('/verlauf')
          ? json({
              eintraege: [
                { version: 2, aktion: 'freigegeben', autor: 'T. Neumann', notiz: 'Geprüft', kiMeta: null, erstelltAm: '2026-10-29T09:00:00.000Z' },
                { version: 1, aktion: 'erstellt', autor: 'C. Hager', notiz: null, kiMeta: null, erstelltAm: '2026-10-28T09:00:00.000Z' },
              ],
            })
          : json(seite([blatt()])),
      ),
    )
    renderPage()
    const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })
    fireEvent.click(within(card).getByRole('button', { name: /Verlauf/ }))

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('2 Versionen · Neueste zuerst')).toBeInTheDocument()
    expect(within(dialog).getByText('T. Neumann')).toBeInTheDocument()
    expect(within(dialog).getByText('Geprüft')).toBeInTheDocument()
  })
})

describe('gespeicherteArbeitsblaetter (Hilfsfunktionen)', () => {
  it('wandelt ein gespeichertes Blatt in eine Karte um', () => {
    const w = worksheetAusGespeichertem(blatt({ baustein: null, ausbildungsbaustein: null }), 7)
    expect(w).toMatchObject({
      id: 7,
      title: 'Lieferschein prüfen',
      berufsbild: 'Lagerlogistik, Handel & Versand',
      baustein: 0,
      ausbildungsbaustein: '',
      niveaus: ['A'],
      format: 'piktogramm',
      aiGenerated: true,
      backend: { id: '11111111-1111-4111-8111-111111111111', status: 'entwurf', version: 2, favorit: false },
    })
    expect(w.abschnitt.titel).toBe('Güter entladen')
    expect(w.abschnitt.niveaus.A.kompetenz).toContain('Arbeitsplatzorientiert')
  })

  it('lädt alle Seiten', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(seite([blatt()], 1, 2)))
      .mockResolvedValueOnce(json(seite([blatt({ id: '33333333-3333-4333-8333-333333333333' })], 2, 2)))
    vi.stubGlobal('fetch', fetchMock)
    const alle = await ladeGespeicherteArbeitsblaetter()
    expect(alle).toHaveLength(2)
    expect(String(fetchMock.mock.calls[1][0])).toContain('seite=2')
  })

  it('meldet eine unerwartete Antwort als Fehler', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ anzahl: 0 })))
    await expect(ladeGespeicherteArbeitsblaetter()).rejects.toThrow('unerwartete Antwort')
  })

  it('übernimmt Autor, Aktion und Notiz in den Verlauf', () => {
    expect(historyAusVerlauf([{ version: 1, aktion: 'erstellt', autor: null, notiz: null, kiMeta: null, erstelltAm: '2026-10-28T09:00:00.000Z' }])).toEqual([
      { version: 1, date: '2026-10-28', author: 'unbekannt', action: 'erstellt', note: '' },
    ])
  })
})
