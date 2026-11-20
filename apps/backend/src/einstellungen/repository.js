/**
 * Data access for per-account UI settings (FE-20, table `einstellungen`).
 *
 * One row per account (`benutzer_id` = users.id), the complete AppSettings
 * object as JSON. The frontend knows the defaults; this module only stores and
 * returns what was actually saved.
 */
import { query, queryOne } from '../db.js'

/** @returns {Promise<object|null>} gespeicherte Einstellungen oder null */
export async function get(benutzerId) {
  const row = await queryOne('SELECT werte FROM einstellungen WHERE benutzer_id = ?', [benutzerId])
  if (!row) return null
  return typeof row.werte === 'string' ? JSON.parse(row.werte) : row.werte
}

/**
 * Speichert Einstellungen, vorhandene Werte bleiben erhalten (teilweises PUT).
 * @returns {Promise<object>} der vollständige gespeicherte Datensatz
 */
export async function upsert(benutzerId, werte) {
  const gespeichert = { ...(await get(benutzerId)), ...werte }
  await query(
    `INSERT INTO einstellungen (benutzer_id, werte) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE werte = VALUES(werte), geaendert_am = CURRENT_TIMESTAMP(3)`,
    [benutzerId, JSON.stringify(gespeichert)],
  )
  return gespeichert
}

/** Nur fuer Tests: Einstellungen eines Kontos entfernen. */
export async function remove(benutzerId) {
  await query('DELETE FROM einstellungen WHERE benutzer_id = ?', [benutzerId])
}
