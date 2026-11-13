/**
 * Shared error handling for the API routes (BE-01, BE-04).
 *
 * Same behaviour as the helpers that routes/arbeitsblaetter.js, teilnehmende.js and
 * benutzer.js each define for themselves – new routers use this module instead of a
 * fourth copy. The older routers can switch over in a later clean-up.
 *
 *   wrap(bereich)(handler)  catches errors of async handlers:
 *                           KonfliktError -> 409, NichtGefundenError -> 404 (both with `code`),
 *                           database connection/schema errors -> 503 db_unavailable,
 *                           everything else -> central error handler (500)
 *   validationError(...)    400 with the zod issues
 */
import { formatZodError, zodIssues } from '../arbeitsblatt/schema.js'

const DB_FEHLER = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'])

/** Database connection and schema errors -> 503 with a hint what to do */
export function dbError(error) {
  if (!DB_FEHLER.has(error?.code)) return null
  const hinweis =
    error.code === 'ER_NO_SUCH_TABLE'
      ? 'Tabellen fehlen – in apps/backend `npm run db:migrate` ausführen.'
      : 'MySQL nicht erreichbar – `docker compose up -d db` starten und DB_HOST/DB_PORT in der .env prüfen.'
  return { status: 503, body: { error: 'db_unavailable', message: `Die Datenbank ist nicht verfügbar. ${hinweis}`, details: error.code } }
}

export function validationError(res, zodError, einleitung) {
  return res.status(400).json({ error: 'validation_error', message: `${einleitung} ${formatZodError(zodError)}`, details: zodIssues(zodError) })
}

/** A business rule was violated (route -> 409 with the machine-readable `code`) */
export class KonfliktError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'KonfliktError'
    this.code = code
  }
}

/** Something the request refers to does not exist (route -> 404 with `code`) */
export class NichtGefundenError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'NichtGefundenError'
    this.code = code
  }
}

/** Catches errors of async handlers; `bereich` prefixes the log line, e.g. "[auth]" */
export const wrap = (bereich) => (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    if (error instanceof KonfliktError) return res.status(409).json({ error: 'conflict', code: error.code, message: error.message })
    if (error instanceof NichtGefundenError) return res.status(404).json({ error: 'not_found', code: error.code, message: error.message })
    const mapped = dbError(error)
    if (mapped) {
      console.error(`[${bereich}] ${error.code}: ${error.message}`)
      return res.status(mapped.status).json(mapped.body)
    }
    next(error)
  }
}
