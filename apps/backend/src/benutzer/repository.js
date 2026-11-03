/**
 * Datenzugriff für Mitarbeiterkonten (Tabelle `users`, BE-03).
 *
 * Die Tabelle stammt aus Migration 001 (Spalten id, email, name, password_hash,
 * role, created_at). Die API spricht Deutsch (`rolle`, `erstelltAm`); der
 * Passwort-Hash verlässt dieses Modul nie – außer über `findForLogin` für BE-01.
 */
import { randomUUID } from 'node:crypto'
import { query, queryOne, withConnection } from '../db.js'
import { toIso } from '../arbeitsblaetter/repository.js'
import { hashPasswort } from './passwort.js'

const SPALTEN = 'id, name, email, role, created_at'

export function toApi(row) {
  return { id: row.id, name: row.name, email: row.email, rolle: row.role, erstelltAm: toIso(row.created_at) }
}

/** Fachliche Regel verletzt (Route -> 409) */
export class BenutzerKonfliktError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'BenutzerKonfliktError'
    this.code = code
  }
}

const emailVergeben = (email) => new BenutzerKonfliktError(`Die E-Mail-Adresse ${email} ist schon vergeben`, 'email_vergeben')
const letzterAdmin = () => new BenutzerKonfliktError('Das letzte Admin-Konto kann nicht entfernt oder herabgestuft werden', 'letzter_admin')

// --- Lesen -------------------------------------------------------------------

export async function list() {
  const rows = await query(`SELECT ${SPALTEN} FROM users ORDER BY name, email`)
  return rows.map(toApi)
}

export async function findById(id) {
  const row = await queryOne(`SELECT ${SPALTEN} FROM users WHERE id = ?`, [id])
  return row ? toApi(row) : null
}

/** Nur für die Anmeldung (BE-01): Konto samt Passwort-Hash */
export async function findForLogin(email) {
  const row = await queryOne(`SELECT ${SPALTEN}, password_hash FROM users WHERE email = ?`, [String(email).trim().toLowerCase()])
  return row ? { ...toApi(row), passwortHash: row.password_hash } : null
}

export async function count() {
  const row = await queryOne('SELECT COUNT(*) AS anzahl FROM users')
  return Number(row?.anzahl ?? 0)
}

// --- Schreiben ---------------------------------------------------------------

/** @param {{name: string, email: string, rolle: string, passwort: string}} input  mit CreateSchema geprüft */
export async function create({ name, email, rolle, passwort }) {
  const id = randomUUID()
  const hash = await hashPasswort(passwort)
  try {
    await query('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, email, name, hash, rolle, new Date()])
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw emailVergeben(email)
    throw error
  }
  return findById(id)
}

/**
 * Ändert Name, E-Mail, Rolle und/oder Passwort.
 * Schützt das letzte Admin-Konto vor dem Herabstufen (Zeilensperre auf allen Admins).
 * @returns {Promise<object|null>} geändertes Konto oder null, wenn es fehlt
 */
export async function update(id, { name, email, rolle, passwort }) {
  const hash = passwort ? await hashPasswort(passwort) : null
  const gefunden = await withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      const [rows] = await connection.execute('SELECT id, role FROM users WHERE id = ? FOR UPDATE', [id])
      if (rows.length === 0) {
        await connection.rollback()
        return false
      }
      if (rolle && rolle !== 'admin' && rows[0].role === 'admin') {
        const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' FOR UPDATE")
        if (admins.length <= 1) throw letzterAdmin()
      }
      const felder = []
      const werte = []
      if (name !== undefined) felder.push('name = ?'), werte.push(name)
      if (email !== undefined) felder.push('email = ?'), werte.push(email)
      if (rolle !== undefined) felder.push('role = ?'), werte.push(rolle)
      if (hash) felder.push('password_hash = ?'), werte.push(hash)
      await connection.execute(`UPDATE users SET ${felder.join(', ')} WHERE id = ?`, [...werte, id])
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      if (error?.code === 'ER_DUP_ENTRY') throw emailVergeben(email)
      throw error
    }
  })
  return gefunden ? findById(id) : null
}

/**
 * Löscht ein Konto. Das letzte Admin-Konto bleibt bestehen.
 * @returns {Promise<boolean>} false, wenn es das Konto nicht gibt
 */
export async function remove(id) {
  return withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      const [rows] = await connection.execute('SELECT role FROM users WHERE id = ? FOR UPDATE', [id])
      if (rows.length === 0) {
        await connection.rollback()
        return false
      }
      if (rows[0].role === 'admin') {
        const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' FOR UPDATE")
        if (admins.length <= 1) throw letzterAdmin()
      }
      await connection.execute('DELETE FROM users WHERE id = ?', [id])
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

/** Nur für Seed und Tests */
export async function deleteAll() {
  await query('DELETE FROM users')
}
