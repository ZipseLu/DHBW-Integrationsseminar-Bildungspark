import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LehrplanLernziel, LehrplanVorschau } from '@/lib/api'
import { berufsfelder, setzeBerufsfelderZurueck, useBerufsfelder } from '@/lib/berufsfelder'
import { LehrplaenePage } from '@/pages/lehrplaene/LehrplaenePage'

/**
 * FE-34: adding a curriculum on the page "Lehrpläne". fetch is a small backend that
 * follows apps/backend/src/routes/lehrplaene.js (GET, POST /vorschau, POST /).
 */
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const niveaus = { T: { kompetenz: 'T', beispiel: '' }, A: { kompetenz: 'A', beispiel: '' }, F: { kompetenz: 'F', beispiel: '' }, B: { kompetenz: 'B', beispiel: '' } }

const LAGER: LehrplanLernziel = {
  id: 1,
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  baustein: 1,
  ausbildungsbaustein: 'Wareneingang',
  abschnitt: 1,
  titel: 'Güter entladen',
  niveaus,
  quelle: 'lager.docx',
}

const GALA = 'Garten- und Landschaftsbau Pflege'

const VORSCHAU: LehrplanVorschau = {
  quelle: 'gala.docx',
  berufsfeld: GALA,
  tq: null,
  baustein: 1,
  ausbildungsbaustein: 'Pflanzen pflegen',
  abschnitt: null,
  lernziele: [
    { abschnitt: null, titel: 'Hecke schneiden', niveaus },
    { abschnitt: null, titel: 'Rasen mähen', niveaus: { ...niveaus, B: { kompetenz: '', beispiel: '' } } },
  ],
  hinweise: ['„Rasen mähen“: Stufe B fehlt.'],
}

type Anfrage = { url: string; method: string; headers: Headers }

function backend({ vorschauFehler, ersetzt = false }: { vorschauFehler?: { status: number; message: string }; ersetzt?: boolean } = {}) {
  let lernziele: LehrplanLernziel[] = [LAGER]
  const anfragen: Anfrage[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    const method = init.method ?? 'GET'
    anfragen.push({ url, method, headers: new Headers(init.headers) })
    if (url === '/api/lehrplaene' && method === 'GET') return json({ herkunft: 'datenbank', anzahl: lernziele.length, lernziele })
    if (url.startsWith('/api/lehrplaene/vorschau')) {
      if (vorschauFehler) return json({ error: 'keine_lernziele', message: vorschauFehler.message }, vorschauFehler.status)
      return json({ lehrplan: VORSCHAU, ersetzt })
    }
    if (url.startsWith('/api/lehrplaene') && method === 'POST') {
      lernziele = [...lernziele, ...VORSCHAU.lernziele.map((l, i) => ({ ...l, id: 10 + i, berufsfeld: GALA, baustein: 1, ausbildungsbaustein: 'Pflanzen pflegen', quelle: 'gala.docx' }))]
      return json({ lehrplan: VORSCHAU, anzahl: 2, ersetzt }, 201)
    }
    return json({ error: 'not_found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { anfragen }
}

const DATEI = new File(['PK'], 'gala.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

async function oeffneDialog() {
  await screen.findByText(/1 Lernziele aus den importierten Lehrplänen/)
  fireEvent.click(screen.getByRole('button', { name: '+ Lehrplan hinzufügen' }))
  return screen.getByRole('dialog', { name: 'Lehrplan hinzufügen' })
}

beforeEach(() => setzeBerufsfelderZurueck())
afterEach(() => {
  vi.unstubAllGlobals()
  setzeBerufsfelderZurueck()
})

describe('Lehrplan hinzufügen (FE-34)', () => {
  it('prüft die Datei, zeigt die erkannten Lernziele und speichert den Lehrplan', async () => {
    const { anfragen } = backend()
    render(<LehrplaenePage onCreateWorksheet={() => {}} user={{ role: 'dozent' }} />)
    const dialog = await oeffneDialog()

    const pruefen = within(dialog).getByRole('button', { name: 'Prüfen' })
    expect(pruefen).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText('LEHRPLAN-DATEI (.DOCX)'), { target: { files: [DATEI] } })
    fireEvent.change(within(dialog).getByLabelText('BERUFSFELD'), { target: { value: '__anderes__' } })
    fireEvent.change(within(dialog).getByLabelText('NAME DES BERUFSFELDS'), { target: { value: GALA } })
    fireEvent.click(pruefen)

    expect(await within(dialog).findByText('2 Lernziele erkannt')).toBeInTheDocument()
    expect(within(dialog).getByText(`${GALA} · Baustein 1 · Pflanzen pflegen`)).toBeInTheDocument()
    expect(within(within(dialog).getByRole('list', { name: 'Erkannte Lernziele' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Hecke schneiden'),
      expect.stringContaining('Rasen mähen'),
    ])
    expect(within(dialog).getByLabelText('Stufen: T, A, F')).toBeInTheDocument()
    expect(within(dialog).getByRole('list', { name: 'Hinweise zum Lehrplan' })).toHaveTextContent('Stufe B fehlt')

    const vorschau = anfragen.find((a) => a.url.startsWith('/api/lehrplaene/vorschau'))!
    expect(vorschau.method).toBe('POST')
    expect(vorschau.url).toBe(`/api/lehrplaene/vorschau?berufsfeld=${encodeURIComponent(GALA)}`)
    expect(vorschau.headers.get('X-Dateiname')).toBe('gala.docx')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Lehrplan speichern' }))

    expect(await screen.findByText(`Lehrplan gespeichert: 2 Lernziele für ${GALA}. Sie stehen jetzt auch in der KI-Erstellung zur Auswahl.`)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // The list is loaded again and shows the new curriculum and Berufsfeld
    expect(await screen.findByRole('article', { name: 'Lehrplan Pflanzen pflegen Baustein 1' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Berufsfeld' })).getByRole('button', { name: new RegExp(GALA) })).toBeInTheDocument()
    expect(berufsfelder()).toContain(GALA)
  })

  it('warnt, wenn ein Lehrplan mit gleichem Dateinamen ersetzt wird', async () => {
    backend({ ersetzt: true })
    render(<LehrplaenePage onCreateWorksheet={() => {}} user={{ role: 'admin' }} />)
    const dialog = await oeffneDialog()
    fireEvent.change(within(dialog).getByLabelText('LEHRPLAN-DATEI (.DOCX)'), { target: { files: [DATEI] } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prüfen' }))

    expect(await within(dialog).findByText(/Beim Speichern wird er durch diese Version ersetzt/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ersetzen und speichern' }))
    expect(await screen.findByText(/^Lehrplan ersetzt: 2 Lernziele/)).toBeInTheDocument()
  })

  it('zeigt Fehler der Prüfung verständlich an', async () => {
    backend({ vorschauFehler: { status: 422, message: 'In der Datei wurden keine Lernziele erkannt.' } })
    render(<LehrplaenePage onCreateWorksheet={() => {}} user={{ role: 'admin' }} />)
    const dialog = await oeffneDialog()
    fireEvent.change(within(dialog).getByLabelText('LEHRPLAN-DATEI (.DOCX)'), { target: { files: [DATEI] } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prüfen' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('In der Datei wurden keine Lernziele erkannt.')
    expect(within(dialog).queryByRole('button', { name: 'Lehrplan speichern' })).not.toBeInTheDocument()
  })

  it('zeigt Assistenzen keinen Knopf zum Hinzufügen', async () => {
    backend()
    render(<LehrplaenePage onCreateWorksheet={() => {}} user={{ role: 'assistent' }} />)
    await screen.findByText(/1 Lernziele aus den importierten Lehrplänen/)
    expect(screen.queryByRole('button', { name: '+ Lehrplan hinzufügen' })).not.toBeInTheDocument()
  })
})

describe('Berufsfelder für die Auswahllisten (FE-34)', () => {
  function Liste({ weitere = [] }: { weitere?: string[] }) {
    const felder = useBerufsfelder(weitere)
    return (
      <ul aria-label="Felder">
        {felder.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    )
  }

  it('ergänzt Berufsfelder aus den geladenen Lehrplänen und aktualisiert offene Listen', async () => {
    backend()
    render(<Liste weitere={['Hauswirtschaft']} />)
    const eintraege = () => within(screen.getByRole('list', { name: 'Felder' })).getAllByRole('listitem').map((li) => li.textContent)
    expect(eintraege()).toHaveLength(6)
    expect(eintraege().at(-1)).toBe('Hauswirtschaft')

    const { fetchLehrplaene } = await import('@/lib/api')
    await act(async () => {
      await fetchLehrplaene()
    })
    expect(eintraege()).toHaveLength(6) // Lager is already in the list

    const { merkeBerufsfelder } = await import('@/lib/berufsfelder')
    act(() => merkeBerufsfelder([GALA, ' ', null]))
    expect(eintraege()).toContain(GALA)
    expect(eintraege()).toHaveLength(7)
  })
})
