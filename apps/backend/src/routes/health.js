import { Router } from 'express'
import { ping } from '../db.js'

export const healthRouter = Router()

/**
 * GET /api/health
 *
 * Antwort 200 = alles bereit, 503 = Dienst laeuft, DB aber nicht erreichbar.
 * Das 503-Verhalten ist wichtig: Docker-Compose-Healthcheck und der
 * Kubernetes-Liveness-Probe unterscheiden so "Prozess lebt" von
 * "Dienst ist einsatzbereit".
 */
healthRouter.get('/', async (_req, res) => {
  try {
    const db = await ping()
    res.json({
      status: 'ok',
      service: 'bildungspark-backend',
      env: process.env.NODE_ENV ?? 'development',
      uptimeSeconds: Math.round(process.uptime()),
      database: { status: 'up', latencyMs: db.latencyMs },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'bildungspark-backend',
      database: { status: 'down', message: error.message },
      timestamp: new Date().toISOString(),
    })
  }
})
