/**
 * Routen der Teilnehmenden-Verwaltung (BE-02, MySQL).
 *
 *   GET    /api/teilnehmende            alle Profile mit Lernweg
 *   POST   /api/teilnehmende            Profil anlegen (409, wenn die Kennung vergeben ist)
 *   GET    /api/teilnehmende/:kennung   ein Profil
 *   PUT    /api/teilnehmende/:kennung   Stufe und kompletten Lernweg ersetzen
 *   DELETE /api/teilnehmende/:kennung   Profil samt Lernweg löschen
 *
 * § 60 SGB IX: nur pseudonyme Kennungen, keine Namen (siehe src/teilnehmende/schema.js).
 * Ohne erreichbare MySQL antworten alle Routen mit 503 `db_unavailable`.
 * Details und Beispiele: docs/persistenz-teilnehmende.md
 */
import { Router } from 'express'
import { formatZodError, zodIssues } from '../arbeitsblatt/schema.js'
import * as repo from '../teilnehmende/repository.js'
import { CreateSchema, UpdateSchema, istKennung, normalisiereKennung } from '../teilnehmende/schema.js'

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

const notFound = (res, kennung) => res.status(404).json({ error: 'not_found', message: `Teilnehmende/r ${kennung} existiert nicht` })

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    if (error instanceof repo.KennungVergebenError) {
      return res.status(409).json({ error: 'conflict', message: error.message })
    }
    const mapped = dbError(error)
    if (mapped) {
      console.error(`[teilnehmende] ${error.code}: ${error.message}`)
      return res.status(mapped.status).json(mapped.body)
    }
    next(error)
  }
}

export function createTeilnehmendeRouter() {
  const router = Router()

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
      if (!parsed.success) return validationError(res, parsed.error, 'Das Profil kann nicht angelegt werden:')
      const teilnehmer = await repo.create(parsed.data)
      res.status(201).location(`/api/teilnehmende/${encodeURIComponent(teilnehmer.kennung)}`).json({ teilnehmer })
    }),
  )

  // Ungültige Kennung in der URL -> 404 statt Datenbankabfrage
  router.param('kennung', (req, res, next, kennung) => {
    if (!istKennung(kennung)) return notFound(res, kennung)
    // Normalisierte Kennung (Großbuchstaben) für die Handler
    res.locals.kennung = normalisiereKennung(kennung)
    next()
  })

  router.get(
    '/:kennung',
    wrap(async (req, res) => {
      const teilnehmer = await repo.findByKennung(res.locals.kennung)
      if (!teilnehmer) return notFound(res, res.locals.kennung)
      res.json({ teilnehmer })
    }),
  )

  router.put(
    '/:kennung',
    wrap(async (req, res) => {
      const parsed = UpdateSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Die Änderung ist ungültig:')
      if (parsed.data.kennung && parsed.data.kennung !== res.locals.kennung) {
        return res.status(400).json({ error: 'validation_error', message: 'Die Kennung kann nicht geändert werden – Profil löschen und neu anlegen.' })
      }
      const teilnehmer = await repo.update(res.locals.kennung, parsed.data)
      if (!teilnehmer) return notFound(res, res.locals.kennung)
      res.json({ teilnehmer })
    }),
  )

  router.delete(
    '/:kennung',
    wrap(async (req, res) => {
      if (!(await repo.remove(res.locals.kennung))) return notFound(res, res.locals.kennung)
      res.status(204).end()
    }),
  )

  return router
}
