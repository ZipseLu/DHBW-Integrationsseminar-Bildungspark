import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PARTICIPANTS } from '@/data/participants'
import type { GespeichertesArbeitsblatt } from '@/lib/api'
import { dashboardAusGespeicherten } from '@/lib/dashboardDaten'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'

/** FE-06: Dashboard mit Zahlen aus GET /api/arbeitsblaetter */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let nr = 0
function blatt(teil: Partial<GespeichertesArbeitsblatt> = {}): GespeichertesArbeitsblatt {
  nr += 1
  return {
    id: `00000000-0000-4000-8000-${String(nr).padStart(12, '0')}`,
    titel: `Blatt ${nr}`,
    berufsfeld: 'Lagerlogistik, Handel & Versand',
    baustein: 1,
    ausbildungsbaustein: 'Wareneingang',
    lernziel: 'Güter entladen',
    stufe: 'A',
    format: 'text',
    sprache: 'Leichte Sprache',
    status: 'entwurf',
    kiGeneriert: true,
    favorit: false,
    elternId: null,
    version: 1,
    erstelltVon: 'C. Hager',
    erstelltAm: '2026-10-20T09:00:00.000Z',
    geaendertAm: '2026-10-20T09:00:00.000Z',
    ...teil,
  }
}

const seite = (eintraege: GespeichertesArbeitsblatt[]) => ({ eintraege, seite: 1, proSeite: 100, gesamt: eintraege.length, seiten: 1 })

const renderDashboard = () => render(<DashboardPage participants={PARTICIPANTS} onNavigate={() => {}} />)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Dashboard (FE-06)', () => {
  it('zeigt Kennzahlen, Stufen und die zuletzt bearbeiteten Blätter aus dem Backend', async () => {
    const blaetter = [
      blatt({ titel: 'Lieferschein prüfen', stufe: 'T', status: 'freigegeben', geaendertAm: '2026-10-29T10:00:00.000Z' }),
      blatt({ titel: 'Hände waschen', stufe: 'T', berufsfeld: 'Gastronomie & Hauswirtschaft', kiGeneriert: false }),
      blatt({ titel: 'Bauteile montieren', stufe: 'B', berufsfeld: 'Metalltechnik & Montage', geaendertAm: '2026-10-28T10:00:00.000Z' }),
    ]
    vi.stubGlobal('fetch', vi.fn(async () => json(seite(blaetter))))
    renderDashboard()

    const zuletzt = await screen.findByRole('region', { name: 'Zuletzt bearbeitet' })
    const titel = within(zuletzt).getAllByText(/Lieferschein prüfen|Hände waschen|Bauteile montieren/).map((el) => el.textContent)
    expect(titel).toEqual(['Lieferschein prüfen', 'Bauteile montieren', 'Hände waschen'])
    expect(within(zuletzt).getByText('Freigegeben')).toBeInTheDocument()

    expect(screen.getByText('3 Berufsfelder')).toBeInTheDocument()
    expect(screen.getByText('von 3 · 1 freigegeben')).toBeInTheDocument()

    const verteilung = screen.getByRole('region', { name: 'Niveaustufen-Verteilung' })
    expect(within(verteilung).getByText('2 AB')).toBeInTheDocument()
    expect(within(verteilung).getByText('1 AB')).toBeInTheDocument()
    expect(within(verteilung).getAllByText('0 AB')).toHaveLength(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn noch nichts gespeichert ist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(seite([]))))
    renderDashboard()
    expect(await screen.findByText(/Noch keine Arbeitsblätter gespeichert/)).toBeInTheDocument()
    expect(screen.getByText('0 Berufsfelder')).toBeInTheDocument()
  })

  it('fällt bei Fehler auf Beispieldaten zurück und lädt auf Knopfdruck neu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
      .mockResolvedValueOnce(json(seite([blatt({ titel: 'Neu aus dem Backend' })])))
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('Zahlen aus Beispieldaten')
    expect(screen.getByRole('alert')).toHaveTextContent('Die Datenbank ist nicht verfügbar.')

    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }))
    expect(await screen.findByText('Neu aus dem Backend')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('dashboardAusGespeicherten', () => {
  it('zählt Stufen, KI-Blätter und Freigaben', () => {
    const daten = dashboardAusGespeicherten([blatt({ stufe: 'F', status: 'freigegeben' }), blatt({ stufe: 'F', kiGeneriert: false }), blatt({ stufe: 'T' })])
    expect(daten).toMatchObject({ gesamt: 3, berufsfelder: 1, ki: 2, freigegeben: 1, proStufe: { T: 1, A: 0, F: 2, B: 0 } })
    expect(daten.zuletzt).toHaveLength(3)
  })
})
