import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type GespeichertesArbeitsblatt, type Lernstand, type Zuordnung } from '@/lib/api'
import { zuordnungFehlertext } from '@/lib/lernstand'
import { useTeilnehmende, type Teilnehmer } from '@/lib/teilnehmende'
import { TeilnehmendePage } from '@/pages/teilnehmende/TeilnehmendePage'

/**
 * FE-11: learning progress and assigning worksheets via BE-04
 * (/api/teilnehmende/:kennung/zuordnungen, …/lernstand). fetch is mocked;
 * answers follow docs/zuordnungen-lernstand.md.
 */

const LAGER = 'Lagerlogistik, Handel & Versand'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const TN: Teilnehmer = {
  kennung: 'IW3-4421',
  stufe: 'A',
  fortschritt: 50,
  zuletztAktiv: '2026-11-12',
  erstelltAm: '2026-11-01T09:00:00.000Z',
  geaendertAm: '2026-11-12T09:00:00.000Z',
  stationen: [{ berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'aktiv', fortschritt: 0, startDatum: '2026-10-01', endDatum: null, blaetterErledigt: 0 }],
}

function blatt(id: string, titel: string, teil: Partial<GespeichertesArbeitsblatt> = {}): GespeichertesArbeitsblatt {
  return {
    id, titel, berufsfeld: LAGER, baustein: 1, ausbildungsbaustein: 'Wareneingang', lernziel: titel, stufe: 'A', format: 'text',
    sprache: 'Leichte Sprache', status: 'freigegeben', kiGeneriert: true, favorit: false, elternId: null, version: 1,
    erstelltVon: 'C. Hager', erstelltAm: '2026-11-01T09:00:00.000Z', geaendertAm: '2026-11-01T09:00:00.000Z', ...teil,
  }
}

function zuordnung(id: string, b: GespeichertesArbeitsblatt, status: 'offen' | 'erledigt'): Zuordnung {
  const { id: blattId, titel, berufsfeld, baustein, ausbildungsbaustein, lernziel, stufe, format, sprache, status: blattStatus } = b
  return {
    id, kennung: TN.kennung, status, zugeordnetAm: '2026-11-10T09:00:00.000Z', erledigtAm: status === 'erledigt' ? '2026-11-11T09:00:00.000Z' : null,
    zugeordnetVon: 'C. Hager', arbeitsblatt: { id: blattId, titel, berufsfeld, baustein, ausbildungsbaustein, lernziel, stufe, format, sprache, status: blattStatus },
  }
}

const LKW = blatt('b1', 'Einen LKW melden')
const ETIKETT = blatt('b2', 'Etiketten kleben')
const REGAL = blatt('b3', 'Ins Regal einräumen')

function lernstand(offen: Zuordnung[], erledigt: Zuordnung[]): Lernstand {
  const anzahl = { erledigt: erledigt.length, offen: offen.length, gesamt: offen.length + erledigt.length }
  return {
    kennung: TN.kennung,
    anzahl,
    alsNaechstes: offen[0] ?? null,
    berufsfelder: [{
      berufsfeld: LAGER, station: { position: 1, status: 'aktiv', stufe: 'A', format: 'text' },
      fortschritt: anzahl.gesamt ? Math.round((erledigt.length / anzahl.gesamt) * 100) : 0,
      anzahl, alsNaechstes: offen[0] ?? null, offen, erledigt,
    }],
  }
}

/** Small in-memory backend: assignments of one person */
function backend(start: Zuordnung[], { postFehler }: { postFehler?: Response } = {}) {
  let liste = [...start]
  const stand = () => lernstand(liste.filter((z) => z.status === 'offen'), liste.filter((z) => z.status === 'erledigt'))
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url === '/api/teilnehmende') return json({ eintraege: [TN], gesamt: 1 })
    if (url === '/api/teilnehmende/lernstand') return json({ eintraege: [stand()], gesamt: 1 })
    if (url === `/api/teilnehmende/${TN.kennung}/lernstand`) return json({ lernstand: stand() })
    if (url.startsWith('/api/arbeitsblaetter?')) return json({ eintraege: [LKW, ETIKETT, REGAL], seite: 1, proSeite: 100, gesamt: 3, seiten: 1 })
    const z = url.match(/zuordnungen\/([^/?]+)$/)?.[1]
    if (method === 'POST') {
      if (postFehler) return postFehler
      const { arbeitsblattId } = JSON.parse(String(init?.body)) as { arbeitsblattId: string }
      const neu = zuordnung(`z${liste.length + 1}`, [LKW, ETIKETT, REGAL].find((b) => b.id === arbeitsblattId)!, 'offen')
      liste.push(neu)
      return json({ zuordnung: neu }, 201)
    }
    if (method === 'PATCH' && z) {
      const { status } = JSON.parse(String(init?.body)) as { status: 'offen' | 'erledigt' }
      liste = liste.map((x) => (x.id === z ? { ...x, status, erledigtAm: status === 'erledigt' ? '2026-11-14T09:00:00.000Z' : null } : x))
      return json({ zuordnung: liste.find((x) => x.id === z) })
    }
    if (method === 'DELETE' && z) {
      liste = liste.filter((x) => x.id !== z)
      return new Response(null, { status: 204 })
    }
    return json({ error: 'not_found', message: url }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function Seite() {
  const teilnehmende = useTeilnehmende(true)
  return <TeilnehmendePage teilnehmende={teilnehmende} defaultBerufsbild={LAGER} />
}

const aufrufe = (fetchMock: ReturnType<typeof vi.fn>, method: string) =>
  fetchMock.mock.calls.filter(([, init]) => ((init as RequestInit | undefined)?.method ?? 'GET') === method).map(([url, init]) => [String(url), (init as RequestInit).body])

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Lernstand und Zuordnung (FE-11)', () => {
  it('zeigt erledigte und offene Blätter mit „als Nächstes“', async () => {
    backend([zuordnung('z1', LKW, 'erledigt'), zuordnung('z2', ETIKETT, 'offen')])
    render(<Seite />)

    const liste = await screen.findByRole('region', { name: `Arbeitsblätter ${LAGER}` })
    expect(within(liste).getByText('1 von 2 erledigt · 50 %')).toBeInTheDocument()
    expect(within(liste).getByText('● als Nächstes')).toBeInTheDocument()
    expect(within(liste).getByRole('button', { name: 'Etiketten kleben als erledigt markieren' })).toBeInTheDocument()
    expect(within(liste).getByRole('button', { name: 'Einen LKW melden wieder öffnen' })).toBeInTheDocument()
    const karte = screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })
    expect(within(karte).getByText(/als Nächstes: Etiketten kleben/)).toBeInTheDocument()
  })

  it('hakt ein Blatt ab (PATCH) und lädt den Lernstand der Person neu', async () => {
    const fetchMock = backend([zuordnung('z1', LKW, 'offen')])
    render(<Seite />)
    fireEvent.click(await screen.findByRole('button', { name: 'Einen LKW melden als erledigt markieren' }))

    expect(await screen.findByText('1 von 1 erledigt · 100 %')).toBeInTheDocument()
    expect(aufrufe(fetchMock, 'PATCH')).toEqual([[`/api/teilnehmende/IW3-4421/zuordnungen/z1`, JSON.stringify({ status: 'erledigt' })]])
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/teilnehmende/IW3-4421/lernstand')).toBe(true)
  })

  it('entfernt eine Zuordnung (DELETE)', async () => {
    const fetchMock = backend([zuordnung('z1', LKW, 'offen')])
    render(<Seite />)
    fireEvent.click(await screen.findByRole('button', { name: 'Zuordnung Einen LKW melden entfernen' }))

    expect(await screen.findByText(/Noch keine Arbeitsblätter zugeordnet/)).toBeInTheDocument()
    expect(aufrufe(fetchMock, 'DELETE').map(([url]) => url)).toEqual(['/api/teilnehmende/IW3-4421/zuordnungen/z1'])
  })

  it('weist ein gespeichertes Blatt des aktiven Berufsfelds zu (POST)', async () => {
    const fetchMock = backend([zuordnung('z1', LKW, 'erledigt')])
    render(<Seite />)
    // Wait for the learning progress, so the dialog knows which worksheets are already assigned
    await screen.findByText('1 von 1 erledigt · 100 %')
    const karte = screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })
    fireEvent.click(within(karte).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(karte).getByRole('button', { name: '✦ Arbeitsblatt zuweisen' }))

    const dialog = screen.getByRole('dialog')
    const schon = await within(dialog).findByRole('option', { name: /Einen LKW melden/ })
    expect(schon).toBeDisabled()
    const query = String(fetchMock.mock.calls.find(([url]) => String(url).startsWith('/api/arbeitsblaetter?'))?.[0])
    expect(new URLSearchParams(query.split('?')[1]).get('berufsfeld')).toBe(LAGER)

    fireEvent.click(within(dialog).getByRole('option', { name: /Etiketten kleben/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zuweisen' }))

    expect(await screen.findByText('Arbeitsblatt „Etiketten kleben“ wurde IW3-4421 zugewiesen.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(aufrufe(fetchMock, 'POST')).toEqual([['/api/teilnehmende/IW3-4421/zuordnungen', JSON.stringify({ arbeitsblattId: 'b2' })]])
    expect(await screen.findByText('1 von 2 erledigt · 50 %')).toBeInTheDocument()
  })

  it('zeigt Fehler beim Zuweisen im Dialog', async () => {
    backend([], { postFehler: json({ error: 'conflict', code: 'bereits_zugeordnet', message: 'schon zugeordnet' }, 409) })
    render(<Seite />)
    await screen.findByText(/Noch keine Arbeitsblätter zugeordnet/)
    const karte = screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })
    fireEvent.click(within(karte).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(karte).getByRole('button', { name: '✦ Arbeitsblatt zuweisen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('option', { name: /Etiketten kleben/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zuweisen' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Dieses Arbeitsblatt ist der Person schon zugeordnet.')
  })

  it('speichert Zuweisungen auch, solange der Lernstand noch lädt', async () => {
    const fetchMock = backend([])
    render(<Seite />)
    const karte = await screen.findByRole('article', { name: 'Teilnehmer IW3-4421' })
    fireEvent.click(within(karte).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(karte).getByRole('button', { name: '✦ Arbeitsblatt zuweisen' }))
    // Always the dialog with the saved worksheets, never the sample-data dialog
    const dialog = screen.getByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('option', { name: /Etiketten kleben/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zuweisen' }))
    expect(await screen.findByText('Arbeitsblatt „Etiketten kleben“ wurde IW3-4421 zugewiesen.')).toBeInTheDocument()
    expect(aufrufe(fetchMock, 'POST')).toHaveLength(1)
  })

  it('zeigt einen Hinweis, wenn der Lernstand nicht geladen werden kann', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/teilnehmende' ? json({ eintraege: [TN], gesamt: 1 }) : json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503),
      ),
    )
    render(<Seite />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Der Lernstand konnte nicht geladen werden: Die Datenbank ist nicht verfügbar.')
    await waitFor(() => expect(screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })).toBeInTheDocument())
  })
})

describe('zuordnungFehlertext', () => {
  it('nennt die Gründe des Backends verständlich', () => {
    expect(zuordnungFehlertext(new ApiError('x', 409, 'conflict', undefined, 'blatt_archiviert'))).toBe('Archivierte Arbeitsblätter können nicht zugeordnet werden.')
    expect(zuordnungFehlertext(new ApiError('x', 409, 'conflict', undefined, 'bereits_zugeordnet'))).toBe('Dieses Arbeitsblatt ist der Person schon zugeordnet.')
    expect(zuordnungFehlertext(new ApiError('x', 404, 'not_found'))).toContain('gibt es nicht mehr')
    expect(zuordnungFehlertext(new Error('x'))).toBe('Nicht gespeichert: unbekannter Fehler.')
  })
})
