import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PARTICIPANTS } from '@/data/participants'
import { todayIso } from '@/lib/date'
import { eingabeAusParticipant, participantAusTeilnehmer, speicherFehlertext, useTeilnehmende, type Teilnehmer } from '@/lib/teilnehmende'
import { ApiError } from '@/lib/api'
import { TeilnehmendePage } from '@/pages/teilnehmende/TeilnehmendePage'

/**
 * FE-12: participant profiles from GET/POST/PUT/DELETE /api/teilnehmende.
 * fetch is mocked; answers follow apps/backend/src/routes/teilnehmende.js.
 */

const LAGER = 'Lagerlogistik, Handel & Versand'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function teilnehmer(teil: Partial<Teilnehmer> = {}): Teilnehmer {
  return {
    kennung: 'IW3-1000',
    stufe: 'A',
    fortschritt: 40,
    zuletztAktiv: '2026-11-10',
    erstelltAm: '2026-11-01T09:00:00.000Z',
    geaendertAm: '2026-11-10T09:00:00.000Z',
    stationen: [
      { berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'aktiv', fortschritt: 40, startDatum: '2026-10-01', endDatum: null, blaetterErledigt: 2 },
    ],
    ...teil,
  }
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

/** fetch mock: GET list answers with `liste`, everything else goes to `weitere` */
function backend(liste: Teilnehmer[], weitere: Handler = () => json({}, 500)) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
    (init?.method ?? 'GET') === 'GET' && url === '/api/teilnehmende' ? json({ eintraege: liste, gesamt: liste.length }) : weitere(url, init),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function Seite() {
  const teilnehmende = useTeilnehmende(true)
  return <TeilnehmendePage teilnehmende={teilnehmende} defaultBerufsbild={LAGER} />
}

const aufrufe = (fetchMock: ReturnType<typeof vi.fn>, method: string) =>
  fetchMock.mock.calls.filter(([, init]) => ((init as RequestInit | undefined)?.method ?? 'GET') === method)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Teilnehmende aus dem Backend (FE-12)', () => {
  it('zeigt die gespeicherten Profile statt der Beispieldaten', async () => {
    backend([teilnehmer(), teilnehmer({ kennung: 'IW3-1001', stufe: 'T' })])
    render(<Seite />)

    expect(screen.getByRole('status')).toHaveTextContent('Teilnehmende werden geladen')
    expect(await screen.findByRole('article', { name: 'Teilnehmer IW3-1000' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Teilnehmer IW3-1001' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Teilnehmer IW3-4421' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('legt ein Profil per POST an', async () => {
    const fetchMock = backend([], (_url, init) => json({ teilnehmer: teilnehmer({ kennung: 'IW3-2000', stufe: 'T', fortschritt: 0 }) }, init?.method === 'POST' ? 201 : 500))
    render(<Seite />)
    await screen.findByText('Noch keine Teilnehmenden angelegt.')

    fireEvent.click(screen.getByRole('button', { name: '+ Teilnehmer hinzufügen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/ANONYME KENNUNG/), { target: { value: 'iw3-2000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))

    expect(await screen.findByRole('article', { name: 'Teilnehmer IW3-2000' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [[url, init]] = aufrufe(fetchMock, 'POST')
    expect(url).toBe('/api/teilnehmende')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      kennung: 'IW3-2000',
      stufe: 'T',
      stationen: [{ berufsfeld: LAGER, stufe: 'T', format: 'text', status: 'aktiv', fortschritt: 0, startDatum: todayIso(), endDatum: null, blaetterErledigt: 0 }],
    })
  })

  it.each([
    [409, { error: 'conflict', message: 'Kennung vergeben' }, 'Die Kennung IW3-2000 gibt es bereits.'],
    [400, { error: 'validation_error', message: 'Ungültige Eingabe: kennung muss eine pseudonyme Kennung wie IW3-4421 sein' }, 'Ungültige Eingabe:'],
    [503, { error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 'Nicht gespeichert: Die Datenbank ist nicht verfügbar.'],
  ])('zeigt bei Status %i eine Meldung im Dialog', async (status, body, meldung) => {
    backend([], () => json(body, status))
    render(<Seite />)
    await screen.findByText('Noch keine Teilnehmenden angelegt.')

    fireEvent.click(screen.getByRole('button', { name: '+ Teilnehmer hinzufügen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/ANONYME KENNUNG/), { target: { value: 'IW3-2000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(meldung)
    expect(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' })).toBeEnabled()
    expect(screen.queryByRole('article', { name: 'Teilnehmer IW3-2000' })).not.toBeInTheDocument()
  })

  it('speichert Änderungen per PUT; die Kennung ist dabei fest', async () => {
    const fetchMock = backend([teilnehmer()], (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { stufe: 'A' | 'F' }
      return json({ teilnehmer: teilnehmer({ stufe: body.stufe, stationen: [{ ...teilnehmer().stationen[0], stufe: 'F' }] }) })
    })
    render(<Seite />)
    const card = await screen.findByRole('article', { name: 'Teilnehmer IW3-1000' })
    fireEvent.click(within(card).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(card).getByRole('button', { name: '✎ Bearbeiten' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/ANONYME KENNUNG/)).toHaveAttribute('readonly')
    fireEvent.click(within(dialog).getByRole('button', { name: 'F' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Änderungen speichern' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [[url, init]] = aufrufe(fetchMock, 'PUT')
    expect(url).toBe('/api/teilnehmende/IW3-1000')
    const body = JSON.parse(String((init as RequestInit).body))
    expect(body.kennung).toBe('IW3-1000')
    expect(body.stufe).toBe('F')
    // Progress and dates of the existing station are kept
    expect(body.stationen[0]).toMatchObject({ berufsfeld: LAGER, stufe: 'F', status: 'aktiv', fortschritt: 40, startDatum: '2026-10-01', blaetterErledigt: 2 })
  })

  it('löscht per DELETE und lässt das Profil stehen, wenn das scheitert', async () => {
    let antwort = json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503)
    const fetchMock = backend([teilnehmer()], () => antwort)
    render(<Seite />)
    const card = await screen.findByRole('article', { name: 'Teilnehmer IW3-1000' })
    fireEvent.click(within(card).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(card).getByRole('button', { name: '✕ Löschen' }))
    fireEvent.click(within(card).getByRole('button', { name: 'Ja, löschen' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('IW3-1000 wurde nicht gelöscht: Die Datenbank ist nicht verfügbar.')
    expect(screen.getByRole('article', { name: 'Teilnehmer IW3-1000' })).toBeInTheDocument()

    // The confirmation stays open, so the user can simply try again
    antwort = new Response(null, { status: 204 })
    fireEvent.click(within(card).getByRole('button', { name: 'Ja, löschen' }))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Teilnehmer IW3-1000' })).not.toBeInTheDocument())
    expect(aufrufe(fetchMock, 'DELETE').map(([url]) => url)).toEqual(['/api/teilnehmende/IW3-1000', '/api/teilnehmende/IW3-1000'])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('zeigt ohne Backend die Beispieldaten mit Hinweis und lädt auf Knopfdruck neu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
      .mockResolvedValueOnce(json({ eintraege: [teilnehmer()], gesamt: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<Seite />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Teilnehmende konnten nicht geladen werden')
    expect(screen.getByRole('alert')).toHaveTextContent('Änderungen werden nicht gespeichert.')
    expect(screen.getAllByRole('article')).toHaveLength(PARTICIPANTS.length)

    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }))
    expect(await screen.findByRole('article', { name: 'Teilnehmer IW3-1000' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('useTeilnehmende', () => {
  it('ruft das Backend erst auf, wenn eine Seite die Profile braucht', async () => {
    const fetchMock = backend([teilnehmer()])
    const { result, rerender } = renderHook(({ benoetigt }) => useTeilnehmende(benoetigt), { initialProps: { benoetigt: false } })
    expect(fetchMock).not.toHaveBeenCalled()

    rerender({ benoetigt: true })
    await waitFor(() => expect(result.current.quelle.art).toBe('backend'))
    expect(result.current.participants.map((p) => p.id)).toEqual(['IW3-1000'])

    // Leaving the page again does not reload or reset the list
    rerender({ benoetigt: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.participants).toHaveLength(1)
  })
})

describe('Teilnehmende (Hilfsfunktionen)', () => {
  it('übersetzt zwischen API und Frontend in beide Richtungen', () => {
    const t = teilnehmer({
      stationen: [
        { berufsfeld: LAGER, stufe: 'T', format: 'piktogramm', status: 'abgeschlossen', fortschritt: 100, startDatum: '2026-06-01', endDatum: '2026-07-12', blaetterErledigt: 8 },
        { berufsfeld: 'Metalltechnik & Montage', stufe: 'A', format: 'mathefrei', status: 'ausstehend', fortschritt: 0, startDatum: null, endDatum: null, blaetterErledigt: 0 },
      ],
    })
    const p = participantAusTeilnehmer(t)
    expect(p).toMatchObject({ id: 'IW3-1000', level: 'A', progress: 40, lastActive: '2026-11-10' })
    expect(p.berufsbilder[0]).toEqual({ berufsbild: LAGER, level: 'T', format: 'piktogramm', progress: 100, status: 'abgeschlossen', startDate: '2026-06-01', endDate: '2026-07-12', worksheetsDone: 8 })
    expect(p.berufsbilder[1]).not.toHaveProperty('endDate')
    expect(p.berufsbilder[1].startDate).toBe('')

    expect(eingabeAusParticipant(p)).toEqual({ kennung: t.kennung, stufe: t.stufe, stationen: t.stationen })
  })

  it('nimmt das Änderungsdatum, wenn das Backend kein „zuletzt aktiv“ kennt', () => {
    expect(participantAusTeilnehmer(teilnehmer({ zuletztAktiv: null })).lastActive).toBe('2026-11-10')
  })

  it('schickt nie Namen oder andere Felder mit', () => {
    expect(Object.keys(eingabeAusParticipant(PARTICIPANTS[0])).sort()).toEqual(['kennung', 'stationen', 'stufe'])
  })

  it('formuliert Fehlermeldungen für die Lehrkraft', () => {
    expect(speicherFehlertext(new ApiError('x', 404, 'not_found'), 'IW3-1')).toContain('gibt es nicht mehr')
    expect(speicherFehlertext(new Error('kaputt'), 'IW3-1')).toBe('Nicht gespeichert: unbekannter Fehler.')
  })
})
