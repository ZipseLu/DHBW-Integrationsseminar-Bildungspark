import { useCallback, useEffect, useState } from 'react'
import { PARTICIPANTS } from '@/data/participants'
import { ApiError, apiFetch } from '@/lib/api'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'
import type { BerufStation, Format, Level, Participant, StationStatus } from '@/types'

/**
 * FE-12: participant profiles from the backend (BE-02, /api/teilnehmende).
 *
 * Kept in its own module instead of lib/api.ts, because several open pull
 * requests change api.ts at the same time.
 * Field mapping: docs/persistenz-teilnehmende.md, section "Zuordnung zum Frontend".
 */

// --- API types (must match apps/backend/src/teilnehmende/schema.js) ---

export type Station = {
  berufsfeld: string
  stufe: Level
  format: Format
  status: StationStatus
  fortschritt: number
  startDatum: string | null
  endDatum: string | null
  blaetterErledigt: number
}

export type Teilnehmer = {
  kennung: string
  stufe: Level
  fortschritt: number
  zuletztAktiv: string | null
  erstelltAm: string
  geaendertAm: string
  stationen: Station[]
}

/** Body of POST and PUT – only pseudonymous fields, the backend rejects anything else */
export type TeilnehmerEingabe = { kennung: string; stufe: Level; stationen: Station[] }

const pfad = (kennung: string) => `/api/teilnehmende/${encodeURIComponent(kennung)}`

async function sendeJson(path: string, method: 'POST' | 'PUT', payload: unknown): Promise<Response> {
  return apiFetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

/** GET /api/teilnehmende – all profiles with their learning path */
export async function fetchTeilnehmende(): Promise<Teilnehmer[]> {
  const response = await apiFetch('/api/teilnehmende')
  const body = (await response.json()) as { eintraege?: unknown }
  if (!Array.isArray(body?.eintraege)) {
    throw new ApiError('Das Backend hat eine unerwartete Antwort geschickt.', 0, 'invalid_response')
  }
  return body.eintraege as Teilnehmer[]
}

export async function createTeilnehmer(eingabe: TeilnehmerEingabe): Promise<Teilnehmer> {
  const response = await sendeJson('/api/teilnehmende', 'POST', eingabe)
  return ((await response.json()) as { teilnehmer: Teilnehmer }).teilnehmer
}

/** PUT replaces level and the whole learning path; a new `kennung` renames the profile */
export async function updateTeilnehmer(kennung: string, eingabe: TeilnehmerEingabe): Promise<Teilnehmer> {
  const response = await sendeJson(pfad(kennung), 'PUT', eingabe)
  return ((await response.json()) as { teilnehmer: Teilnehmer }).teilnehmer
}

export async function deleteTeilnehmer(kennung: string): Promise<void> {
  await apiFetch(pfad(kennung), { method: 'DELETE' })
}

// --- Mapping between API and frontend types ---

export function participantAusTeilnehmer(t: Teilnehmer): Participant {
  return {
    id: t.kennung,
    level: t.stufe,
    progress: t.fortschritt,
    lastActive: t.zuletztAktiv ?? t.geaendertAm.slice(0, 10),
    berufsbilder: t.stationen.map(
      (s): BerufStation => ({
        berufsbild: s.berufsfeld,
        level: s.stufe,
        format: s.format,
        progress: s.fortschritt,
        status: s.status,
        startDate: s.startDatum ?? '',
        ...(s.endDatum ? { endDate: s.endDatum } : {}),
        worksheetsDone: s.blaetterErledigt,
      }),
    ),
  }
}

export function eingabeAusParticipant(p: Participant): TeilnehmerEingabe {
  return {
    kennung: p.id,
    stufe: p.level,
    stationen: p.berufsbilder.map((b) => ({
      berufsfeld: b.berufsbild,
      stufe: b.level,
      format: b.format,
      status: b.status,
      fortschritt: b.progress,
      startDatum: b.startDate || null,
      endDatum: b.endDate || null,
      blaetterErledigt: b.worksheetsDone,
    })),
  }
}

/** User-facing message for a failed save or delete */
export function speicherFehlertext(error: unknown, kennung: string): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return `Die Kennung ${kennung} gibt es bereits.`
    if (error.status === 404) return `Das Profil ${kennung} gibt es nicht mehr. Bitte die Seite neu laden.`
    if (error.code === 'validation_error' || error.status === 400) return `Ungültige Eingabe: ${error.message}`
    return `Nicht gespeichert: ${error.message}`
  }
  return 'Nicht gespeichert: unbekannter Fehler.'
}

// --- Hook used by App: one shared list for the dashboard and the participants page ---

export type TeilnehmendeQuelle = { art: 'laden' } | { art: 'backend' } | { art: 'beispiel'; grund: string }

export type TeilnehmendeState = {
  participants: Participant[]
  quelle: TeilnehmendeQuelle
  /** Creates (`alteKennung` = null) or updates a profile. Returns an error message or null. */
  speichern: (alteKennung: string | null, participant: Participant) => Promise<string | null>
  /** Returns an error message or null */
  loeschen: (kennung: string) => Promise<string | null>
  neuLaden: () => void
}

/**
 * Loads the profiles once, the first time a page needs them (`benoetigt`), so
 * other pages do not call the backend. Without a backend the sample data are
 * shown and changes stay local (as in the prototype) – the page warns about it.
 */
export function useTeilnehmende(benoetigt: boolean): TeilnehmendeState {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [quelle, setQuelle] = useState<TeilnehmendeQuelle>({ art: 'laden' })
  const [ladeVersuch, setLadeVersuch] = useState(0)
  const [gestartet, setGestartet] = useState(benoetigt)

  useEffect(() => {
    if (benoetigt) setGestartet(true)
  }, [benoetigt])

  useEffect(() => {
    if (!gestartet) return
    let aktiv = true
    setQuelle({ art: 'laden' })
    fetchTeilnehmende()
      .then((liste) => {
        if (!aktiv) return
        setParticipants(liste.map(participantAusTeilnehmer))
        setQuelle({ art: 'backend' })
      })
      .catch((error: unknown) => {
        if (!aktiv) return
        setParticipants(PARTICIPANTS)
        setQuelle({ art: 'beispiel', grund: fehlertext(error) })
      })
    return () => {
      aktiv = false
    }
  }, [ladeVersuch, gestartet])

  const lokal = quelle.art !== 'backend'

  const speichern = useCallback(
    async (alteKennung: string | null, participant: Participant): Promise<string | null> => {
      if (lokal) {
        setParticipants((liste) => (alteKennung === null ? [...liste, participant] : liste.map((p) => (p.id === alteKennung ? participant : p))))
        return null
      }
      try {
        const eingabe = eingabeAusParticipant(participant)
        const gespeichert = participantAusTeilnehmer(alteKennung === null ? await createTeilnehmer(eingabe) : await updateTeilnehmer(alteKennung, eingabe))
        setParticipants((liste) => (alteKennung === null ? [...liste, gespeichert] : liste.map((p) => (p.id === alteKennung ? gespeichert : p))))
        return null
      } catch (error) {
        return speicherFehlertext(error, participant.id)
      }
    },
    [lokal],
  )

  const loeschen = useCallback(
    async (kennung: string): Promise<string | null> => {
      try {
        if (!lokal) await deleteTeilnehmer(kennung)
      } catch (error) {
        // Already gone on the server: remove it here as well
        if (!(error instanceof ApiError && error.status === 404)) {
          return error instanceof ApiError ? `${kennung} wurde nicht gelöscht: ${error.message}` : `${kennung} wurde nicht gelöscht.`
        }
      }
      setParticipants((liste) => liste.filter((p) => p.id !== kennung))
      return null
    },
    [lokal],
  )

  const neuLaden = useCallback(() => setLadeVersuch((n) => n + 1), [])

  return { participants, quelle, speichern, loeschen, neuLaden }
}
