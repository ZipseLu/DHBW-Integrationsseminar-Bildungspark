import { useCallback, useEffect, useState } from 'react'
import { ApiError, deleteZuordnung, fetchLernstand, fetchLernstandAlle, setZuordnungStatus, zuordnen, type Lernstand, type ZuordnungStatus } from '@/lib/api'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'

/**
 * FE-11: learning progress from the backend (BE-04). One request loads the
 * progress of all participants; after a change only that person is reloaded.
 * Contract: docs/zuordnungen-lernstand.md
 */

export type LernstandQuelle = { art: 'aus' } | { art: 'laden' } | { art: 'bereit' } | { art: 'fehler'; grund: string }

export type LernstandState = {
  quelle: LernstandQuelle
  /** Learning progress by pseudonymous ID; missing = nothing assigned yet */
  je: Record<string, Lernstand>
  /** Each action returns an error message or null */
  zuordnen: (kennung: string, arbeitsblattId: string) => Promise<string | null>
  /** FE-30: assigns a worksheet and marks it as done right away (closed Bereich) */
  nachtragen: (kennung: string, arbeitsblattId: string) => Promise<string | null>
  setStatus: (kennung: string, zuordnungId: string, status: ZuordnungStatus) => Promise<string | null>
  entfernen: (kennung: string, zuordnungId: string) => Promise<string | null>
  neuLaden: () => void
}

/** User-facing message; the backend codes are listed in docs/zuordnungen-lernstand.md */
export function zuordnungFehlertext(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.grund === 'blatt_archiviert') return 'Archivierte Arbeitsblätter können nicht zugeordnet werden.'
    if (error.status === 409) return 'Dieses Arbeitsblatt ist der Person schon zugeordnet.'
    if (error.status === 404) return 'Person, Arbeitsblatt oder Zuordnung gibt es nicht mehr. Bitte die Seite neu laden.'
    return `Nicht gespeichert: ${error.message}`
  }
  return 'Nicht gespeichert: unbekannter Fehler.'
}

/**
 * @param aktiv only with participants from the backend; with sample data the
 *              cards keep the prototype view and nothing is loaded
 */
export function useLernstand(aktiv: boolean): LernstandState {
  const [quelle, setQuelle] = useState<LernstandQuelle>({ art: 'aus' })
  const [je, setJe] = useState<Record<string, Lernstand>>({})
  const [ladeVersuch, setLadeVersuch] = useState(0)

  useEffect(() => {
    if (!aktiv) {
      setQuelle({ art: 'aus' })
      return
    }
    let laeuft = true
    setQuelle({ art: 'laden' })
    fetchLernstandAlle()
      .then((liste) => {
        if (!laeuft) return
        if (!Array.isArray(liste)) throw new Error('Das Backend hat eine unerwartete Antwort geschickt.')
        setJe(Object.fromEntries(liste.map((l) => [l.kennung, l])))
        setQuelle({ art: 'bereit' })
      })
      .catch((error: unknown) => laeuft && setQuelle({ art: 'fehler', grund: fehlertext(error) }))
    return () => {
      laeuft = false
    }
  }, [aktiv, ladeVersuch])

  /** Reloads one person after a change; errors are shown by the caller */
  const aktualisiere = useCallback(async (kennung: string) => {
    const lernstand = await fetchLernstand(kennung)
    setJe((alt) => ({ ...alt, [kennung]: lernstand }))
  }, [])

  const ausfuehren = useCallback(
    async (kennung: string, aktion: () => Promise<unknown>): Promise<string | null> => {
      try {
        await aktion()
      } catch (error) {
        return zuordnungFehlertext(error)
      }
      try {
        await aktualisiere(kennung)
        return null
      } catch (error) {
        return `Gespeichert, aber der Lernstand konnte nicht neu geladen werden: ${fehlertext(error)}`
      }
    },
    [aktualisiere],
  )

  return {
    quelle,
    je,
    zuordnen: (kennung, arbeitsblattId) => ausfuehren(kennung, () => zuordnen(kennung, arbeitsblattId)),
    nachtragen: (kennung, arbeitsblattId) =>
      ausfuehren(kennung, async () => {
        const zuordnung = await zuordnen(kennung, arbeitsblattId)
        await setZuordnungStatus(kennung, zuordnung.id, 'erledigt')
      }),
    setStatus: (kennung, zuordnungId, status) => ausfuehren(kennung, () => setZuordnungStatus(kennung, zuordnungId, status)),
    entfernen: (kennung, zuordnungId) => ausfuehren(kennung, () => deleteZuordnung(kennung, zuordnungId)),
    neuLaden: useCallback(() => setLadeVersuch((n) => n + 1), []),
  }
}
