/**
 * GET /api/lehrplaene – die Lernziele der Lehrpläne.
 *
 * Quelle ist die Datenbank (Migration 004: lehrplaene, lernziele, lernziel_niveaus),
 * befüllt mit `npm run import:lehrplaene` oder `npm run db:seed`. Ist die Datenbank
 * nicht erreichbar oder noch leer, liest die Route wie bisher apps/backend/data/lehrplaene.json –
 * so läuft die KI-Erstellung auch ohne Docker mit allen Lernzielen. Fehlt beides, kommt
 * eine leere Liste mit Hinweis; das Frontend nutzt dann seine Beispiel-Lernziele.
 *
 * Antwort: { herkunft: 'datenbank' | 'datei' | null, stand, anzahl, lernziele, hinweis? }
 * Die JSON-Datei liegt nicht im Repository (Lehrpläne des Bildungsparks, Repo öffentlich).
 */
import { readFile } from 'node:fs/promises'
import { Router } from 'express'
import { dbError } from '../http/fehler.js'
import * as lehrplanRepo from '../lehrplan/repository.js'

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

  return router
}
