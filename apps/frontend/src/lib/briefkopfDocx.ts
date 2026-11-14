import { Header, ImageRun, Paragraph } from 'docx'
import { BRIEFKOPF_GROESSE, BRIEFKOPF_PNG } from '@/assets/briefkopf'

/** ≈ text width of an A4 page with 1 inch margins (96 dpi) */
const BREITE_PX = 600

/** Bytes of the letterhead graphic (decoded from the data URL) */
function briefkopfBytes(): Uint8Array {
  const base64 = BRIEFKOPF_PNG.slice(BRIEFKOPF_PNG.indexOf(',') + 1)
  return Uint8Array.from(atob(base64), (zeichen) => zeichen.charCodeAt(0))
}

/** FE-21: page header with the Bildungspark letterhead, so it is on every page like on the paper worksheets */
export function briefkopfHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new ImageRun({
            type: 'png',
            data: briefkopfBytes(),
            transformation: { width: BREITE_PX, height: Math.round((BREITE_PX * BRIEFKOPF_GROESSE.hoehe) / BRIEFKOPF_GROESSE.breite) },
            altText: { title: 'Bildungspark', description: 'Bildungspark Heilbronn-Franken gGmbH – Bildung · Arbeit · Zukunft', name: 'Briefkopf' },
          }),
        ],
      }),
    ],
  })
}
