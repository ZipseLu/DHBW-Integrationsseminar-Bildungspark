/** GET /api/dashboard – Kennzahlen und letzte Arbeitsblatt-Aktivitäten. */
import { Router } from 'express'
import * as repo from '../dashboard/repository.js'

const DB_FEHLER = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'])

export function createDashboardRouter() {
  const router = Router()

  router.get('/', async (_req, res, next) => {
    try {
      res.json(await repo.kennzahlen())
    } catch (error) {
      if (!DB_FEHLER.has(error?.code)) return next(error)
      const hinweis = error.code === 'ER_NO_SUCH_TABLE'
        ? 'Tabellen fehlen – in apps/backend `npm run db:migrate` ausführen.'
        : 'MySQL nicht erreichbar – `docker compose up -d db` starten und DB_HOST/DB_PORT in der .env prüfen.'
      console.error(`[dashboard] ${error.code}: ${error.message}`)
      res.status(503).json({
        error: 'db_unavailable',
        message: `Die Datenbank ist nicht verfügbar. ${hinweis}`,
        details: error.code,
      })
    }
  })

  return router
}
