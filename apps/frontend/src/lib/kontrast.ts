/**
 * Farbkontrast nach WCAG 2.1 (FE-15).
 *
 * Akzent- und Primärfarbe sind in den Einstellungen frei wählbar. Damit Text
 * auf diesen Farben (und Text in diesen Farben) trotzdem lesbar bleibt, werden
 * sie hier bei Bedarf so weit abgedunkelt bzw. aufgehellt, bis das
 * Kontrastverhältnis für normalen Text (AA: 4,5 : 1) erreicht ist.
 */

/** Mindestkontrast für normalen Text nach WCAG 2.1 AA */
export const AA_TEXT = 4.5
/** Mindestkontrast für großen Text und Bedienelemente (Rahmen, Fokusring) */
export const AA_GROSS = 3

type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, '')
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Keine Hex-Farbe: ${hex}`)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb
}

export function rgbToHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** Relative Leuchtdichte (0 = schwarz, 1 = weiß) */
export function leuchtdichte(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Kontrastverhältnis zweier Farben, 1 bis 21 */
export function kontrast(a: string, b: string): number {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x)
  return (hell + 0.05) / (dunkel + 0.05)
}

/** Mischt `hex` mit `ziel` (Anteil 0 = unverändert, 1 = ziel) */
export function mische(hex: string, ziel: string, anteil: number): string {
  const a = hexToRgb(hex)
  const b = hexToRgb(ziel)
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * anteil) as Rgb)
}

/**
 * Dunkelt `farbe` ab (`richtung: 'dunkler'`) oder hellt sie auf, bis sie gegen
 * alle `hintergruende` mindestens `minimum` erreicht. Ist das schon der Fall,
 * bleibt die Farbe unverändert.
 */
export function mitKontrast(farbe: string, hintergruende: readonly string[], minimum = AA_TEXT, richtung: 'dunkler' | 'heller' = 'dunkler'): string {
  const ziel = richtung === 'dunkler' ? '#000000' : '#FFFFFF'
  const reicht = (c: string) => hintergruende.every((bg) => kontrast(c, bg) >= minimum)
  if (reicht(farbe)) return rgbToHex(hexToRgb(farbe))
  for (let schritt = 1; schritt <= 50; schritt++) {
    const kandidat = mische(farbe, ziel, schritt / 50)
    if (reicht(kandidat)) return kandidat
  }
  return rgbToHex(hexToRgb(ziel))
}
