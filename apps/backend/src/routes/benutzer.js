/**
 * Routen der Benutzerverwaltung (BE-03, MySQL, Tabelle `users`).
 *
 *   GET    /api/benutzer       alle Konten (ohne Passwort-Hash)
 *   POST   /api/benutzer       Konto anlegen (409, wenn die E-Mail vergeben ist)
 *   GET    /api/benutzer/:id   ein Konto
 *   PATCH  /api/benutzer/:id   Name, E-Mail, Rolle und/oder Passwort ändern
 *   DELETE /api/benutzer/:id   Konto löschen
 *
 * Regeln: das letzte Admin-Konto kann weder gelöscht noch herabgestuft werden (409);
 * das eigene Konto kann nicht gelöscht werden (409, sobald BE-01 req.benutzer setzt).
 * Nur für Admins – die Prüfung greift, sobald die Anmeldung (BE-01) da ist (src/auth/rollen.js).
 * Ohne erreichbare MySQL antworten alle Routen mit 503 `db_unavailable`.
 * Details: docs/benutzerverwaltung-api.md
 */
import { Router } from 'express'
import { formatZodError, zodIssues } from '../arbeitsblatt/schema.js'
import { erfordereRolle } from '../auth/rollen.js'
import * as repo from '../benutzer/repository.js'
import { CreateSchema, PatchSchema } from '../benutzer/schema.js'
import { isUuid } from '../arbeitsblaetter/schema.js'

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

const notFound = (res, id) => res.status(404).json({ error: 'not_found', message: `Konto ${id} existiert nicht` })

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    if (error instanceof repo.BenutzerKonfliktError) {
      return res.status(409).json({ error: 'conflict', code: error.code, message: error.message })
    }
    const mapped = dbError(error)
    if (mapped) {
      console.error(`[benutzer] ${error.code}: ${error.message}`)
      return res.status(mapped.status).json(mapped.body)
    }
    next(error)
  }
}

export function createBenutzerRouter() {
  const router = Router()
  router.use(erfordereRolle('admin'))

  router.get(
    '/',
    wrap(async (_req, res) => {
      const eintraege = await repo.list()
      res.json({ eintraege, gesamt: eintraege.length })
    }),
  )

  router.post(
    '/',
    wrap(async (req, res) => {
      const parsed = CreateSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Das Konto kann nicht angelegt werden:')
      const benutzer = await repo.create(parsed.data)
      res.status(201).location(`/api/benutzer/${benutzer.id}`).json({ benutzer })
    }),
  )

  router.param('id', (req, res, next, id) => (isUuid(id) ? next() : notFound(res, id)))

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const benutzer = await repo.findById(req.params.id)
      if (!benutzer) return notFound(res, req.params.id)
      res.json({ benutzer })
    }),
  )

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const parsed = PatchSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Die Änderung ist ungültig:')
      const benutzer = await repo.update(req.params.id, parsed.data)
      if (!benutzer) return notFound(res, req.params.id)
      res.json({ benutzer })
    }),
  )

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      if (req.benutzer?.id === req.params.id) {
        return res.status(409).json({ error: 'conflict', code: 'eigenes_konto', message: 'Das eigene Konto kann nicht gelöscht werden' })
      }
      if (!(await repo.remove(req.params.id))) return notFound(res, req.params.id)
      res.status(204).end()
    }),
  )

  return router
}
