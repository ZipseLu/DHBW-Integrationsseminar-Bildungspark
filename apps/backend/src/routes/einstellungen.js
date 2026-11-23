/**
 * Per-account UI settings (FE-20, MySQL table `einstellungen`).
 *
 *   GET  /api/einstellungen?konto=<email>  -> { einstellungen: {...} | null }
 *   PUT  /api/einstellungen?konto=<email>  -> { einstellungen: {...} }
 *        Body: { "einstellungen": { ... } } (the bare object is accepted too)
 *
 * Which account? A valid login token wins (`req.benutzer.id`). The prototype
 * has no login UI yet, so without a token the `konto` query parameter (email of
 * the currently displayed account) identifies the account. BE-06 will make the
 * token mandatory; until then this behaves like the other prototype routes.
 * Without a reachable MySQL all routes respond with 503 `db_unavailable`.
 * Details: docs/einstellungen-api.md
 */
import { Router } from 'express'
import { formatZodError, zodIssues } from '../arbeitsblatt/schema.js'
import * as benutzerRepo from '../benutzer/repository.js'
import * as repo from '../einstellungen/repository.js'
import { EinstellungenSchema, KontoSchema } from '../einstellungen/schema.js'

const DB_FEHLER = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'])

function dbError(error) {
  if (!DB_FEHLER.has(error?.code)) return null
  const hinweis =
    error.code === 'ER_NO_SUCH_TABLE'
      ? 'Tabellen fehlen – in apps/backend `npm run db:migrate` ausführen.'
      : 'MySQL nicht erreichbar – `docker compose up -d db` starten und DB_HOST/DB_PORT in der .env prüfen.'
  return { status: 503, body: { error: 'db_unavailable', message: `Die Datenbank ist nicht verfügbar. ${hinweis}`, details: error.code } }
}

const validationError = (res, zodError, einleitung) =>
  res.status(400).json({ error: 'validation_error', message: `${einleitung} ${formatZodError(zodError)}`, details: zodIssues(zodError) })

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    const mapped = dbError(error)
    if (mapped) {
      console.error(`[einstellungen] ${error.code}`)
      return res.status(mapped.status).json(mapped.body)
    }
    next(error)
  }
}

/**
 * Id of the account whose settings are being read/written.
 * `undefined` means the response was already sent (invalid/missing `konto`),
 * `null` means the account does not exist.
 */
async function kontoId(req, res) {
  if (req.benutzer?.id) return (await benutzerRepo.findById(req.benutzer.id))?.id ?? null

  const parsed = KontoSchema.safeParse(req.query.konto)
  if (!parsed.success) {
    validationError(res, parsed.error, 'Für die Einstellungen wird ein Konto (E-Mail-Adresse) benötigt:')
    return undefined
  }
  return (await benutzerRepo.findByEmail(parsed.data))?.id ?? null
}

const kontoNichtGefunden = (res) => res.status(404).json({ error: 'not_found', message: 'Das Konto für die Einstellungen existiert nicht' })

export function createEinstellungenRouter() {
  const router = Router()

  router.get(
    '/',
    wrap(async (req, res) => {
      const id = await kontoId(req, res)
      if (id === undefined) return
      if (!id) return kontoNichtGefunden(res)
      res.json({ einstellungen: await repo.get(id) })
    }),
  )

  router.put(
    '/',
    wrap(async (req, res) => {
      const id = await kontoId(req, res)
      if (id === undefined) return
      if (!id) return kontoNichtGefunden(res)

      const parsed = EinstellungenSchema.safeParse(req.body?.einstellungen ?? req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Die Einstellungen sind ungültig:')

      res.json({ einstellungen: await repo.upsert(id, parsed.data) })
    }),
  )

  return router
}
