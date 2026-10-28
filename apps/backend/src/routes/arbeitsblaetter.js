/**
 * Routen der Arbeitsblatt-Verwaltung (gespeicherte Blätter, MySQL).
 *
 *   GET    /api/arbeitsblaetter                  Liste mit Filtern und Seiten (ohne Inhalt)
 *   GET    /api/arbeitsblaetter/filteroptionen   Werte für die Dropdowns (Berufsfeld, Baustein, …)
 *   POST   /api/arbeitsblaetter                  Arbeitsblatt speichern (z. B. das Ergebnis von POST /api/ai/arbeitsblatt)
 *   GET    /api/arbeitsblaetter/:id              Ein Blatt mit Inhalt (aktuelle Version)
 *   PATCH  /api/arbeitsblaetter/:id              Inhalt, Status oder Favorit ändern (schreibt Verlauf)
 *   DELETE /api/arbeitsblaetter/:id              Archivieren; mit ?endgueltig=true löschen
 *   GET    /api/arbeitsblaetter/:id/verlauf      Alle Versionen (neueste zuerst)
 *   GET    /api/arbeitsblaetter/:id/versionen/:nr  Eine Version mit Inhalt
 *   GET    /api/arbeitsblaetter/:id/docx         Aktuelle Version als Word-Datei
 *
 * Ohne erreichbare MySQL antworten alle Routen mit 503 `db_unavailable`.
 * Details und Beispiele: docs/persistenz-arbeitsblaetter.md
 */
import { Router } from 'express'
import { arbeitsblattFileName, buildArbeitsblattDocx, DOCX_MIME } from '../arbeitsblatt/docx.js'
import { formatZodError, zodIssues } from '../arbeitsblatt/schema.js'
import * as repo from '../arbeitsblaetter/repository.js'
import { CreateSchema, ListQuerySchema, PatchSchema, isUuid } from '../arbeitsblaetter/schema.js'

const DB_FEHLER = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'])

/** Verbindungs- und Schemafehler der Datenbank -> 503 mit Handlungshinweis */
function dbError(error) {
  if (!DB_FEHLER.has(error?.code)) return null
  const hinweis =
    error.code === 'ER_NO_SUCH_TABLE'
      ? 'Tabellen fehlen – in apps/backend `npm run db:migrate` ausführen.'
      : 'MySQL nicht erreichbar – `docker compose up -d db` starten und DB_HOST/DB_PORT in der .env prüfen.'
  return { status: 503, body: { error: 'db_unavailable', message: `Die Datenbank ist nicht verfügbar. ${hinweis}`, details: error.code } }
}

function validationError(res, zodError, einleitung) {
  return res.status(400).json({ error: 'validation_error', message: `${einleitung} ${formatZodError(zodError)}`, details: zodIssues(zodError) })
}

const notFound = (res, id) => res.status(404).json({ error: 'not_found', message: `Arbeitsblatt ${id} existiert nicht` })

/** Fängt Fehler asynchroner Handler und übersetzt Datenbankfehler */
const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    const mapped = dbError(error)
    if (mapped) {
      console.error(`[arbeitsblaetter] ${error.code}: ${error.message}`)
      return res.status(mapped.status).json(mapped.body)
    }
    next(error)
  }
}

export function createArbeitsblaetterRouter() {
  const router = Router()

  router.get(
    '/',
    wrap(async (req, res) => {
      const parsed = ListQuerySchema.safeParse(req.query)
      if (!parsed.success) return validationError(res, parsed.error, 'Ungültige Filter:')
      res.json(await repo.list(parsed.data))
    }),
  )

  router.get(
    '/filteroptionen',
    wrap(async (_req, res) => {
      res.json(await repo.filterOptionen())
    }),
  )

  router.post(
    '/',
    wrap(async (req, res) => {
      const parsed = CreateSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Das Arbeitsblatt kann nicht gespeichert werden:')
      if (parsed.data.elternId && !(await repo.findById(parsed.data.elternId))) {
        return res.status(400).json({ error: 'validation_error', message: `elternId ${parsed.data.elternId} verweist auf kein vorhandenes Arbeitsblatt` })
      }
      const arbeitsblatt = await repo.create(parsed.data)
      res.status(201).location(`/api/arbeitsblaetter/${arbeitsblatt.id}`).json({ arbeitsblatt })
    }),
  )

  // Alles ab hier braucht eine gültige UUID – sonst 404 statt Datenbankfehler
  router.param('id', (req, res, next, id) => (isUuid(id) ? next() : notFound(res, id)))

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const arbeitsblatt = await repo.findById(req.params.id)
      if (!arbeitsblatt) return notFound(res, req.params.id)
      res.json({ arbeitsblatt })
    }),
  )

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const parsed = PatchSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Die Änderung ist ungültig:')
      const arbeitsblatt = await repo.update(req.params.id, parsed.data)
      if (!arbeitsblatt) return notFound(res, req.params.id)
      res.json({ arbeitsblatt })
    }),
  )

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      const endgueltig = req.query.endgueltig === 'true' || req.query.endgueltig === '1'
      if (endgueltig) {
        if (!(await repo.remove(req.params.id))) return notFound(res, req.params.id)
        return res.status(204).end()
      }
      const arbeitsblatt = await repo.update(req.params.id, { status: 'archiviert', notiz: req.body?.notiz, autor: req.body?.autor })
      if (!arbeitsblatt) return notFound(res, req.params.id)
      res.json({ arbeitsblatt })
    }),
  )

  router.get(
    '/:id/verlauf',
    wrap(async (req, res) => {
      if (!(await repo.findById(req.params.id))) return notFound(res, req.params.id)
      res.json({ eintraege: await repo.findVersionen(req.params.id, { mitInhalt: req.query.inhalt === 'true' }) })
    }),
  )

  router.get(
    '/:id/versionen/:nr',
    wrap(async (req, res) => {
      const nr = Number.parseInt(req.params.nr, 10)
      const version = Number.isInteger(nr) && nr > 0 ? await repo.findVersion(req.params.id, nr) : null
      if (!version) return res.status(404).json({ error: 'not_found', message: `Version ${req.params.nr} von Arbeitsblatt ${req.params.id} existiert nicht` })
      res.json({ version })
    }),
  )

  router.get(
    '/:id/docx',
    wrap(async (req, res) => {
      const arbeitsblatt = await repo.findById(req.params.id)
      if (!arbeitsblatt) return notFound(res, req.params.id)
      const buffer = await buildArbeitsblattDocx(arbeitsblatt.inhalt)
      const filename = arbeitsblattFileName(arbeitsblatt.inhalt)
      const asciiName = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')
      res.setHeader('Content-Type', DOCX_MIME)
      res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`)
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
      res.send(buffer)
    }),
  )

  return router
}
