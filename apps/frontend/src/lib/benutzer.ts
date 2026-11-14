import { useCallback, useEffect, useState } from 'react'
import { initialsOf } from '@/data/users'
import { ApiError, apiFetch } from '@/lib/api'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'
import type { StaffRole, StaffUser } from '@/types'

/**
 * FE-09: staff accounts from the backend (BE-03, /api/benutzer, admins only).
 *
 * Kept in its own module instead of lib/api.ts, because several open pull
 * requests change api.ts at the same time.
 * Field mapping: docs/benutzerverwaltung-api.md, section "Zuordnung zum Frontend".
 */

// --- API types (must match apps/backend/src/benutzer/schema.js) ---

export type Konto = { id: string; name: string; email: string; rolle: StaffRole; erstelltAm: string }

export type KontoNeu = { name: string; email: string; rolle: StaffRole; passwort: string }

/** PATCH changes only the given fields; an empty password is not sent */
export type KontoAenderung = Partial<KontoNeu>

const pfad = (id: string) => `/api/benutzer/${encodeURIComponent(id)}`

async function sendeJson(path: string, method: 'POST' | 'PATCH', payload: unknown): Promise<Response> {
  return apiFetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

export async function fetchBenutzer(): Promise<Konto[]> {
  const response = await apiFetch('/api/benutzer')
  const body = (await response.json()) as { eintraege?: unknown }
  if (!Array.isArray(body?.eintraege)) {
    throw new ApiError('Das Backend hat eine unerwartete Antwort geschickt.', 0, 'invalid_response')
  }
  return body.eintraege as Konto[]
}

export async function createBenutzer(konto: KontoNeu): Promise<Konto> {
  const response = await sendeJson('/api/benutzer', 'POST', konto)
  return ((await response.json()) as { benutzer: Konto }).benutzer
}

export async function updateBenutzer(id: string, aenderung: KontoAenderung): Promise<Konto> {
  const response = await sendeJson(pfad(id), 'PATCH', aenderung)
  return ((await response.json()) as { benutzer: Konto }).benutzer
}

export async function deleteBenutzer(id: string): Promise<void> {
  await apiFetch(pfad(id), { method: 'DELETE' })
}

export function staffUserAusKonto(konto: Konto): StaffUser {
  return {
    id: konto.id,
    name: konto.name,
    initials: initialsOf(konto.name),
    role: konto.rolle,
    email: konto.email,
    createdAt: konto.erstelltAm.slice(0, 10),
  }
}

/** User-facing message for a failed action; the backend already sends German texts for its rules */
export function benutzerFehlertext(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Nur Administratoren dürfen Konten verwalten.'
    if (error.status === 404) return 'Das Konto gibt es nicht mehr. Bitte die Seite neu laden.'
    // The backend message already names the problem, e.g. "Das Konto kann nicht angelegt werden: …"
    if (error.status === 400) return error.message
    if (error.status === 409) return `${error.message}.`
    return `Nicht gespeichert: ${error.message}`
  }
  return 'Nicht gespeichert: unbekannter Fehler.'
}

// --- Hook used by the page ---

export type BenutzerQuelle = { art: 'laden' } | { art: 'backend' } | { art: 'fehler'; grund: string }

export type BenutzerState = {
  /** Accounts from the backend (empty while loading or on error) */
  users: StaffUser[]
  quelle: BenutzerQuelle
  /** Each action returns an error message or null */
  anlegen: (konto: KontoNeu) => Promise<string | null>
  aendern: (id: string, aenderung: KontoAenderung) => Promise<string | null>
  loeschen: (id: string) => Promise<string | null>
  neuLaden: () => void
}

/**
 * Loads the accounts when the page opens. Only talks to the backend – what to
 * show without a backend (the sample accounts) is decided by the page.
 */
export function useBenutzer(): BenutzerState {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [quelle, setQuelle] = useState<BenutzerQuelle>({ art: 'laden' })
  const [ladeVersuch, setLadeVersuch] = useState(0)

  useEffect(() => {
    let aktiv = true
    setQuelle({ art: 'laden' })
    fetchBenutzer()
      .then((konten) => {
        if (!aktiv) return
        setUsers(konten.map(staffUserAusKonto))
        setQuelle({ art: 'backend' })
      })
      .catch((error: unknown) => {
        if (!aktiv) return
        setUsers([])
        setQuelle({ art: 'fehler', grund: fehlertext(error) })
      })
    return () => {
      aktiv = false
    }
  }, [ladeVersuch])

  const anlegen = useCallback(async (konto: KontoNeu): Promise<string | null> => {
    try {
      const gespeichert = staffUserAusKonto(await createBenutzer(konto))
      setUsers((liste) => [...liste, gespeichert].sort((a, b) => a.name.localeCompare(b.name, 'de')))
      return null
    } catch (error) {
      return benutzerFehlertext(error)
    }
  }, [])

  const aendern = useCallback(async (id: string, aenderung: KontoAenderung): Promise<string | null> => {
    try {
      const gespeichert = staffUserAusKonto(await updateBenutzer(id, aenderung))
      setUsers((liste) => liste.map((u) => (u.id === id ? gespeichert : u)))
      return null
    } catch (error) {
      return benutzerFehlertext(error)
    }
  }, [])

  const loeschen = useCallback(async (id: string): Promise<string | null> => {
    try {
      await deleteBenutzer(id)
    } catch (error) {
      // Already gone on the server: remove it here as well
      if (!(error instanceof ApiError && error.status === 404)) return benutzerFehlertext(error).replace(/^Nicht gespeichert/, 'Nicht gelöscht')
    }
    setUsers((liste) => liste.filter((u) => u.id !== id))
    return null
  }, [])

  const neuLaden = useCallback(() => setLadeVersuch((n) => n + 1), [])

  return { users, quelle, anlegen, aendern, loeschen, neuLaden }
}
