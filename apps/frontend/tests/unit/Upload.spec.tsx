import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { UploadMitText } from '@/lib/api'
import { MAX_ERWARTUNGEN, erwartungenAusVorlage, formatGroesse, themaAusDateiname } from '@/lib/vorlage'
import { pruefeDatei } from '@/pages/arbeitsblaetter/UploadSection'

/**
 * FE-05: upload an existing worksheet, store it in the backend (/api/uploads)
 * and hand it to the KI-Erstellung. fetch is a small in-memory backend that
 * follows apps/backend/src/routes/uploads.js.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

type Anfrage = { url: string; method: string; headers: Headers; body: unknown }

function uploadBackend({ fehler }: { fehler?: number } = {}) {
  const uploads: UploadMitText[] = []
  const anfragen: Anfrage[] = []
  let nr = 0

  const neu = (teil: Partial<UploadMitText>): UploadMitText => {
    nr += 1
    const text = teil.text ?? null
    return {
      id: `00000000-0000-4000-8000-00000000000${nr}`,
      dateiname: 'x.txt',
      dateityp: 'txt',
      groesse: 1234,
      hatDatei: true,
      textQuelle: text ? 'datei' : null,
      textLaenge: text?.length ?? 0,
      textVorschau: text?.slice(0, 200) ?? null,
      berufsfeld: null,
      thema: null,
      hochgeladenVon: null,
      hochgeladenAm: '2026-11-12T16:00:00.000Z',
      geaendertAm: '2026-11-12T16:00:00.000Z',
      text,
      ...teil,
    }
  }

  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = String(input)
    const method = init.method ?? 'GET'
    const headers = new Headers(init.headers)
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
    anfragen.push({ url, method, headers, body })

    if (url.startsWith('/api/lehrplaene')) return json({ anzahl: 0, lernziele: [] })
    if (url.startsWith('/api/arbeitsblaetter')) return json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503)
    if (!url.startsWith('/api/uploads')) return json({ error: 'not_found', message: 'unbekannt' }, 404)
    if (fehler) return json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, fehler)

    const id = url.match(/^\/api\/uploads\/([^/?]+)/)?.[1]
    if (method === 'POST') {
      const query = new URLSearchParams(url.split('?')[1] ?? '')
      let upload: UploadMitText
      if (headers.get('Content-Type') === 'application/json') {
        const daten = body as { text: string; titel?: string; berufsfeld?: string; hochgeladenVon?: string }
        upload = neu({ dateiname: `${daten.titel}.txt`, hatDatei: false, text: daten.text, textQuelle: 'eingefuegt', thema: daten.titel ?? null, berufsfeld: daten.berufsfeld ?? null, hochgeladenVon: daten.hochgeladenVon ?? null })
      } else {
        const dateiname = decodeURIComponent(headers.get('X-Dateiname') ?? '')
        const dateityp = dateiname.endsWith('.pdf') ? 'pdf' : 'docx'
        upload = neu({
          dateiname,
          dateityp,
          text: dateityp === 'pdf' ? null : 'Gabelstapler sicher fahren.\nAufgabe 1: Kreuze an.',
          berufsfeld: query.get('berufsfeld'),
          thema: query.get('thema'),
          hochgeladenVon: query.get('hochgeladenVon'),
        })
      }
      uploads.unshift(upload)
      const hinweise = upload.text ? [] : ['Aus PDF-, .doc- und Bilddateien wird kein Text gelesen – den Text bitte einfügen, wenn die KI das Blatt anpassen soll.']
      return json({ upload, hinweise }, 201)
    }
    if (method === 'PATCH' && id) {
      const upload = uploads.find((u) => u.id === id)!
      const { text } = body as { text: string }
      Object.assign(upload, { text, textQuelle: 'bearbeitet', textLaenge: text.length, textVorschau: text.slice(0, 200) })
      return json({ upload })
    }
    if (method === 'DELETE' && id) {
      uploads.splice(uploads.findIndex((u) => u.id === id), 1)
      return new Response(null, { status: 204 })
    }
    if (id) return json({ upload: uploads.find((u) => u.id === id) })
    return json({ eintraege: uploads.map(({ text: _text, ...rest }) => rest), gesamt: uploads.length })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { anfragen, uploads }
}

const uploadFeld = () => screen.getByLabelText('Arbeitsblatt hochladen')
const waehleDatei = (datei: File) => fireEvent.change(uploadFeld(), { target: { files: [datei] } })
const docx = (name = 'Gabelstapler_Sicherheit.docx') => new File(['docx'], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Hilfsfunktionen', () => {
  it('prüft Dateien vor dem Hochladen', () => {
    expect(pruefeDatei(docx())).toBeNull()
    expect(pruefeDatei(new File(['MZ'], 'virus.exe'))).toContain('wird nicht unterstützt')
    expect(pruefeDatei(new File([], 'leer.pdf'))).toBe('Die Datei ist leer.')
    const gross = new File(['x'], 'gross.pdf')
    Object.defineProperty(gross, 'size', { value: 20 * 1024 * 1024 + 1 })
    expect(pruefeDatei(gross)).toBe('Die Datei ist größer als 20 MB.')
  })

  it('macht aus Dateinamen ein Thema und formatiert Größen', () => {
    expect(themaAusDateiname('Gabelstapler_Sicherheit-Teil 2.docx')).toBe('Gabelstapler Sicherheit Teil 2')
    expect(formatGroesse(512)).toBe('512 B')
    expect(formatGroesse(350 * 1024)).toBe('350 KB')
    expect(formatGroesse(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })

  it('kürzt lange Vorlagen auf das Limit der KI-Schnittstelle', () => {
    const kurz = erwartungenAusVorlage('a.docx', 'Kurzer Text')
    expect(kurz).toMatchObject({ gekuerzt: false })
    expect(kurz.erwartungen).toContain('„a.docx“')
    expect(kurz.erwartungen.endsWith('Kurzer Text')).toBe(true)

    const lang = erwartungenAusVorlage('b.docx', 'x'.repeat(5000))
    expect(lang.gekuerzt).toBe(true)
    expect(lang.erwartungen).toHaveLength(MAX_ERWARTUNGEN)
  })
})

describe('Upload auf der Seite Arbeitsblätter (FE-05)', () => {
  it('lädt eine Word-Datei hoch und zeigt sie in der Liste', async () => {
    const { anfragen } = uploadBackend()
    render(<App />)

    fireEvent.change(screen.getByLabelText('BERUFSFELD (optional)'), { target: { value: 'Lagerlogistik, Handel & Versand' } })
    waehleDatei(docx())

    expect(await screen.findByText('✓ „Gabelstapler_Sicherheit.docx“ gespeichert')).toBeInTheDocument()
    expect(screen.getByText(/Text gelesen: 49 Zeichen/)).toBeInTheDocument()

    const post = anfragen.find((a) => a.method === 'POST')!
    expect(post.headers.get('X-Dateiname')).toBe('Gabelstapler_Sicherheit.docx')
    const query = new URLSearchParams(post.url.split('?')[1])
    expect(Object.fromEntries(query)).toEqual({ berufsfeld: 'Lagerlogistik, Handel & Versand', thema: 'Gabelstapler Sicherheit', hochgeladenVon: 'Celine Hager' })

    const liste = (await screen.findByRole('heading', { name: 'Hochgeladene Dokumente' })).closest('section') as HTMLElement
    expect(within(liste).getByText('Gabelstapler_Sicherheit.docx')).toBeInTheDocument()
    expect(within(liste).getByText('✓ Text vorhanden')).toBeInTheDocument()
  })

  it('lehnt nicht erlaubte Dateien ab, ohne etwas zu senden', () => {
    const { anfragen } = uploadBackend()
    render(<App />)
    waehleDatei(new File(['MZ'], 'virus.exe'))
    expect(screen.getByText(/Dateityp „.exe“ wird nicht unterstützt/)).toHaveAttribute('role', 'alert')
    expect(anfragen.some((a) => a.method === 'POST')).toBe(false)
  })

  it('meldet, wenn das Backend nicht erreichbar ist', async () => {
    uploadBackend({ fehler: 503 })
    render(<App />)
    waehleDatei(docx())
    expect(await screen.findByText('Der Upload ist gerade nicht möglich: Die Datenbank ist nicht verfügbar.')).toHaveAttribute('role', 'alert')
  })

  it('ergänzt bei einem PDF den Text und übergibt ihn an die KI-Erstellung', async () => {
    const { anfragen } = uploadBackend()
    render(<App />)
    waehleDatei(new File(['%PDF'], 'Lieferschein.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText(/wird kein Text gelesen/)).toBeInTheDocument()
    const ki = screen.getByRole('button', { name: '✦ Mit KI an Niveaustufen anpassen' })
    expect(ki).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/TEXT ERGÄNZEN/), { target: { value: 'Prüfe den Lieferschein.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Text speichern' }))
    await waitFor(() => expect(ki).toBeEnabled())
    expect(anfragen.find((a) => a.method === 'PATCH')?.body).toEqual({ text: 'Prüfe den Lieferschein.' })

    // The list reloads after the PATCH and no longer claims that there is no text
    const liste = (await screen.findByRole('heading', { name: 'Hochgeladene Dokumente' })).closest('section') as HTMLElement
    expect(await within(liste).findByText('✓ Text vorhanden')).toBeInTheDocument()

    fireEvent.click(ki)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('KI-Erstellung')
    expect(screen.getByText(/Vorlage „Lieferschein.pdf“ übernommen/)).toBeInTheDocument()
    expect(screen.getByLabelText(/THEMA \/ TITEL/)).toHaveValue('Lieferschein')
    expect((screen.getByLabelText(/ERWARTUNGEN AN DAS ARBEITSBLATT/) as HTMLTextAreaElement).value).toContain('Prüfe den Lieferschein.')
  })

  it('speichert eingefügten Text', async () => {
    const { anfragen } = uploadBackend()
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: '📋 Text einfügen' }))
    fireEvent.change(screen.getByLabelText(/^THEMA/), { target: { value: 'Hygiene' } })
    fireEvent.change(screen.getByLabelText('TEXT DES ARBEITSBLATTS'), { target: { value: 'Wasche die Hände.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Text speichern' }))

    expect(await screen.findByText('✓ „Hygiene.txt“ gespeichert')).toBeInTheDocument()
    expect(anfragen.find((a) => a.method === 'POST')?.body).toEqual({ text: 'Wasche die Hände.', titel: 'Hygiene', hochgeladenVon: 'Celine Hager' })
  })
})

describe('Liste der hochgeladenen Dokumente (FE-05)', () => {
  it('öffnet PDFs im Browser, passt mit KI an und löscht nach Rückfrage', async () => {
    const { anfragen, uploads } = uploadBackend()
    uploads.push(
      { id: 'a1', dateiname: 'Scan.pdf', dateityp: 'pdf', groesse: 2048, hatDatei: true, textQuelle: null, textLaenge: 0, textVorschau: null, berufsfeld: null, thema: null, hochgeladenVon: 'T. Neumann', hochgeladenAm: '2026-11-10T08:00:00.000Z', geaendertAm: '2026-11-10T08:00:00.000Z', text: null },
      { id: 'a2', dateiname: 'Hygiene.docx', dateityp: 'docx', groesse: 4096, hatDatei: true, textQuelle: 'datei', textLaenge: 17, textVorschau: 'Wasche die Hände.', berufsfeld: 'Gastronomie & Hauswirtschaft', thema: 'Hygiene', hochgeladenVon: null, hochgeladenAm: '2026-11-11T08:00:00.000Z', geaendertAm: '2026-11-11T08:00:00.000Z', text: 'Wasche die Hände.' },
    )
    render(<App />)
    const liste = (await screen.findByRole('heading', { name: 'Hochgeladene Dokumente' })).closest('section') as HTMLElement

    fireEvent.click(within(liste).getByRole('button', { name: 'Scan.pdf öffnen' }))
    expect(window.open).toHaveBeenCalledWith('/api/uploads/a1/datei?anzeigen=true', '_blank', 'noopener')

    // Without text there is nothing the KI could adapt
    fireEvent.click(within(liste).getByRole('button', { name: 'Scan.pdf mit KI anpassen' }))
    expect(await within(liste).findByText(/noch kein Text gespeichert/)).toBeInTheDocument()

    fireEvent.click(within(liste).getByRole('button', { name: 'Scan.pdf löschen' }))
    fireEvent.click(within(liste).getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(within(liste).queryByText('Scan.pdf')).not.toBeInTheDocument())
    expect(anfragen.some((a) => a.method === 'DELETE' && a.url === '/api/uploads/a1')).toBe(true)

    fireEvent.click(within(liste).getByRole('button', { name: 'Hygiene.docx mit KI anpassen' }))
    expect(await screen.findByText(/Vorlage „Hygiene.docx“ übernommen/)).toBeInTheDocument()
    expect(screen.getByLabelText(/BERUFSBILD/)).toHaveValue('Gastronomie & Hauswirtschaft')
  })
})
