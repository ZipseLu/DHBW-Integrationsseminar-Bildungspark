/**
 * Express-App.
 *
 * WICHTIG: Diese Datei startet KEINEN Server – sie exportiert nur die App.
 * Dadurch koennen Supertest-Tests die App im Speicher laden, ohne einen Port
 * zu belegen. Das `listen()` passiert ausschliesslich in `index.js`.
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { config, describeConfig } from './config.js'
import { ping } from './db.js'
import { healthRouter } from './routes/health.js'
import { aiRouter } from './routes/ai.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())

  app.use(
    cors({
      origin(origin, callback) {
        // Kein Origin = curl / Server-zu-Server / Healthcheck -> erlauben
        if (!origin) return callback(null, true)
        if (config.cors.origins.includes(origin)) return callback(null, true)
        return callback(new Error(`CORS nicht erlaubt: ${origin}`))
      },
      credentials: true,
    }),
  )

  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))

  if (!config.isTest) {
    app.use(morgan(config.env === 'production' ? 'combined' : 'dev'))
  }

  app.use('/api/health', healthRouter)
  app.use('/api/ai', aiRouter)

  // 404 fuer alles Unbekannte
  app.use((req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: `Route ${req.method} ${req.originalUrl} existiert nicht`,
    })
  })

  // Zentrale Fehlerbehandlung (4 Parameter = Error-Handler in Express)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status ?? 500
    if (status >= 500) console.error('[error]', err)
    res.status(status).json({
      error: err.code ?? 'internal_error',
      message: status >= 500 ? 'Interner Serverfehler' : err.message,
    })
  })

  return app
}

export { describeConfig }
