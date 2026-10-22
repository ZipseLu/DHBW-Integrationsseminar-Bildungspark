/**
 * Schaltet einen Eintrag in einer Mehrfachauswahl um.
 * Der letzte ausgewaehlte Eintrag laesst sich nicht abwaehlen,
 * damit immer mindestens eine Variante erzeugt wird.
 */
export function toggleKeepOne<T>(list: readonly T[], item: T): T[] {
  if (!list.includes(item)) return [...list, item]
  if (list.length === 1) return [...list]
  return list.filter((entry) => entry !== item)
}

/** "1 Variante", "4 Varianten" */
export function variantenLabel(count: number): string {
  return `${count} Variante${count === 1 ? '' : 'n'}`
}
