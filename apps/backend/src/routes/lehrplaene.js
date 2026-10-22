/**
 * GET /api/lehrplaene – die importierten Lernziele der Lehrplaene.
 *
 * Quelle ist apps/backend/data/lehrplaene.json, erzeugt mit
 * `npm run import:lehrplaene` (siehe scripts/import-lehrplaene.js). Die Datei
 * liegt nicht im Repository. Fehlt sie, antwortet die Route mit einer leeren
 * Liste und einem Hinweis – das Frontend nutzt dann seine Beispiel-Lernziele.
 */
import { readFile } from 'node:fs/promises'
import { Router } from 'express'

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
  const data = JSON.parse(raw)
  if (!Array.isArray(data?.lernziele)) throw new Error('lehrplaene.json: Feld "lernziele" fehlt')
  return data
}

export function createLehrplaeneRouter({ file = LEHRPLAENE_FILE } = {}) {
  const router = Router()
  let cache = null

  router.get('/', async (_req, res, next) => {
    try {
      // Einmal lesen und im Speicher behalten; nach einem neuen Import Backend neu starten
      cache ??= await loadLehrplaene(file)
      if (!cache) {
        return res.json({
          anzahl: 0,
          lernziele: [],
          hinweis: 'Keine Lehrplandaten importiert – in apps/backend `npm run import:lehrplaene` ausführen.',
        })
      }
      res.json({ stand: cache.stand ?? null, quelle: cache.quelle ?? null, anzahl: cache.lernziele.length, lernziele: cache.lernziele })
    } catch (error) {
      next(error)
    }
  })

  return router
}
