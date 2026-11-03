import { saveAs } from 'file-saver'
import type { Format, Level, Sprache, StaffRole, StationStatus, Worksheet } from '@/types'

/**
 * Zugriff auf das Backend (Express, Port 3000).
 *
 * Im Dev-Server leitet Vite alle Aufrufe von `/api` an das Backend weiter
 * (siehe vite.config.ts), deshalb reichen relative URLs. Fuer andere
 * Umgebungen kann `VITE_API_URL` (z. B. http://localhost:3000) gesetzt werden.
 */
const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

// --- Typen der Arbeitsblatt-API (muessen zu apps/backend/src/arbeitsblatt/schema.js passen) ---

export type AufgabeTyp = 'offen' | 'reihenfolge' | 'zuordnen' | 'ankreuzen' | 'malen' | 'praxis'

export type Aufgabe = {
  nr: number
  typ: AufgabeTyp
  anweisung: string
  optionen?: string[]
  loesung?: string
  piktogramm?: string
}

export type WoerterbuchEintrag = { wort: string; erklaerung: string }

export type Arbeitsblatt = {
  titel: string
  berufsfeld: string
  stufe: Level
  format: Format
  sprache: Sprache
  lernziel: string
  einleitung: string
  aufgaben: Aufgabe[]
  woerterbuch: WoerterbuchEintrag[]
  hinweisAnleiter: string
  baustein?: number
  ausbildungsbaustein?: string
}

export type ArbeitsblattMeta = {
  provider: string
  model: string | null
  mocked: boolean
  durationMs: number
  promptVersion: string
  attempts: number
  usage: { inputTokens?: number | null; outputTokens?: number | null; thinkingTokens?: number | null; totalTokens?: number | null } | null
  validation: { ok: boolean; hinweise: string[] }
}

export type ArbeitsblattResult = { worksheet: Arbeitsblatt; meta: ArbeitsblattMeta }

export type LernzielInput = {
  berufsfeld: string
  baustein: number
  ausbildungsbaustein: string
  titel: string
  niveaus: Record<Level, { kompetenz: string; beispiel: string }>
}

export type ArbeitsblattRequest = {
  lernziel: LernzielInput
  stufe: Level
  format: Format
  sprache: Sprache
  thema?: string
  erwartungen?: string
}

/** Einheitlicher Fehler: HTTP-Status, Fehlercode des Backends und deutsche Meldung */
export class ApiError extends Error {
  status: number
  /** Fehlerart, z. B. 'conflict', 'not_found', 'unauthorized', 'db_unavailable' (Feld `error` der Antwort) */
  code: string
  /** Genauer Grund, falls das Backend ihn nennt, z. B. 'bereits_zugeordnet', 'token_abgelaufen' (Feld `code`) */
  grund?: string
  details?: unknown

  constructor(message: string, status: number, code: string, details?: unknown, grund?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    if (grund) this.grund = grund
  }
}

type ErrorBody = { error?: string; code?: string; message?: string; details?: unknown }

// --- Anmelde-Token (BE-01) – apiFetch schickt es bei jedem Aufruf mit ----------

const TOKEN_SCHLUESSEL = 'bildungspark.anmeldung'

/** undefined = noch nicht aus dem sessionStorage gelesen */
let authToken: string | null | undefined
let abmeldeHandler: (() => void) | null = null

/**
 * Aktuelles Anmelde-Token. Liegt im sessionStorage: übersteht ein Neuladen der Seite,
 * aber nicht das Schließen des Tabs (Rechner im Bildungspark werden geteilt).
 */
export function getAuthToken(): string | null {
  if (authToken === undefined) {
    try {
      authToken = sessionStorage.getItem(TOKEN_SCHLUESSEL)
    } catch {
      authToken = null // Speicher gesperrt (z. B. strenger privater Modus)
    }
  }
  return authToken
}

export function setAuthToken(token: string | null): void {
  authToken = token
  try {
    if (token) sessionStorage.setItem(TOKEN_SCHLUESSEL, token)
    else sessionStorage.removeItem(TOKEN_SCHLUESSEL)
  } catch {
    // Speicher nicht verfügbar – das Token gilt dann nur bis zum Neuladen
  }
}

/**
 * Wird aufgerufen, wenn das Backend ein mitgeschicktes Token ablehnt (abgelaufen,
 * Konto gelöscht). Das Token ist dann schon verworfen – die App zeigt die Login-Maske.
 */
export function setAbmeldeHandler(handler: (() => void) | null): void {
  abmeldeHandler = handler
}

/** fetch mit einheitlicher Fehlerbehandlung: Netzwerkfehler und Nicht-2xx werden zu ApiError */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  let request = init
  if (token) {
    const headers = new Headers(init.headers)
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    request = { ...init, headers }
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, request)
  } catch {
    throw new ApiError('Das Backend ist nicht erreichbar. Läuft `npm run dev` in apps/backend?', 0, 'network_error')
  }

  if (response.ok) return response

  if (response.status === 401 && token) {
    setAuthToken(null)
    abmeldeHandler?.()
  }

  let body: ErrorBody = {}
  try {
    body = (await response.json()) as ErrorBody
  } catch {
    // keine JSON-Antwort (z. B. HTML-Fehlerseite des Proxys)
  }
  const message = body.message ?? `Fehler ${response.status} vom Backend`
  throw new ApiError(message, response.status, body.error ?? 'http_error', body.details, body.code)
}

async function postJson(path: string, payload: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Lernziel aus einem Katalog-Eintrag (WORKSHEETS) fuer die API aufbereiten */
export function lernzielFromWorksheet(w: Worksheet): LernzielInput {
  return {
    berufsfeld: w.berufsbild,
    baustein: w.baustein,
    ausbildungsbaustein: w.ausbildungsbaustein,
    titel: w.abschnitt.titel,
    niveaus: w.abschnitt.niveaus,
  }
}

/** Ein Lernziel aus den importierten Lehrplaenen (GET /api/lehrplaene) */
export type LehrplanLernziel = LernzielInput & { id: number; abschnitt: number | null; tq?: string | null; quelle?: string }

/**
 * GET /api/lehrplaene – importierte Lernziele (96, wenn `npm run import:lehrplaene` gelaufen ist).
 * Leere Liste, wenn noch nichts importiert wurde.
 */
export async function fetchLehrplaene(): Promise<LehrplanLernziel[]> {
  const response = await apiFetch('/api/lehrplaene')
  const body = (await response.json()) as { lernziele?: unknown }
  return Array.isArray(body.lernziele) ? (body.lernziele as LehrplanLernziel[]) : []
}

/** POST /api/ai/arbeitsblatt – erzeugt ein Arbeitsblatt (mit Gemini oder im Mock-Modus) */
export async function generateArbeitsblatt(request: ArbeitsblattRequest): Promise<ArbeitsblattResult> {
  const response = await postJson('/api/ai/arbeitsblatt', request)
  return (await response.json()) as ArbeitsblattResult
}

/** Dateiname aus dem Content-Disposition-Header lesen (filename*=UTF-8''… bevorzugt) */
export function fileNameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      // weiter mit dem ASCII-Namen
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : fallback
}

/** POST /api/ai/arbeitsblatt/docx – laedt das Arbeitsblatt als Word-Datei herunter, liefert den Dateinamen */
export async function downloadArbeitsblattDocx(worksheet: Arbeitsblatt): Promise<string> {
  const response = await postJson('/api/ai/arbeitsblatt/docx', { worksheet })
  const blob = await response.blob()
  const fileName = fileNameFromDisposition(response.headers.get('Content-Disposition'), `${worksheet.titel}.docx`)
  saveAs(blob, fileName)
  return fileName
}

// --- Gespeicherte Arbeitsblätter: /api/arbeitsblaetter (MySQL) ---------------
// Vertrag: apps/backend/src/routes/arbeitsblaetter.js, Doku docs/persistenz-arbeitsblaetter.md

export type ArbeitsblattStatus = 'entwurf' | 'freigegeben' | 'archiviert'
export type ArbeitsblattAktion = 'erstellt' | 'bearbeitet' | 'KI-angepasst' | 'freigegeben' | 'archiviert'

/** Listeneintrag (ohne Inhalt) – GET /api/arbeitsblaetter */
export type GespeichertesArbeitsblatt = {
  id: string
  titel: string
  berufsfeld: string
  baustein: number | null
  ausbildungsbaustein: string | null
  lernziel: string
  stufe: Level
  format: Format
  sprache: Sprache
  status: ArbeitsblattStatus
  kiGeneriert: boolean
  favorit: boolean
  elternId: string | null
  version: number
  erstelltVon: string | null
  erstelltAm: string
  geaendertAm: string
}

/** Einzelnes Blatt mit Inhalt – GET /api/arbeitsblaetter/:id, POST, PATCH */
export type GespeichertesArbeitsblattMitInhalt = GespeichertesArbeitsblatt & { inhalt: Arbeitsblatt }

export type ArbeitsblattSeite = {
  eintraege: GespeichertesArbeitsblatt[]
  seite: number
  proSeite: number
  gesamt: number
  seiten: number
}

export type VerlaufEintrag = {
  version: number
  aktion: ArbeitsblattAktion
  autor: string | null
  notiz: string | null
  kiMeta: Partial<ArbeitsblattMeta> | null
  erstelltAm: string
}

export type ArbeitsblattFilter = {
  q?: string
  berufsfeld?: string
  baustein?: number
  ausbildungsbaustein?: string
  stufe?: Level[]
  format?: Format[]
  sprache?: Sprache[]
  /** Standard des Backends: alles außer archiviert */
  status?: ArbeitsblattStatus | 'alle'
  favorit?: boolean
  kiGeneriert?: boolean
  elternId?: string
  sortierung?: 'neueste' | 'aelteste' | 'titel'
  seite?: number
  proSeite?: number
}

export type SaveArbeitsblattInput = {
  worksheet: Arbeitsblatt
  /** `meta` aus generateArbeitsblatt() mitgeben – dann gilt das Blatt als KI-generiert */
  meta?: ArbeitsblattMeta | null
  erstelltVon?: string
  elternId?: string | null
  status?: ArbeitsblattStatus
  favorit?: boolean
  notiz?: string
}

export type PatchArbeitsblattInput = {
  worksheet?: Arbeitsblatt
  status?: ArbeitsblattStatus
  favorit?: boolean
  aktion?: 'bearbeitet' | 'KI-angepasst'
  /** Nur mit `worksheet`: `meta` der Generierung, wenn die KI den neuen Inhalt erzeugt hat */
  meta?: ArbeitsblattMeta | null
  autor?: string
  notiz?: string
}

/** Filter -> Query-String; leere Werte und leere Listen werden weggelassen */
export function arbeitsblaetterQuery(filter: ArbeitsblattFilter = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','))
    } else {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** GET /api/arbeitsblaetter – eine Seite (Standard 15 Einträge, neueste zuerst) */
export async function fetchArbeitsblaetter(filter: ArbeitsblattFilter = {}): Promise<ArbeitsblattSeite> {
  const response = await apiFetch(`/api/arbeitsblaetter${arbeitsblaetterQuery(filter)}`)
  return (await response.json()) as ArbeitsblattSeite
}

/** GET /api/arbeitsblaetter/filteroptionen – Werte für die Dropdowns */
export async function fetchArbeitsblattFilteroptionen(): Promise<{
  berufsfelder: string[]
  bausteine: { berufsfeld: string; baustein: number | null; ausbildungsbaustein: string | null; anzahl: number }[]
}> {
  const response = await apiFetch('/api/arbeitsblaetter/filteroptionen')
  return response.json()
}

/** GET /api/arbeitsblaetter/:id – Blatt mit Inhalt (für Vorschau und Bearbeiten) */
export async function fetchArbeitsblatt(id: string): Promise<GespeichertesArbeitsblattMitInhalt> {
  const response = await apiFetch(`/api/arbeitsblaetter/${encodeURIComponent(id)}`)
  return ((await response.json()) as { arbeitsblatt: GespeichertesArbeitsblattMitInhalt }).arbeitsblatt
}

/** POST /api/arbeitsblaetter – z. B. direkt mit dem Ergebnis von generateArbeitsblatt() */
export async function saveArbeitsblatt(input: SaveArbeitsblattInput): Promise<GespeichertesArbeitsblattMitInhalt> {
  const response = await postJson('/api/arbeitsblaetter', input)
  return ((await response.json()) as { arbeitsblatt: GespeichertesArbeitsblattMitInhalt }).arbeitsblatt
}

/** PATCH /api/arbeitsblaetter/:id – Inhalt (neue Version), Status oder Favorit */
export async function updateArbeitsblatt(id: string, patch: PatchArbeitsblattInput): Promise<GespeichertesArbeitsblattMitInhalt> {
  const response = await apiFetch(`/api/arbeitsblaetter/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return ((await response.json()) as { arbeitsblatt: GespeichertesArbeitsblattMitInhalt }).arbeitsblatt
}

/** DELETE /api/arbeitsblaetter/:id – archiviert (Standard, optional mit Autor/Notiz im Verlauf) oder löscht endgültig */
export async function deleteArbeitsblatt(
  id: string,
  { endgueltig = false, autor, notiz }: { endgueltig?: boolean; autor?: string; notiz?: string } = {},
): Promise<void> {
  const init: RequestInit = { method: 'DELETE' }
  if (!endgueltig && (autor || notiz)) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify({ autor, notiz })
  }
  await apiFetch(`/api/arbeitsblaetter/${encodeURIComponent(id)}${endgueltig ? '?endgueltig=true' : ''}`, init)
}

/** GET /api/arbeitsblaetter/:id/verlauf – Versionen, neueste zuerst (Button „Verlauf“) */
export async function fetchArbeitsblattVerlauf(id: string): Promise<VerlaufEintrag[]> {
  const response = await apiFetch(`/api/arbeitsblaetter/${encodeURIComponent(id)}/verlauf`)
  return ((await response.json()) as { eintraege: VerlaufEintrag[] }).eintraege
}

/** GET /api/arbeitsblaetter/:id/docx – lädt die aktuelle Version als Word-Datei herunter (Button „.docx“) */
export async function downloadGespeichertesDocx(blatt: Pick<GespeichertesArbeitsblatt, 'id' | 'titel'>): Promise<string> {
  const response = await apiFetch(`/api/arbeitsblaetter/${encodeURIComponent(blatt.id)}/docx`)
  const blob = await response.blob()
  const fileName = fileNameFromDisposition(response.headers.get('Content-Disposition'), `${blatt.titel}.docx`)
  saveAs(blob, fileName)
  return fileName
}

// --- Anmeldung: /api/auth (BE-01) ---------------------------------------------

/** Mitarbeiterkonto, wie es das Backend liefert (GET /api/auth/me, /api/benutzer) */
export type Konto = {
  id: string
  name: string
  email: string
  rolle: StaffRole
  /** ISO-Zeit; Datum = erste 10 Zeichen */
  erstelltAm: string
}

/** Antwort von POST /api/auth/login */
export type Anmeldung = { token: string; ablaufAm: string; benutzer: Konto }

/**
 * POST /api/auth/login – merkt sich das Token, alle weiteren Aufrufe schicken es mit.
 * Falsche Daten: ApiError mit Status 401 und der Meldung „E-Mail-Adresse oder Passwort ist falsch“.
 */
export async function login(email: string, passwort: string): Promise<Anmeldung> {
  setAuthToken(null) // ein altes Token gehört nicht zur neuen Anmeldung
  const response = await postJson('/api/auth/login', { email, passwort })
  const anmeldung = (await response.json()) as Anmeldung
  setAuthToken(anmeldung.token)
  return anmeldung
}

/** GET /api/auth/me – das eigene Konto, z. B. um die Anmeldung nach dem Neuladen wiederherzustellen */
export async function fetchAktuellesKonto(): Promise<Konto> {
  const response = await apiFetch('/api/auth/me')
  return ((await response.json()) as { benutzer: Konto }).benutzer
}

/** Abmelden: Token verwerfen – das Backend führt keine Sitzung */
export function logout(): void {
  setAuthToken(null)
}

// --- Zuordnungen und Lernstand: /api/teilnehmende/:kennung/… (BE-04) ----------

export type ZuordnungStatus = 'offen' | 'erledigt'

/** Ein Arbeitsblatt, das einer/einem Teilnehmenden zugeordnet ist – mit den Eckdaten des Blatts */
export type Zuordnung = {
  id: string
  kennung: string
  status: ZuordnungStatus
  zugeordnetAm: string
  erledigtAm: string | null
  /** Name aus der Anmeldung (BE-01), sonst null */
  zugeordnetVon: string | null
  arbeitsblatt: Pick<
    GespeichertesArbeitsblatt,
    'id' | 'titel' | 'berufsfeld' | 'baustein' | 'ausbildungsbaustein' | 'lernziel' | 'stufe' | 'format' | 'sprache' | 'status'
  >
}

export type LernstandAnzahl = { erledigt: number; offen: number; gesamt: number }

/** Lernstand in einem Berufsfeld; Reihenfolge der Liste = Reihenfolge des Lernwegs */
export type LernstandBerufsfeld = {
  berufsfeld: string
  /** Station im Lernweg; null, wenn Blätter aus einem Berufsfeld außerhalb des Lernwegs zugeordnet sind */
  station: { position: number; status: StationStatus; stufe: Level; format: Format } | null
  /** erledigt / gesamt in Prozent (0, wenn nichts zugeordnet ist) */
  fortschritt: number
  anzahl: LernstandAnzahl
  /** am längsten offene Zuordnung */
  alsNaechstes: Zuordnung | null
  /** älteste Zuordnung zuerst */
  offen: Zuordnung[]
  /** zuletzt erledigte zuerst */
  erledigt: Zuordnung[]
}

export type Lernstand = {
  kennung: string
  anzahl: LernstandAnzahl
  /** nächstes Blatt der aktiven Station, sonst das nächste offene entlang des Lernwegs */
  alsNaechstes: Zuordnung | null
  berufsfelder: LernstandBerufsfeld[]
}

const teilnehmerPfad = (kennung: string) => `/api/teilnehmende/${encodeURIComponent(kennung)}`

/** GET /api/teilnehmende/:kennung/zuordnungen – älteste zuerst, optional nur offene oder erledigte */
export async function fetchZuordnungen(kennung: string, status?: ZuordnungStatus): Promise<Zuordnung[]> {
  const response = await apiFetch(`${teilnehmerPfad(kennung)}/zuordnungen${status ? `?status=${status}` : ''}`)
  return ((await response.json()) as { eintraege: Zuordnung[] }).eintraege
}

/**
 * POST /api/teilnehmende/:kennung/zuordnungen – ordnet ein gespeichertes Arbeitsblatt zu.
 * Fehler: 404 (Person oder Blatt unbekannt), 409 (schon zugeordnet oder Blatt archiviert).
 */
export async function zuordnen(kennung: string, arbeitsblattId: string): Promise<Zuordnung> {
  const response = await postJson(`${teilnehmerPfad(kennung)}/zuordnungen`, { arbeitsblattId })
  return ((await response.json()) as { zuordnung: Zuordnung }).zuordnung
}

/** PATCH …/zuordnungen/:id – abhaken („erledigt“) oder wieder öffnen */
export async function setZuordnungStatus(kennung: string, id: string, status: ZuordnungStatus): Promise<Zuordnung> {
  const response = await apiFetch(`${teilnehmerPfad(kennung)}/zuordnungen/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return ((await response.json()) as { zuordnung: Zuordnung }).zuordnung
}

/** DELETE …/zuordnungen/:id – Zuordnung entfernen (das Arbeitsblatt bleibt) */
export async function deleteZuordnung(kennung: string, id: string): Promise<void> {
  await apiFetch(`${teilnehmerPfad(kennung)}/zuordnungen/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** GET /api/teilnehmende/:kennung/lernstand – erledigt/offen je Berufsfeld und „als Nächstes“ (Profil) */
export async function fetchLernstand(kennung: string): Promise<Lernstand> {
  const response = await apiFetch(`${teilnehmerPfad(kennung)}/lernstand`)
  return ((await response.json()) as { lernstand: Lernstand }).lernstand
}

/** GET /api/teilnehmende/lernstand – Lernstand aller Teilnehmenden (Übersicht, Dashboard) */
export async function fetchLernstandAlle(): Promise<Lernstand[]> {
  const response = await apiFetch('/api/teilnehmende/lernstand')
  return ((await response.json()) as { eintraege: Lernstand[] }).eintraege
}
