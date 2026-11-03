/**
 * Data access for the assignments worksheet ↔ participant (table `zuordnungen`, BE-04).
 *
 * Every assignment is returned together with the key data of its worksheet (title,
 * Berufsfeld, level …), so the frontend needs no second request per sheet.
 * All values as parameters (`?`), like the other repositories.
 */
import { randomUUID } from 'node:crypto'
import { query, queryOne } from '../db.js'
import { toIso } from '../arbeitsblaetter/repository.js'
import { KonfliktError, NichtGefundenError } from '../http/fehler.js'
import * as teilnehmendeRepo from '../teilnehmende/repository.js'
import { berechneLernstand } from './lernstand.js'

const SELECT = `
  SELECT z.id, z.kennung, z.arbeitsblatt_id, z.status, z.zugeordnet_am, z.erledigt_am, z.zugeordnet_von,
         a.titel, a.berufsfeld, a.baustein, a.ausbildungsbaustein, a.lernziel, a.stufe, a.format, a.sprache,
         a.status AS blatt_status
    FROM zuordnungen z
    JOIN arbeitsblaetter a ON a.id = z.arbeitsblatt_id`

const REIHENFOLGE = 'ORDER BY z.zugeordnet_am, z.id'

export function toApi(row) {
  return {
    id: row.id,
    kennung: row.kennung,
    status: row.status,
    zugeordnetAm: toIso(row.zugeordnet_am),
    erledigtAm: toIso(row.erledigt_am),
    zugeordnetVon: row.zugeordnet_von ?? null,
    arbeitsblatt: {
      id: row.arbeitsblatt_id,
      titel: row.titel,
      berufsfeld: row.berufsfeld,
      baustein: row.baustein === null ? null : Number(row.baustein),
      ausbildungsbaustein: row.ausbildungsbaustein ?? null,
      lernziel: row.lernziel,
      stufe: row.stufe,
      format: row.format,
      sprache: row.sprache,
      status: row.blatt_status,
    },
  }
}

const teilnehmerFehlt = (kennung) => new NichtGefundenError(`Teilnehmende/r ${kennung} existiert nicht`, 'teilnehmer_unbekannt')

async function pruefeTeilnehmer(kennung) {
  const row = await queryOne('SELECT kennung FROM teilnehmende WHERE kennung = ?', [kennung])
  if (!row) throw teilnehmerFehlt(kennung)
}

// --- Read --------------------------------------------------------------------

/** Assignments of one participant, oldest first; 404 if the participant does not exist */
export async function listFuer(kennung, { status } = {}) {
  await pruefeTeilnehmer(kennung)
  const rows = status
    ? await query(`${SELECT} WHERE z.kennung = ? AND z.status = ? ${REIHENFOLGE}`, [kennung, status])
    : await query(`${SELECT} WHERE z.kennung = ? ${REIHENFOLGE}`, [kennung])
  return rows.map(toApi)
}

export async function findById(kennung, id) {
  const row = await queryOne(`${SELECT} WHERE z.id = ? AND z.kennung = ?`, [id, kennung])
  return row ? toApi(row) : null
}

/** Learning status of one participant (404 if unknown) */
export async function lernstandFuer(kennung) {
  const teilnehmer = await teilnehmendeRepo.findByKennung(kennung)
  if (!teilnehmer) throw teilnehmerFehlt(kennung)
  const rows = await query(`${SELECT} WHERE z.kennung = ? ${REIHENFOLGE}`, [kennung])
  return berechneLernstand(teilnehmer, rows.map(toApi))
}

/** Learning status of all participants (overview and dashboard) – two queries in total */
export async function lernstandAlle() {
  const teilnehmende = await teilnehmendeRepo.list()
  const rows = await query(`${SELECT} ${REIHENFOLGE}`)
  const jeKennung = new Map()
  for (const zuordnung of rows.map(toApi)) {
    if (!jeKennung.has(zuordnung.kennung)) jeKennung.set(zuordnung.kennung, [])
    jeKennung.get(zuordnung.kennung).push(zuordnung)
  }
  return teilnehmende.map((teilnehmer) => berechneLernstand(teilnehmer, jeKennung.get(teilnehmer.kennung) ?? []))
}

export async function count() {
  const row = await queryOne('SELECT COUNT(*) AS anzahl FROM zuordnungen')
  return Number(row?.anzahl ?? 0)
}

// --- Write -------------------------------------------------------------------

/**
 * Assigns a saved worksheet to a participant.
 * @throws {NichtGefundenError} participant or worksheet unknown (404)
 * @throws {KonfliktError} sheet archived or already assigned (409)
 */
export async function create(kennung, { arbeitsblattId, zugeordnetVon = null }) {
  await pruefeTeilnehmer(kennung)
  const blatt = await queryOne('SELECT status FROM arbeitsblaetter WHERE id = ?', [arbeitsblattId])
  if (!blatt) throw new NichtGefundenError(`Arbeitsblatt ${arbeitsblattId} existiert nicht`, 'arbeitsblatt_unbekannt')
  if (blatt.status === 'archiviert') {
    throw new KonfliktError('Archivierte Arbeitsblätter können nicht zugeordnet werden – erst wiederherstellen', 'blatt_archiviert')
  }

  const id = randomUUID()
  try {
    await query('INSERT INTO zuordnungen (id, kennung, arbeitsblatt_id, status, zugeordnet_am, zugeordnet_von) VALUES (?, ?, ?, ?, ?, ?)', [
      id, kennung, arbeitsblattId, 'offen', new Date(), zugeordnetVon,
    ])
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw new KonfliktError(`Das Arbeitsblatt ist ${kennung} schon zugeordnet`, 'bereits_zugeordnet')
    // Profile or sheet deleted between the check above and the insert
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') throw new NichtGefundenError('Teilnehmende/r oder Arbeitsblatt existiert nicht mehr', 'nicht_gefunden')
    throw error
  }
  return findById(kennung, id)
}

/**
 * Ticks an assignment off (`erledigt`, keeps the first completion time) or reopens it.
 * @returns {Promise<object|null>} updated assignment, or null if it does not exist
 */
export async function updateStatus(kennung, id, status) {
  await query(
    `UPDATE zuordnungen
        SET erledigt_am = CASE WHEN ? = 'erledigt' THEN COALESCE(erledigt_am, ?) ELSE NULL END,
            status = ?
      WHERE id = ? AND kennung = ?`,
    [status, new Date(), status, id, kennung],
  )
  return findById(kennung, id)
}

/** @returns {Promise<boolean>} false if the assignment does not exist */
export async function remove(kennung, id) {
  const result = await query('DELETE FROM zuordnungen WHERE id = ? AND kennung = ?', [id, kennung])
  return result.affectedRows > 0
}

/** Only for seed and tests */
export async function deleteAll() {
  await query('DELETE FROM zuordnungen')
}
