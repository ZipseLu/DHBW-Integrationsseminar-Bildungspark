import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { ArbeitsblattResult } from '@/lib/api'

/**
 * Tests der KI-Erstellung gegen ein gemocktes Backend (globales fetch).
 * Es laeuft kein Server – jede Antwort wird hier vorgegeben.
 */

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))
import { saveAs } from 'file-saver'

const RESULT: ArbeitsblattResult = {
  worksheet: {
    titel: 'Der LKW ist da',
    berufsfeld: 'Lagerlogistik, Handel & Versand',
    stufe: 'T',
    format: 'text',
    sprache: 'Leichte Sprache',
    lernziel: 'Güter entladen',
    einleitung: 'Ein LKW bringt Ware.\nAchtung: Bleib hinter der gelben Linie.',
    aufgaben: [
      { nr: 1, typ: 'ankreuzen', anweisung: 'Kreuze an.', optionen: ['Ich sage Bescheid.', 'Ich gehe weg.'], loesung: 'Ich sage Bescheid.' },
      { nr: 2, typ: 'zuordnen', anweisung: 'Verbinde.', optionen: ['LKW | Bringt Ware'] },
      { nr: 3, typ: 'malen', anweisung: 'Male einen LKW.' },
      { nr: 4, typ: 'praxis', anweisung: 'Frage deinen Anleiter: War das richtig?' },
    ],
    woerterbuch: [{ wort: 'Ent-laden', erklaerung: 'Die Ware aus dem LKW holen.' }],
    hinweisAnleiter: 'Zeit: 20 Minuten.',
    baustein: 1,
    ausbildungsbaustein: 'Wareneingang',
  },
  meta: {
    provider: 'gemini',
    model: 'mock',
    mocked: true,
    durationMs: 12,
    promptVersion: '1.0.0',
    attempts: 0,
    usage: null,
    validation: { ok: false, hinweise: ['Aufgabe 1: Satz mit 14 Wörtern, Stufe T erlaubt höchstens 12'] },
  },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function requestBody(call: unknown[]): Record<string, unknown> {
  const init = call[1] as RequestInit
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

function openKiErstellung() {
  render(<App />)
  const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
  fireEvent.click(within(nav).getByRole('button', { name: /KI-Erstellung/ }))
}

let fetchMock: ReturnType<typeof vi.fn>

type Handlers = {
  generate?: (body: Record<string, unknown>) => Response | Promise<Response>
  docx?: () => Response
  lehrplaene?: () => Response
}

/** Gemocktes Backend: beantwortet die drei Endpunkte, die die Seite aufruft */
function mockBackend(handlers: Handlers = {}) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === '/api/lehrplaene') return handlers.lehrplaene?.() ?? jsonResponse({ anzahl: 0, lernziele: [] })
    if (url === '/api/ai/arbeitsblatt/docx') return handlers.docx?.() ?? jsonResponse({ error: 'nicht_gemockt', message: 'kein docx-Mock' }, 500)
    if (url === '/api/ai/arbeitsblatt') return handlers.generate ? handlers.generate(JSON.parse(String(init?.body))) : jsonResponse(RESULT)
    return jsonResponse({ error: 'not_found', message: url }, 404)
  })
}

const generateCalls = () => fetchMock.mock.calls.filter((call) => call[0] === '/api/ai/arbeitsblatt')

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  mockBackend()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('KI-Erstellung – Formular', () => {
  it('bietet die Lernziele des gewaehlten Berufsbilds aus dem Lehrplan an', () => {
    openKiErstellung()
    const select = screen.getByLabelText('LERNZIEL AUS DEM LEHRPLAN') as HTMLSelectElement
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Baustein 1 · Begleitpapiere prüfen',
      'Baustein 1 · Güter entladen',
      'Baustein 2 · Vorschriften bei Verpackung und Transport',
      'Baustein 3 · Güter auszeichnen und sortieren',
    ])

    fireEvent.change(screen.getByLabelText('BERUFSBILD'), { target: { value: 'Metalltechnik & Montage' } })
    expect(within(select).getAllByRole('option')).toHaveLength(3)
  })

  it('nutzt die importierten Lehrplaene, wenn das Backend welche liefert', async () => {
    const lernziel = (id: number, titel: string) => ({ id, berufsfeld: 'Metalltechnik & Montage', baustein: 2, abschnitt: 1, ausbildungsbaustein: 'Fügen', titel, niveaus: RESULT.worksheet.aufgaben && { T: { kompetenz: 'k', beispiel: '' }, A: { kompetenz: 'k', beispiel: '' }, F: { kompetenz: 'k', beispiel: '' }, B: { kompetenz: 'k', beispiel: '' } } })
    mockBackend({ lehrplaene: () => jsonResponse({ anzahl: 2, lernziele: [lernziel(1, 'Teile nach Montageplan heraussuchen'), lernziel(2, 'Ein sehr langer Lernzieltitel, der im Dropdown gekürzt werden muss, weil er sonst die Auswahl sprengt')] }) })
    openKiErstellung()

    // Der Import enthaelt nur Metall – erst dort wird die Quelle sichtbar
    fireEvent.change(screen.getByLabelText('BERUFSBILD'), { target: { value: 'Metalltechnik & Montage' } })
    expect(await screen.findByText(/Quelle: 2 importierte Lernziele/)).toBeInTheDocument()
    const options = within(screen.getByLabelText('LERNZIEL AUS DEM LEHRPLAN')).getAllByRole('option').map((o) => o.textContent)
    expect(options[0]).toBe('Baustein 2 · Teile nach Montageplan heraussuchen')
    expect(options[1]).toMatch(/^Baustein 2 · Ein sehr langer Lernzieltitel.*…$/)
    // Lager hat im Import nichts -> gesperrt, obwohl lokale Beispiele existieren wuerden
    fireEvent.change(screen.getByLabelText('BERUFSBILD'), { target: { value: 'Lagerlogistik, Handel & Versand' } })
    expect(screen.getByRole('button', { name: /Generieren nicht möglich/ })).toBeDisabled()
  })

  it('sperrt das Generieren fuer Berufsfelder ohne Lehrplan', () => {
    openKiErstellung()
    fireEvent.change(screen.getByLabelText('BERUFSBILD'), { target: { value: 'Garten- und Landschaftsbau' } })

    expect(screen.getByRole('note')).toHaveTextContent('noch keine Lehrpläne hinterlegt')
    expect(screen.getByRole('button', { name: /Generieren nicht möglich/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Varianten? generieren/ })).not.toBeInTheDocument()
  })
})

describe('KI-Erstellung – Generierung', () => {
  it('ruft das Backend je Variante nacheinander auf und zeigt die Ergebnisse', async () => {
    mockBackend({
      generate: (body) => jsonResponse({ ...RESULT, worksheet: { ...RESULT.worksheet, stufe: body.stufe as 'T' | 'A', titel: `Blatt ${String(body.stufe)}` } }),
    })
    openKiErstellung()

    fireEvent.change(screen.getByLabelText('LERNZIEL AUS DEM LEHRPLAN'), { target: { value: 'lokal-2' } })
    fireEvent.change(screen.getByLabelText(/THEMA \/ TITEL/), { target: { value: 'LKW am Tor' } })
    fireEvent.click(screen.getByRole('button', { name: /^T\s*Tätigkeit$/ }))
    fireEvent.click(screen.getByRole('button', { name: '✦ 2 Varianten generieren' }))

    const result = await screen.findByRole('region', { name: 'Erstellte Varianten' })
    await within(result).findByText('✓ 2 Varianten erstellt')

    expect(generateCalls()).toHaveLength(2)
    const first = requestBody(generateCalls()[0])
    const second = requestBody(generateCalls()[1])
    expect([first.stufe, second.stufe].sort()).toEqual(['A', 'T'])
    expect(first.format).toBe('text')
    expect(first.sprache).toBe('Leichte Sprache')
    expect(first.thema).toBe('LKW am Tor')
    expect(first.lernziel).toMatchObject({ berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, titel: 'Güter entladen' })
    expect((first.lernziel as { niveaus: Record<string, unknown> }).niveaus).toHaveProperty('B')

    expect(within(result).getByText(/„LKW am Tor"/)).toBeInTheDocument()
    expect(within(result).getByText('Blatt T')).toBeInTheDocument()
    expect(within(result).getByText('Blatt A')).toBeInTheDocument()
    expect(within(result).getByText(/Kein API-Key – Beispielantwort \(Mock\)/)).toBeInTheDocument()
    expect(within(result).getAllByText(/Validator: 1 Hinweise/)).toHaveLength(2)
    expect(within(result).getAllByText('Aufgabe 4: Praxis-Übung')).toHaveLength(2)
    expect(within(result).getAllByText(/Hinweis für die Lehrkraft:/)).toHaveLength(2)
  })

  it('zeigt waehrend der Generierung den Fortschritt an', async () => {
    // Jede Backend-Antwort wird erst auf Kommando freigegeben, damit der Fortschritt sichtbar bleibt
    const pending: Array<(value: Response) => void> = []
    mockBackend({ generate: () => new Promise<Response>((resolve) => pending.push(resolve)) })
    openKiErstellung()

    fireEvent.click(screen.getByRole('button', { name: /^T\s*Tätigkeit$/ }))
    fireEvent.click(screen.getByRole('button', { name: '✦ 2 Varianten generieren' }))

    expect(await screen.findByText(/^Variante 1 von 2 …/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Variante 1 von 2 wird erstellt/ })).toBeDisabled()
    expect(generateCalls()).toHaveLength(1)

    pending[0](jsonResponse(RESULT))
    expect(await screen.findByText(/^Variante 2 von 2 …/)).toBeInTheDocument()
    expect(generateCalls()).toHaveLength(2)

    pending[1](jsonResponse(RESULT))
    await screen.findByText('✓ 2 Varianten erstellt')
    expect(screen.queryByText(/wird erstellt/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '✦ 2 Varianten generieren' })).toBeEnabled()
  })

  it('zeigt Backend-Fehler verstaendlich an und behaelt die Eingaben', async () => {
    mockBackend({ generate: () => jsonResponse({ error: 'llm_rate_limit', message: 'Rate-Limit des KI-Anbieters erreicht.' }, 502) })
    openKiErstellung()

    fireEvent.change(screen.getByLabelText(/THEMA \/ TITEL/), { target: { value: 'Gabelstapler' } })
    fireEvent.click(screen.getByRole('button', { name: /^T\s*Tätigkeit$/ }))
    fireEvent.click(screen.getByRole('button', { name: '✦ 2 Varianten generieren' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Fehler bei Variante 1 von 2')
    expect(alert).toHaveTextContent('Rate-Limit des KI-Anbieters erreicht.')
    expect(alert).toHaveTextContent('Die übrigen Varianten wurden nicht erstellt.')
    expect(generateCalls()).toHaveLength(1)

    expect(screen.getByLabelText(/THEMA \/ TITEL/)).toHaveValue('Gabelstapler')
    expect(screen.getByRole('button', { name: '✦ 2 Varianten generieren' })).toBeEnabled()
  })

  it('meldet ein nicht erreichbares Backend', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    openKiErstellung()
    fireEvent.click(screen.getByRole('button', { name: '✦ 1 Variante generieren' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Das Backend ist nicht erreichbar')
  })

  it('laedt eine Variante als Word-Datei herunter', async () => {
    mockBackend({
      docx: () =>
        new Response(new Blob(['PK']), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="Lager_T-text.docx"; filename*=UTF-8''${encodeURIComponent('Lagerlogistik_BS1_Güter_entladen_T-text.docx')}`,
          },
        }),
    })
    openKiErstellung()
    fireEvent.click(screen.getByRole('button', { name: '✦ 1 Variante generieren' }))
    await screen.findByText('✓ 1 Variante erstellt')

    fireEvent.click(screen.getByRole('button', { name: '📄 .docx' }))

    await waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1))
    const docxCall = fetchMock.mock.calls.find((call) => call[0] === '/api/ai/arbeitsblatt/docx')
    expect(docxCall).toBeDefined()
    expect(requestBody(docxCall as unknown[])).toHaveProperty('worksheet.titel', 'Der LKW ist da')
    expect(vi.mocked(saveAs).mock.calls[0][1]).toBe('Lagerlogistik_BS1_Güter_entladen_T-text.docx')
  })
})
