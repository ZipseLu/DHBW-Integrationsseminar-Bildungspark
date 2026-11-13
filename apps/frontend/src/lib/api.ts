import { saveAs } from 'file-saver'
import type { Format, Level, Sprache, Worksheet } from '@/types'

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
  code: string
  details?: unknown

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type ErrorBody = { error?: string; message?: string; details?: unknown }

/** fetch mit einheitlicher Fehlerbehandlung: Netzwerkfehler und Nicht-2xx werden zu ApiError */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch {
    throw new ApiError('Das Backend ist nicht erreichbar. Läuft `npm run dev` in apps/backend?', 0, 'network_error')
  }

  if (response.ok) return response

  let body: ErrorBody = {}
  try {
    body = (await response.json()) as ErrorBody
  } catch {
    // keine JSON-Antwort (z. B. HTML-Fehlerseite des Proxys)
  }
  const message = body.message ?? `Fehler ${response.status} vom Backend`
  throw new ApiError(message, response.status, body.error ?? 'http_error', body.details)
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
