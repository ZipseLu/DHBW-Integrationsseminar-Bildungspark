/**
 * FE-34: adding a curriculum (Lehrplan) through the application instead of the
 * import script.
 *
 * A teacher uploads one DOCX file of a "Binnendifferenzierter Lehrplan" and picks
 * the Berufsfeld. The same parser as `npm run import:lehrplaene` reads the
 * Ausbildungsbaustein, the learning goals and their four levels. The result is
 * first shown as a preview; saving parses the file again on the server, so the
 * client cannot send changed learning goals.
 */
import { typAusInhalt } from '../uploads/dateityp.js'
import { berufsfeldFromFileName, parseLehrplanDocx, STUFEN } from './parser.js'

/** Error with HTTP status and machine-readable code; the route returns it as JSON */
export class LehrplanUploadError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'LehrplanUploadError'
    this.status = status
    this.code = code
  }
}

const MAX_BERUFSFELD = 120
const MAX_TITEL = 500
const MAX_NIVEAU_TEXT = 1000

const kuerze = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/**
 * Reads an uploaded curriculum file.
 *
 * @param {Buffer} buffer  file content
 * @param {{ dateiname?: string|null, berufsfeld?: string|null }} info
 * @returns {{ quelle: string, berufsfeld: string, tq: string|null, baustein: number|null,
 *            ausbildungsbaustein: string|null, abschnitt: number|null,
 *            lernziele: Array<{ abschnitt: number|null, titel: string, niveaus: object }>, hinweise: string[] }}
 * @throws {LehrplanUploadError}
 */
export function leseLehrplanDatei(buffer, { dateiname = null, berufsfeld = null } = {}) {
  if (!buffer?.length) throw new LehrplanUploadError('Es wurde keine Datei mitgeschickt.', 400, 'datei_fehlt')
  if (!dateiname) throw new LehrplanUploadError('Der Dateiname fehlt (Header X-Dateiname).', 400, 'validation_error')
  if (typAusInhalt(buffer) !== 'docx') {
    throw new LehrplanUploadError('Lehrpläne können nur als Word-Datei (.docx) hinzugefügt werden.', 415, 'dateityp_nicht_unterstuetzt')
  }

  const feld = String(berufsfeld ?? '').trim() || berufsfeldFromFileName(dateiname)
  if (!feld) {
    throw new LehrplanUploadError('Bitte das Berufsfeld auswählen – es lässt sich aus dem Dateinamen nicht erkennen.', 400, 'berufsfeld_fehlt')
  }
  if (feld.length > MAX_BERUFSFELD) {
    throw new LehrplanUploadError(`Das Berufsfeld darf höchstens ${MAX_BERUFSFELD} Zeichen haben.`, 400, 'validation_error')
  }

  let parsed
  try {
    parsed = parseLehrplanDocx(buffer)
  } catch {
    throw new LehrplanUploadError('Die Word-Datei konnte nicht gelesen werden.', 422, 'lehrplan_nicht_lesbar')
  }
  if (parsed.lernziele.length === 0) {
    throw new LehrplanUploadError(
      'In der Datei wurden keine Lernziele erkannt. Erwartet wird die Tabelle der binnendifferenzierten Lehrpläne: ' +
        'eine Zeile mit dem Lernziel, darunter je eine Zeile für die Stufen T, A, F und B.',
      422,
      'keine_lernziele',
    )
  }

  const hinweise = []
  if (parsed.baustein === null) hinweise.push('Die Zeile „Ausbildungs-baustein N“ wurde nicht gefunden – der Baustein bleibt leer.')
  const lernziele = parsed.lernziele.map((ziel) => {
    const fehlend = STUFEN.filter((stufe) => !ziel.niveaus[stufe])
    if (fehlend.length) hinweise.push(`„${kuerze(ziel.titel, 60)}“: Stufe ${fehlend.join(', ')} fehlt.`)
    return {
      abschnitt: ziel.abschnitt,
      titel: kuerze(ziel.titel, MAX_TITEL),
      niveaus: Object.fromEntries(
        STUFEN.map((stufe) => {
          const niveau = ziel.niveaus[stufe] ?? { kompetenz: '', beispiel: '' }
          return [stufe, { kompetenz: kuerze(niveau.kompetenz, MAX_NIVEAU_TEXT), beispiel: kuerze(niveau.beispiel, MAX_NIVEAU_TEXT) }]
        }),
      ),
    }
  })

  return {
    quelle: dateiname,
    berufsfeld: feld,
    tq: parsed.tq ? kuerze(parsed.tq, 255) : null,
    baustein: parsed.baustein,
    ausbildungsbaustein: parsed.ausbildungsbaustein ? kuerze(parsed.ausbildungsbaustein, 200) : null,
    abschnitt: parsed.abschnitt,
    lernziele,
    hinweise,
  }
}
