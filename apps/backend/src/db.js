/**
 * MySQL-Verbindungspool (mysql2/promise).
 *
 * Wichtig: Im Docker-Compose heisst der Host `db`, nicht `localhost` –
 * `localhost` wuerde innerhalb des Backend-Containers ins Leere zeigen.
 */
import mysql from 'mysql2/promise'
import { config } from './config.js'

let pool = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      charset: 'utf8mb4_unicode_ci',
      // Wir wollen DATETIME als String, nicht als lokales JS-Date-Objekt,
      // sonst verschiebt der Treiber die Zeiten in die lokale Zeitzone.
      dateStrings: ['DATE', 'DATETIME'],
      timezone: 'Z',
    })
  }
  return pool
}

/** Fuehrt `fn` mit einer Verbindung aus und gibt sie danach garantiert frei. */
export async function withConnection(fn) {
  const connection = await getPool().getConnection()
  try {
    return await fn(connection)
  } finally {
    connection.release()
  }
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] ?? null
}

/** Healthcheck: Verbindung + triviale Query. */
export async function ping() {
  const started = Date.now()
  await query('SELECT 1 AS ok')
  return { ok: true, latencyMs: Date.now() - started }
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
