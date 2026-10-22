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
