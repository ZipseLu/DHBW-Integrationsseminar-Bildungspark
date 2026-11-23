/**
 * GET /api/lehrplaene – die Lernziele der Lehrpläne.
 *
 * Quelle ist die Datenbank (Migration 005: lehrplaene, lernziele, lernziel_niveaus),
 * befüllt mit `npm run import:lehrplaene` oder `npm run db:seed`. Ist die Datenbank
 * nicht erreichbar oder noch leer, liest die Route wie bisher apps/backend/data/lehrplaene.json –
 * so läuft die KI-Erstellung auch ohne Docker mit allen Lernzielen. Fehlt beides, kommt
 * eine leere Liste mit Hinweis; das Frontend nutzt dann seine Beispiel-Lernziele.
 *
 * Antwort: { herkunft: 'datenbank' | 'datei' | null, stand, anzahl, lernziele, hinweis? }
 * Die JSON-Datei liegt nicht im Repository (Lehrpläne des Bildungsparks, Repo öffentlich).
 *
 * FE-34 – adding a curriculum in the application (body = the DOCX bytes, file name in
 * the header X-Dateiname, URI-encoded, like POST /api/uploads; ?berufsfeld=):
 *
 *   POST /api/lehrplaene/vorschau  reads the file, stores nothing
 *                                  -> { lehrplan: { quelle, berufsfeld, tq, baustein, ausbildungsbaustein,
 *                                       lernziele, hinweise }, ersetzt }
 *   POST /api/lehrplaene           reads the file again and stores it (admin and dozent only,
 *                                  as soon as a token is sent) -> 201 { lehrplan, anzahl, ersetzt }
 *
 * A curriculum with the same file name is replaced (new version). If the database is still
 * empty and the learning goals come from data/lehrplaene.json, the file is copied into the
 * database first – otherwise the new curriculum would hide all others.
 */
import { readFile } from 'node:fs/promises'
import express, { Router } from 'express'
import { erfordereRolle } from '../auth/rollen.js'
import { dbError } from '../http/fehler.js'
import { LehrplanUploadError, leseLehrplanDatei } from '../lehrplan/hochladen.js'
import * as lehrplanRepo from '../lehrplan/repository.js'
import { MAX_DATEI_BYTES } from '../uploads/dateityp.js'
import { dateinameAusHeader } from '../uploads/schema.js'

export const LEHRPLAENE_FILE = new URL('../../data/lehrplaene.json', import.meta.url)

/** Liest die JSON-Datei; null, wenn sie nicht existiert. */
export async function loadLehrplaene(file = LEHRPLAENE_FILE) {
  let raw
  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch (error) {
    throw new lehrplanRepo.LehrplanDatenError(`lehrplaene.json ist kein gültiges JSON: ${error.message}`)
  }
  if (!Array.isArray(data?.lernziele)) throw new lehrplanRepo.LehrplanDatenError('lehrplaene.json: Feld "lernziele" fehlt')
  return data
}

/** Reads the body as raw bytes, with the size limit mapped to a clear 413 */
function rohdaten(req, res, next) {
  express.raw({ type: () => true, limit: MAX_DATEI_BYTES })(req, res, (error) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'payload_too_large', code: 'datei_zu_gross', message: 'Die Datei ist größer als 20 MB.' })
    }
    next(error)
  })
}

/** Parses the uploaded curriculum; sends the error response and returns null if it is invalid */
function lehrplanAusAnfrage(req, res) {
  try {
    return leseLehrplanDatei(Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0), {
      dateiname: dateinameAusHeader(req.get('X-Dateiname')),
      berufsfeld: typeof req.query.berufsfeld === 'string' ? req.query.berufsfeld : null,
    })
  } catch (error) {
    if (error instanceof LehrplanUploadError) {
      res.status(error.status).json({ error: error.code, message: error.message })
      return null
    }
    throw error
  }
}

const ohneHinweise = ({ hinweise: _hinweise, ...lehrplan }) => lehrplan

export function createLehrplaeneRouter({
  file = LEHRPLAENE_FILE,
  repository = lehrplanRepo,
  // Nach einem Verbindungsfehler 30 s lang nicht erneut versuchen: sonst kostet jeder
  // Seitenaufruf bei einem nicht erreichbaren Host bis zum connectTimeout (Standard 10 s).
  dbRetryMs = 30_000,
} = {}) {
  const router = Router()
  // Die Datei nur einmal lesen; nach einem neuen Import Backend neu starten
  let dateiCache = null
  let dbNichtErreichbarBis = 0

  /** Lernziele aus der Datenbank; null, wenn sie nicht erreichbar oder noch leer ist */
  async function ausDatenbank() {
    if (Date.now() < dbNichtErreichbarBis) return null
    try {
      const lernziele = await repository.listLernziele()
      if (lernziele.length === 0) return null
      return { herkunft: 'datenbank', stand: await repository.stand(), anzahl: lernziele.length, lernziele }
    } catch (error) {
      if (dbError(error)) {
        if (dbRetryMs > 0) dbNichtErreichbarBis = Date.now() + dbRetryMs
        return null
      }
      throw error
    }
  }

  router.get('/', async (_req, res, next) => {
    try {
      const datenbank = await ausDatenbank()
      if (datenbank) return res.json(datenbank)

      dateiCache ??= await loadLehrplaene(file)
      if (dateiCache) {
        return res.json({
          herkunft: 'datei',
          stand: dateiCache.stand ?? null,
          quelle: dateiCache.quelle ?? null,
          anzahl: dateiCache.lernziele.length,
          lernziele: dateiCache.lernziele,
          hinweis: 'Lehrpläne kommen aus data/lehrplaene.json – `npm run db:seed` übernimmt sie in die Datenbank.',
        })
      }
      res.json({
        herkunft: null,
        stand: null,
        anzahl: 0,
        lernziele: [],
        hinweis: 'Keine Lehrplandaten importiert – in apps/backend `npm run import:lehrplaene` ausführen.',
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/vorschau', rohdaten, async (req, res, next) => {
    try {
      const lehrplan = lehrplanAusAnfrage(req, res)
      if (!lehrplan) return
      let ersetzt = false
      try {
        ersetzt = await repository.quelleVorhanden(lehrplan.quelle)
      } catch (error) {
        // The preview works without a database; saving will report the problem
        if (!dbError(error)) throw error
      }
      res.json({ lehrplan, ersetzt })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', erfordereRolle('admin', 'dozent'), rohdaten, async (req, res, next) => {
    try {
      const lehrplan = lehrplanAusAnfrage(req, res)
      if (!lehrplan) return
      if ((await repository.count()) === 0) {
        // Learning goals so far only in data/lehrplaene.json: take them over first
        dateiCache ??= await loadLehrplaene(file)
        if (dateiCache?.lernziele.length) await repository.ersetzeAlle(dateiCache.lernziele)
      }
      const ergebnis = await repository.fuegeLehrplanHinzu(lehrplan)
      dbNichtErreichbarBis = 0
      res.status(201).json({ lehrplan: ohneHinweise(lehrplan), anzahl: ergebnis.lernziele, ersetzt: ergebnis.ersetzt })
    } catch (error) {
      const mapped = dbError(error)
      if (mapped) return res.status(mapped.status).json(mapped.body)
      if (error instanceof lehrplanRepo.LehrplanDatenError) {
        return res.status(500).json({ error: 'lehrplan_daten_ungueltig', message: error.message })
      }
      next(error)
    }
  })

  return router
}
