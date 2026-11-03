import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))
import { saveAs } from 'file-saver'
import {
  ApiError,
  apiFetch,
  deleteArbeitsblatt,
  downloadArbeitsblattDocx,
  downloadGespeichertesDocx,
  fetchArbeitsblaetter,
  fetchArbeitsblatt,
  fetchArbeitsblattFilteroptionen,
  fetchArbeitsblattVerlauf,
  fetchAktuellesKonto,
  fetchLehrplaene,
  generateArbeitsblatt,
  getAuthToken,
  login,
  logout,
  saveArbeitsblatt,
  setAbmeldeHandler,
  setAuthToken,
  updateArbeitsblatt,
  type Arbeitsblatt,
  type ArbeitsblattMeta,
} from '@/lib/api'

/**
 * FE-07: unit tests for every backend call in lib/api.ts.
 * fetch is mocked; each test checks URL, method and body of the request and
 * how the response (or error) reaches the caller. The contracts come from
 * apps/backend/src/routes/*.js and docs/persistenz-arbeitsblaetter.md.
 */

const ID = '11111111-1111-4111-8111-111111111111'

const WORKSHEET: Arbeitsblatt = {
  titel: 'Lieferschein prüfen',
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  stufe: 'A',
  format: 'text',
  sprache: 'Leichte Sprache',
  lernziel: 'Güter entladen',
  einleitung: 'Ein Lieferschein zeigt, was geliefert wird.',
  aufgaben: [{ nr: 1, typ: 'offen', anweisung: 'Lies den Lieferschein.' }],
  woerterbuch: [],
  hinweisAnleiter: '',
}

const META: ArbeitsblattMeta = {
  provider: 'gemini',
  model: null,
  mocked: true,
  durationMs: 3,
  promptVersion: '1.0.0',
  attempts: 0,
  usage: null,
  validation: { ok: true, hinweise: [] },
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

let fetchMock: ReturnType<typeof vi.fn>

/** Lets the next fetch call answer with `response` */
function antworte(response: Response) {
  fetchMock.mockImplementationOnce(async () => response)
}

/** URL and init of the n-th fetch call */
const aufruf = (n = 0) => ({ url: String(fetchMock.mock.calls[n][0]), init: (fetchMock.mock.calls[n][1] ?? {}) as RequestInit })

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(saveAs).mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch – Fehlerbehandlung', () => {
  it('reicht den genauen Grund (Feld code) als grund weiter', async () => {
    antworte(json({ error: 'conflict', code: 'letzter_admin', message: 'Das letzte Admin-Konto kann nicht entfernt werden' }, 409))
    const fehler = (await apiFetch('/api/benutzer/x', { method: 'DELETE' }).catch((e: unknown) => e)) as ApiError
    expect(fehler).toMatchObject({ status: 409, code: 'conflict', grund: 'letzter_admin' })

    antworte(json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
    const ohneGrund = (await apiFetch('/api/arbeitsblaetter').catch((e: unknown) => e)) as ApiError
    expect(ohneGrund.code).toBe('db_unavailable')
    expect(ohneGrund.grund).toBeUndefined()
  })

  it('gibt erfolgreiche Antworten unverändert zurück', async () => {
    antworte(json({ ok: true }))
    const response = await apiFetch('/api/health')
    expect(await response.json()).toEqual({ ok: true })
    expect(aufruf().url).toBe('/api/health')
  })

  it('macht aus einem Netzwerkfehler einen ApiError mit Status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const fehler = await apiFetch('/api/health').catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(ApiError)
    expect(fehler).toMatchObject({ status: 0, code: 'network_error' })
    expect((fehler as ApiError).message).toContain('Backend ist nicht erreichbar')
  })

  it('übernimmt Meldung, Code und Details aus der Fehlerantwort des Backends', async () => {
    antworte(json({ error: 'validation_error', message: 'Die Änderung ist ungültig: titel', details: [{ path: ['titel'] }] }, 400))
    await expect(apiFetch('/api/arbeitsblaetter')).rejects.toMatchObject({
      status: 400,
      code: 'validation_error',
      message: 'Die Änderung ist ungültig: titel',
      details: [{ path: ['titel'] }],
    })
  })

  it('kommt mit Fehlerseiten ohne JSON zurecht (z. B. vom Proxy)', async () => {
    antworte(new Response('<html>Bad Gateway</html>', { status: 502 }))
    await expect(apiFetch('/api/arbeitsblaetter')).rejects.toMatchObject({ status: 502, code: 'http_error', message: 'Fehler 502 vom Backend' })
  })
})

describe('Lehrpläne und KI', () => {
  it('fetchLehrplaene liefert die Lernziele oder eine leere Liste', async () => {
    antworte(json({ anzahl: 1, lernziele: [{ id: 1, titel: 'Güter entladen' }] }))
    expect(await fetchLehrplaene()).toEqual([{ id: 1, titel: 'Güter entladen' }])
    antworte(json({ anzahl: 0 }))
    expect(await fetchLehrplaene()).toEqual([])
  })

  it('generateArbeitsblatt schickt die Anfrage als JSON-POST', async () => {
    antworte(json({ worksheet: WORKSHEET, meta: META }))
    const request = {
      lernziel: { berufsfeld: WORKSHEET.berufsfeld, baustein: 1, ausbildungsbaustein: 'Wareneingang', titel: 'Güter entladen', niveaus: {} as never },
      stufe: 'A' as const,
      format: 'text' as const,
      sprache: 'Leichte Sprache' as const,
    }
    const result = await generateArbeitsblatt(request)

    expect(result.worksheet.titel).toBe('Lieferschein prüfen')
    const { url, init } = aufruf()
    expect(url).toBe('/api/ai/arbeitsblatt')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init.body))).toEqual(request)
  })

  it('downloadArbeitsblattDocx speichert die Datei unter dem Namen des Backends', async () => {
    antworte(new Response('docx', { status: 200, headers: { 'Content-Disposition': "attachment; filename*=UTF-8''Lager_G%C3%BCter.docx" } }))
    expect(await downloadArbeitsblattDocx(WORKSHEET)).toBe('Lager_Güter.docx')
    expect(aufruf().url).toBe('/api/ai/arbeitsblatt/docx')
    expect(JSON.parse(String(aufruf().init.body))).toEqual({ worksheet: WORKSHEET })
    expect(vi.mocked(saveAs).mock.calls[0][1]).toBe('Lager_Güter.docx')
  })
})

describe('Gespeicherte Arbeitsblätter (/api/arbeitsblaetter)', () => {
  it('fetchArbeitsblaetter hängt den Filter als Query an', async () => {
    antworte(json({ eintraege: [], seite: 2, proSeite: 15, gesamt: 0, seiten: 1 }))
    const seite = await fetchArbeitsblaetter({ stufe: ['T', 'A'], seite: 2, q: '' })
    expect(seite.seite).toBe(2)
    expect(aufruf().url).toBe('/api/arbeitsblaetter?stufe=T%2CA&seite=2')
  })

  it('fetchArbeitsblattFilteroptionen liest Berufsfelder und Bausteine', async () => {
    antworte(json({ berufsfelder: ['Lagerlogistik, Handel & Versand'], bausteine: [] }))
    expect((await fetchArbeitsblattFilteroptionen()).berufsfelder).toHaveLength(1)
    expect(aufruf().url).toBe('/api/arbeitsblaetter/filteroptionen')
  })

  it('fetchArbeitsblatt kodiert die ID und packt das Blatt aus', async () => {
    antworte(json({ arbeitsblatt: { id: ID, inhalt: WORKSHEET } }))
    expect((await fetchArbeitsblatt(ID)).inhalt).toEqual(WORKSHEET)
    expect(aufruf().url).toBe(`/api/arbeitsblaetter/${ID}`)

    antworte(json({ arbeitsblatt: {} }))
    await fetchArbeitsblatt('a/b')
    expect(aufruf(1).url).toBe('/api/arbeitsblaetter/a%2Fb')
  })

  it('saveArbeitsblatt speichert Inhalt, KI-Metadaten und Ersteller per POST', async () => {
    antworte(json({ arbeitsblatt: { id: ID, version: 1 } }, 201))
    const blatt = await saveArbeitsblatt({ worksheet: WORKSHEET, meta: META, erstelltVon: 'C. Hager' })

    expect(blatt).toEqual({ id: ID, version: 1 })
    expect(aufruf().init.method).toBe('POST')
    expect(JSON.parse(String(aufruf().init.body))).toEqual({ worksheet: WORKSHEET, meta: META, erstelltVon: 'C. Hager' })
  })

  it('updateArbeitsblatt schickt nur die geänderten Felder per PATCH', async () => {
    antworte(json({ arbeitsblatt: { id: ID, status: 'freigegeben', version: 3 } }))
    const blatt = await updateArbeitsblatt(ID, { status: 'freigegeben', autor: 'T. Neumann', notiz: 'Geprüft' })

    expect(blatt.version).toBe(3)
    const { url, init } = aufruf()
    expect(url).toBe(`/api/arbeitsblaetter/${ID}`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ status: 'freigegeben', autor: 'T. Neumann', notiz: 'Geprüft' })
  })

  it('updateArbeitsblatt meldet 404 als ApiError', async () => {
    antworte(json({ error: 'not_found', message: 'Arbeitsblatt nicht gefunden' }, 404))
    await expect(updateArbeitsblatt(ID, { favorit: true })).rejects.toMatchObject({ status: 404, code: 'not_found' })
  })

  it('deleteArbeitsblatt archiviert standardmäßig und gibt Autor und Notiz mit', async () => {
    antworte(json({ arbeitsblatt: { id: ID, status: 'archiviert' } }))
    await deleteArbeitsblatt(ID, { autor: 'C. Hager', notiz: 'veraltet' })
    expect(aufruf().url).toBe(`/api/arbeitsblaetter/${ID}`)
    expect(aufruf().init.method).toBe('DELETE')
    expect(JSON.parse(String(aufruf().init.body))).toEqual({ autor: 'C. Hager', notiz: 'veraltet' })
  })

  it('deleteArbeitsblatt löscht mit endgueltig=true ohne Body', async () => {
    antworte(new Response(null, { status: 204 }))
    await deleteArbeitsblatt(ID, { endgueltig: true, autor: 'C. Hager' })
    expect(aufruf().url).toBe(`/api/arbeitsblaetter/${ID}?endgueltig=true`)
    expect(aufruf().init.body).toBeUndefined()
  })

  it('fetchArbeitsblattVerlauf liefert die Einträge', async () => {
    const eintraege = [{ version: 1, aktion: 'erstellt', autor: 'C. Hager', notiz: null, kiMeta: null, erstelltAm: '2026-10-28T09:00:00.000Z' }]
    antworte(json({ eintraege }))
    expect(await fetchArbeitsblattVerlauf(ID)).toEqual(eintraege)
    expect(aufruf().url).toBe(`/api/arbeitsblaetter/${ID}/verlauf`)
  })

  it('downloadGespeichertesDocx nutzt den Titel, wenn der Header fehlt', async () => {
    antworte(new Response('docx', { status: 200 }))
    expect(await downloadGespeichertesDocx({ id: ID, titel: 'Lieferschein prüfen' })).toBe('Lieferschein prüfen.docx')
    expect(aufruf().url).toBe(`/api/arbeitsblaetter/${ID}/docx`)
    expect(vi.mocked(saveAs)).toHaveBeenCalledTimes(1)
  })

  it('downloadGespeichertesDocx speichert nichts, wenn das Backend einen Fehler meldet', async () => {
    antworte(json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
    await expect(downloadGespeichertesDocx({ id: ID, titel: 'x' })).rejects.toMatchObject({ code: 'db_unavailable' })
    expect(vi.mocked(saveAs)).not.toHaveBeenCalled()
  })
})

describe('Anmeldung (/api/auth, BE-01)', () => {
  const KONTO = { id: ID, name: 'C. Hager', email: 'c.hager@bildungspark.example', rolle: 'admin', erstelltAm: '2026-11-03T08:00:00.000Z' }

  /** Authorization header of the n-th fetch call */
  const authHeader = (n = 0) => new Headers(aufruf(n).init.headers).get('Authorization')

  afterEach(() => {
    setAbmeldeHandler(null)
    setAuthToken(null)
  })

  it('login schickt E-Mail und Passwort und merkt sich das Token', async () => {
    antworte(json({ token: 'token-1', ablaufAm: '2026-11-03T16:00:00.000Z', benutzer: KONTO }))
    const anmeldung = await login('c.hager@bildungspark.example', 'geheim-123')

    expect(anmeldung.benutzer).toEqual(KONTO)
    expect(aufruf().url).toBe('/api/auth/login')
    expect(aufruf().init.method).toBe('POST')
    expect(JSON.parse(String(aufruf().init.body))).toEqual({ email: 'c.hager@bildungspark.example', passwort: 'geheim-123' })
    expect(getAuthToken()).toBe('token-1')
    expect(sessionStorage.getItem('bildungspark.anmeldung')).toBe('token-1')
  })

  it('alle weiteren Aufrufe schicken das Token als Bearer-Header mit', async () => {
    setAuthToken('token-2')
    antworte(json({ eintraege: [], seite: 1, proSeite: 15, gesamt: 0, seiten: 1 }))
    antworte(json({ arbeitsblatt: { id: ID } }))
    await fetchArbeitsblaetter()
    await updateArbeitsblatt(ID, { favorit: true })

    expect(authHeader(0)).toBe('Bearer token-2')
    expect(authHeader(1)).toBe('Bearer token-2')
    expect(new Headers(aufruf(1).init.headers).get('Content-Type')).toBe('application/json')
  })

  it('ohne Anmeldung bleibt der Aufruf unverändert', async () => {
    antworte(json({ ok: true }))
    await apiFetch('/api/health', { method: 'GET' })
    expect(aufruf().init).toEqual({ method: 'GET' })
  })

  it('fetchAktuellesKonto packt das Konto aus', async () => {
    setAuthToken('token-3')
    antworte(json({ benutzer: KONTO }))
    expect(await fetchAktuellesKonto()).toEqual(KONTO)
    expect(aufruf().url).toBe('/api/auth/me')
    expect(authHeader()).toBe('Bearer token-3')
  })

  it('logout verwirft das Token', async () => {
    setAuthToken('token-4')
    logout()
    expect(getAuthToken()).toBeNull()
    expect(sessionStorage.getItem('bildungspark.anmeldung')).toBeNull()
    antworte(json({ ok: true }))
    await apiFetch('/api/health')
    expect(authHeader()).toBeNull()
  })

  it('lehnt das Backend das Token ab (401), wird abgemeldet und der Handler gerufen', async () => {
    const handler = vi.fn()
    setAbmeldeHandler(handler)
    setAuthToken('abgelaufen')
    antworte(json({ error: 'unauthorized', code: 'token_abgelaufen', message: 'Die Anmeldung ist abgelaufen – bitte neu anmelden' }, 401))

    await expect(fetchArbeitsblaetter()).rejects.toMatchObject({ status: 401, code: 'unauthorized', grund: 'token_abgelaufen' })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(getAuthToken()).toBeNull()
  })

  it('falsches Passwort: ApiError 401, kein Token, kein Abmelde-Handler', async () => {
    const handler = vi.fn()
    setAbmeldeHandler(handler)
    setAuthToken('altes-token')
    antworte(json({ error: 'unauthorized', code: 'anmeldung_fehlgeschlagen', message: 'E-Mail-Adresse oder Passwort ist falsch' }, 401))

    await expect(login('c.hager@bildungspark.example', 'falsch')).rejects.toMatchObject({
      status: 401,
      grund: 'anmeldung_fehlgeschlagen',
      message: 'E-Mail-Adresse oder Passwort ist falsch',
    })
    expect(authHeader()).toBeNull()
    expect(getAuthToken()).toBeNull()
    expect(handler).not.toHaveBeenCalled()
  })
})
