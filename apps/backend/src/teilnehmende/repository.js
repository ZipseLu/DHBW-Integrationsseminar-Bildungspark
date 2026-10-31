/**
 * Datenzugriff für Teilnehmende und ihren Lernweg (MySQL, BE-02).
 *
 * Aufbau wie src/arbeitsblaetter/repository.js: alle Werte als Parameter (`?`),
 * Schreibzugriffe in einer Transaktion. Ein Profil und seine Stationen werden
 * immer zusammen geschrieben – der Lernweg wird beim Ändern komplett ersetzt.
 */
import { query, queryOne, withConnection } from '../db.js'
import { toIso } from '../arbeitsblaetter/repository.js'

const SPALTEN = 'kennung, stufe, erstellt_am, geaendert_am'
const STATION_SPALTEN = 'kennung, position, berufsfeld, stufe, format, status, fortschritt, start_datum, end_datum, blaetter_erledigt'

/** MySQL DATE (dateStrings) -> 'YYYY-MM-DD' oder null */
const datum = (value) => (value === null || value === undefined ? null : String(value).slice(0, 10))

export function stationToApi(row) {
  return {
    berufsfeld: row.berufsfeld,
    stufe: row.stufe,
    format: row.format,
    status: row.status,
    fortschritt: Number(row.fortschritt),
    startDatum: datum(row.start_datum),
    endDatum: datum(row.end_datum),
    blaetterErledigt: Number(row.blaetter_erledigt),
  }
}

/**
 * Gesamtfortschritt = Fortschritt der aktiven Station.
 * Keine aktive Station: 100, wenn alle abgeschlossen sind, sonst 0.
 */
export function gesamtFortschritt(stationen) {
  const aktiv = stationen.find((s) => s.status === 'aktiv')
  if (aktiv) return aktiv.fortschritt
  return stationen.length > 0 && stationen.every((s) => s.status === 'abgeschlossen') ? 100 : 0
}

/** Datenbankzeile + Stationen -> API-Objekt (camelCase, ISO-Zeiten) */
export function toApi(row, stationRows = []) {
  const stationen = [...stationRows].sort((a, b) => Number(a.position) - Number(b.position)).map(stationToApi)
  const geaendertAm = toIso(row.geaendert_am)
  return {
    kennung: row.kennung,
    stufe: row.stufe,
    fortschritt: gesamtFortschritt(stationen),
    zuletztAktiv: geaendertAm ? geaendertAm.slice(0, 10) : null,
    erstelltAm: toIso(row.erstellt_am),
    geaendertAm,
    stationen,
  }
}

// --- Lesen -------------------------------------------------------------------

/** Alle Profile mit Lernweg, sortiert nach Kennung */
export async function list() {
  const rows = await query(`SELECT ${SPALTEN} FROM teilnehmende ORDER BY kennung`)
  const stationen = await query(`SELECT ${STATION_SPALTEN} FROM teilnehmende_stationen ORDER BY kennung, position`)
  const jeKennung = new Map()
  for (const station of stationen) {
    if (!jeKennung.has(station.kennung)) jeKennung.set(station.kennung, [])
    jeKennung.get(station.kennung).push(station)
  }
  return rows.map((row) => toApi(row, jeKennung.get(row.kennung) ?? []))
}

export async function findByKennung(kennung) {
  const row = await queryOne(`SELECT ${SPALTEN} FROM teilnehmende WHERE kennung = ?`, [kennung])
  if (!row) return null
  const stationen = await query(`SELECT ${STATION_SPALTEN} FROM teilnehmende_stationen WHERE kennung = ? ORDER BY position`, [kennung])
  return toApi(row, stationen)
}

export async function count() {
  const row = await queryOne('SELECT COUNT(*) AS anzahl FROM teilnehmende')
  return Number(row?.anzahl ?? 0)
}

// --- Schreiben ---------------------------------------------------------------

async function schreibeStationen(connection, kennung, stationen) {
  await connection.execute('DELETE FROM teilnehmende_stationen WHERE kennung = ?', [kennung])
  for (const [position, s] of stationen.entries()) {
    await connection.execute(
      `INSERT INTO teilnehmende_stationen (${STATION_SPALTEN}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kennung, position, s.berufsfeld, s.stufe, s.format, s.status, s.fortschritt, s.startDatum ?? null, s.endDatum ?? null, s.blaetterErledigt],
    )
  }
}

/** Fehler, wenn die Kennung schon vergeben ist (Route -> 409) */
export class KennungVergebenError extends Error {
  constructor(kennung) {
    super(`Die Kennung ${kennung} ist schon vergeben`)
    this.name = 'KennungVergebenError'
    this.kennung = kennung
  }
}

/**
 * Legt ein Profil mit Lernweg an.
 * @param {{kennung: string, stufe: string, stationen: object[]}} input  bereits mit CreateSchema geprüft
 */
export async function create({ kennung, stufe, stationen }) {
  await withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      const jetzt = new Date()
      await connection.execute('INSERT INTO teilnehmende (kennung, stufe, erstellt_am, geaendert_am) VALUES (?, ?, ?, ?)', [kennung, stufe, jetzt, jetzt])
      await schreibeStationen(connection, kennung, stationen)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      if (error?.code === 'ER_DUP_ENTRY') throw new KennungVergebenError(kennung)
      throw error
    }
  })
  return findByKennung(kennung)
}

/**
 * Ersetzt Stufe und Lernweg. Zeilensperre wie bei den Arbeitsblättern,
 * damit zwei gleichzeitige Änderungen nacheinander laufen.
 * @returns {Promise<object|null>} aktualisiertes Profil oder null, wenn es fehlt
 */
export async function update(kennung, { stufe, stationen }) {
  const gefunden = await withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      const [rows] = await connection.execute('SELECT kennung FROM teilnehmende WHERE kennung = ? FOR UPDATE', [kennung])
      if (rows.length === 0) {
        await connection.rollback()
        return false
      }
      await connection.execute('UPDATE teilnehmende SET stufe = ?, geaendert_am = ? WHERE kennung = ?', [stufe, new Date(), kennung])
      await schreibeStationen(connection, kennung, stationen)
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
  return gefunden ? findByKennung(kennung) : null
}

/** Löscht ein Profil samt Lernweg (ON DELETE CASCADE). @returns {Promise<boolean>} */
export async function remove(kennung) {
  const result = await query('DELETE FROM teilnehmende WHERE kennung = ?', [kennung])
  return result.affectedRows > 0
}

/** Nur für Seed und Tests */
export async function deleteAll() {
  await query('DELETE FROM teilnehmende')
}
