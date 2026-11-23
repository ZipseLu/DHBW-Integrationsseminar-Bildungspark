import { useSyncExternalStore } from 'react'
import { BERUFSBILDER } from '@/data/constants'

/**
 * FE-34: Berufsfelder for the selection lists.
 *
 * The five Berufsfelder of the Bildungspark are fixed (BERUFSBILDER). A curriculum
 * added on the page "Lehrpläne" can bring a new one. Every response of
 * GET /api/lehrplaene reports its Berufsfelder here (fetchLehrplaene), and all
 * selection lists that use `useBerufsfelder()` show them right away – without an
 * extra request of their own.
 */
let zusaetzliche: readonly string[] = []
let liste: readonly string[] = BERUFSBILDER
const beobachter = new Set<() => void>()

/** Adds Berufsfelder that are not in the list yet (order of first appearance) */
export function merkeBerufsfelder(felder: readonly (string | null | undefined)[]): void {
  const neu = felder.map((f) => f?.trim()).filter((f): f is string => Boolean(f) && !liste.includes(f!))
  if (neu.length === 0) return
  zusaetzliche = [...new Set([...zusaetzliche, ...neu])]
  liste = [...BERUFSBILDER, ...zusaetzliche]
  beobachter.forEach((melde) => melde())
}

/** Current list: the fixed Berufsfelder first, then those of added curricula */
export function berufsfelder(): readonly string[] {
  return liste
}

/** Only for tests: back to the fixed list */
export function setzeBerufsfelderZurueck(): void {
  zusaetzliche = []
  liste = BERUFSBILDER
  beobachter.forEach((melde) => melde())
}

function abonniere(melde: () => void) {
  beobachter.add(melde)
  return () => {
    beobachter.delete(melde)
  }
}

/**
 * Berufsfelder for a selection list. `weitere` adds values that are shown anyway,
 * e.g. the Berufsfeld of an existing worksheet or participant.
 */
export function useBerufsfelder(weitere: readonly (string | null | undefined)[] = []): readonly string[] {
  const aktuell = useSyncExternalStore(abonniere, berufsfelder, berufsfelder)
  const extra = weitere.map((f) => f?.trim()).filter((f): f is string => Boolean(f) && !aktuell.includes(f!))
  return extra.length ? [...aktuell, ...new Set(extra)] : aktuell
}
