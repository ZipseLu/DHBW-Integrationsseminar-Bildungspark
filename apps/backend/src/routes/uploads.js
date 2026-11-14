/**
 * Upload of existing worksheets (Trello "Upload von Arbeitsblättern", MySQL table `uploads`).
 *
 *   POST   /api/uploads              upload a file: body = the file bytes,
 *                                    header X-Dateiname (URI-encoded), query ?berufsfeld=&thema=
 *                                    – or Content-Type application/json { text, titel? } for pasted text
 *   GET    /api/uploads              list, newest first (?q=, ?berufsfeld=), without file and full text
 *   GET    /api/uploads/:id          one upload with its full text
 *   GET    /api/uploads/:id/datei    the original file (?anzeigen=true shows PDFs/images in the browser)
 *   PATCH  /api/uploads/:id          { text?, berufsfeld?, thema? } – e.g. add the text of a PDF by hand
 *   DELETE /api/uploads/:id          delete upload and file
 *
 * The file is sent as raw body instead of multipart/form-data, so no extra parser
 * library is needed (frontend: fetch(url, { method: 'POST', body: file })).
 * Allowed: PDF, Word, text, PNG/JPEG up to 20 MB; the type is checked from the content.
 * Who uploaded comes from the login once BE-01 is merged (req.benutzer), until then from ?hochgeladenVon=.
 * Without a reachable MySQL: 503 db_unavailable. Details: docs/uploads-api.md
 */
import express, { Router } from 'express'
import { isUuid } from '../arbeitsblaetter/schema.js'
import { formatZodError, zodIssues } from '../arbeitsblatt/schema.js'
import { bestimmeDateityp, DateitypError, DATEITYPEN, MAX_DATEI_BYTES } from '../uploads/dateityp.js'
import * as repo from '../uploads/repository.js'
import { dateinameAusHeader, ListQuerySchema, PatchSchema, TextUploadSchema, UploadQuerySchema } from '../uploads/schema.js'
import { leseText } from '../uploads/text.js'

// Same error handling as routes/teilnehmende.js; switch to the shared module from BE-01 once it is merged
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
      console.error(`[uploads] ${error.code}: ${error.message}`)
      return res.status(mapped.status).json(mapped.body)
    }
    next(error)
  }
}

const uploadFehlt = (res, id) => res.status(404).json({ error: 'not_found', code: 'upload_unbekannt', message: `Upload ${id} existiert nicht` })

/** Reads any non-JSON body as raw bytes, with the size limit mapped to a clear 413 */
function rohdaten(req, res, next) {
  if (req.is('application/json')) return next()
  express.raw({ type: () => true, limit: MAX_DATEI_BYTES })(req, res, (error) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'payload_too_large', code: 'datei_zu_gross', message: 'Die Datei ist größer als 20 MB.' })
    }
    next(error)
  })
}

/** Safe Content-Disposition with an ASCII fallback and the UTF-8 name */
function contentDisposition(art, dateiname) {
  const ascii = dateiname.normalize('NFKD').replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `${art}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(dateiname)}`
}

export function createUploadsRouter() {
  const router = Router()

  router.param('id', (req, res, next, id) => (isUuid(id) ? next() : uploadFehlt(res, id)))

  router.post(
    '/',
    rohdaten,
    wrap(async (req, res) => {
      // Pasted text (copy & paste instead of a file)
      if (req.is('application/json')) {
        const parsed = TextUploadSchema.safeParse(req.body ?? {})
        if (!parsed.success) return validationError(res, parsed.error, 'Der Text kann nicht gespeichert werden:')
        const { text, titel, berufsfeld, thema, hochgeladenVon } = parsed.data
        const upload = await repo.create({
          dateiname: `${(titel ?? thema ?? 'Eingefügter Text').slice(0, 240)}.txt`,
          dateityp: 'txt',
          datei: null,
          text,
          textQuelle: 'eingefuegt',
          berufsfeld,
          thema: thema ?? titel,
          hochgeladenVon: req.benutzer?.name ?? hochgeladenVon ?? null,
        })
        return res.status(201).location(`/api/uploads/${upload.id}`).json({ upload, hinweise: [] })
      }

      const query = UploadQuerySchema.safeParse(req.query)
      if (!query.success) return validationError(res, query.error, 'Die Datei kann nicht gespeichert werden:')
      const dateiname = dateinameAusHeader(req.get('x-dateiname'))
      if (!dateiname) {
        return res.status(400).json({ error: 'validation_error', code: 'dateiname_fehlt', message: 'Header X-Dateiname fehlt oder ist ungültig (Dateiname, URI-kodiert).' })
      }
      const datei = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
      if (datei.length === 0) return res.status(400).json({ error: 'validation_error', code: 'datei_leer', message: 'Die Datei ist leer.' })

      let dateityp
      try {
        dateityp = bestimmeDateityp(dateiname, datei)
      } catch (error) {
        if (error instanceof DateitypError) return res.status(error.status).json({ error: 'unsupported_media_type', code: error.code, message: error.message })
        throw error
      }

      const { text, hinweis } = leseText(dateityp, datei)
      const upload = await repo.create({
        dateiname,
        dateityp,
        datei,
        text,
        textQuelle: text ? 'datei' : null,
        berufsfeld: query.data.berufsfeld,
        thema: query.data.thema,
        hochgeladenVon: req.benutzer?.name ?? query.data.hochgeladenVon ?? null,
      })
      res.status(201).location(`/api/uploads/${upload.id}`).json({ upload, hinweise: hinweis ? [hinweis] : [] })
    }),
  )

  router.get(
    '/',
    wrap(async (req, res) => {
      const parsed = ListQuerySchema.safeParse(req.query)
      if (!parsed.success) return validationError(res, parsed.error, 'Ungültiger Filter:')
      const eintraege = await repo.list(parsed.data)
      res.json({ eintraege, gesamt: eintraege.length })
    }),
  )

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const upload = await repo.findById(req.params.id)
      if (!upload) return uploadFehlt(res, req.params.id)
      res.json({ upload })
    }),
  )

  router.get(
    '/:id/datei',
    wrap(async (req, res) => {
      const eintrag = await repo.findDatei(req.params.id)
      if (!eintrag) return res.status(404).json({ error: 'not_found', code: 'datei_unbekannt', message: `Zu Upload ${req.params.id} gibt es keine Datei` })
      const typ = DATEITYPEN[eintrag.dateityp]
      // Only PDFs and images may be shown inline; everything else is always downloaded
      const anzeigen = req.query.anzeigen === 'true' && ['pdf', 'png', 'jpg'].includes(eintrag.dateityp)
      res.setHeader('Content-Type', typ.mime)
      res.setHeader('Content-Length', String(eintrag.datei.length))
      res.setHeader('Content-Disposition', contentDisposition(anzeigen ? 'inline' : 'attachment', eintrag.dateiname))
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
      res.setHeader('Cache-Control', 'private, no-store')
      // Helmet's CSP (object-src 'none') would block the browser's built-in PDF viewer
      if (anzeigen) res.removeHeader('Content-Security-Policy')
      res.end(eintrag.datei)
    }),
  )

  router.patch(
    '/:id',
    wrap(async (req, res) => {
      const parsed = PatchSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Die Änderung ist ungültig:')
      const upload = await repo.update(req.params.id, parsed.data)
      if (!upload) return uploadFehlt(res, req.params.id)
      res.json({ upload })
    }),
  )

  router.delete(
    '/:id',
    wrap(async (req, res) => {
      if (!(await repo.remove(req.params.id))) return uploadFehlt(res, req.params.id)
      res.status(204).end()
    }),
  )

  return router
}
