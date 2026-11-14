/**
 * Data access for uploaded worksheets (table `uploads`, migration 005).
 *
 * Lists never load the file bytes or the full text – only a short preview –
 * so the overview stays fast even with many 20 MB files.
 */
import { randomUUID } from 'node:crypto'
import { query, queryOne } from '../db.js'
import { toIso } from '../arbeitsblaetter/repository.js'

export const VORSCHAU_ZEICHEN = 200

const SPALTEN = `id, dateiname, dateityp, groesse, text_quelle, berufsfeld, thema, hochgeladen_von, hochgeladen_am, geaendert_am,
  CHAR_LENGTH(text) AS text_laenge, LEFT(text, ${VORSCHAU_ZEICHEN}) AS text_vorschau, datei IS NOT NULL AS hat_datei`

export function toApi(row, { mitText = false } = {}) {
  const upload = {
    id: row.id,
    dateiname: row.dateiname,
    dateityp: row.dateityp,
    groesse: Number(row.groesse),
    hatDatei: Boolean(Number(row.hat_datei)),
    textQuelle: row.text_quelle ?? null,
    textLaenge: row.text_laenge === null || row.text_laenge === undefined ? 0 : Number(row.text_laenge),
    textVorschau: row.text_vorschau ?? null,
    berufsfeld: row.berufsfeld ?? null,
    thema: row.thema ?? null,
    hochgeladenVon: row.hochgeladen_von ?? null,
    hochgeladenAm: toIso(row.hochgeladen_am),
    geaendertAm: toIso(row.geaendert_am),
  }
  if (mitText) upload.text = row.text ?? null
  return upload
}

/** Newest first; `q` searches file name, topic and text, `berufsfeld` filters exactly */
export async function list({ q, berufsfeld } = {}) {
  const where = []
  const params = []
  if (berufsfeld) {
    where.push('berufsfeld = ?')
    params.push(berufsfeld)
  }
  if (q) {
    where.push('(dateiname LIKE ? OR thema LIKE ? OR text LIKE ?)')
    const muster = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    params.push(muster, muster, muster)
  }
  const rows = await query(`SELECT ${SPALTEN} FROM uploads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY hochgeladen_am DESC, id`, params)
  return rows.map((row) => toApi(row))
}

/** One upload with its full text (without file bytes) */
export async function findById(id) {
  const row = await queryOne(`SELECT ${SPALTEN}, text FROM uploads WHERE id = ?`, [id])
  return row ? toApi(row, { mitText: true }) : null
}

/** File bytes for the download; null if the upload does not exist or has no file */
export async function findDatei(id) {
  const row = await queryOne('SELECT dateiname, dateityp, datei FROM uploads WHERE id = ?', [id])
  if (!row || row.datei === null) return null
  return { dateiname: row.dateiname, dateityp: row.dateityp, datei: Buffer.from(row.datei) }
}

/**
 * Stores an upload.
 * @param {{dateiname: string, dateityp: string, datei: Buffer|null, text: string|null, textQuelle: string|null,
 *          berufsfeld?: string, thema?: string, hochgeladenVon?: string|null}} input
 */
export async function create(input) {
  const id = randomUUID()
  const jetzt = new Date()
  await query(
    `INSERT INTO uploads (id, dateiname, dateityp, groesse, datei, text, text_quelle, berufsfeld, thema, hochgeladen_von, hochgeladen_am, geaendert_am)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.dateiname,
      input.dateityp,
      input.datei ? input.datei.length : Buffer.byteLength(input.text ?? '', 'utf8'),
      input.datei ?? null,
      input.text ?? null,
      input.textQuelle ?? null,
      input.berufsfeld ?? null,
      input.thema ?? null,
      input.hochgeladenVon ?? null,
      jetzt,
      jetzt,
    ],
  )
  return findById(id)
}

/**
 * Changes text, Berufsfeld or topic. A changed text gets the source 'bearbeitet';
 * `text: null` removes it.
 * @returns {Promise<object|null>} updated upload or null if it does not exist
 */
export async function update(id, patch) {
  const sets = []
  const params = []
  if (patch.text !== undefined) {
    const text = patch.text === null || patch.text === '' ? null : patch.text
    sets.push('text = ?', 'text_quelle = ?')
    params.push(text, text === null ? null : 'bearbeitet')
  }
  for (const [feld, spalte] of [['berufsfeld', 'berufsfeld'], ['thema', 'thema']]) {
    if (patch[feld] !== undefined) {
      sets.push(`${spalte} = ?`)
      params.push(patch[feld])
    }
  }
  sets.push('geaendert_am = ?')
  params.push(new Date(), id)
  const result = await query(`UPDATE uploads SET ${sets.join(', ')} WHERE id = ?`, params)
  return result.affectedRows > 0 ? findById(id) : null
}

/** @returns {Promise<boolean>} false if the upload does not exist */
export async function remove(id) {
  const result = await query('DELETE FROM uploads WHERE id = ?', [id])
  return result.affectedRows > 0
}

/** Only for tests */
export async function deleteAll() {
  await query('DELETE FROM uploads')
}
