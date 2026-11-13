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
import { healthRouter } from './routes/health.js'
import { aiRouter } from './routes/ai.js'
import { arbeitsblattRouter } from './routes/arbeitsblatt.js'
import { createLehrplaeneRouter } from './routes/lehrplaene.js'
import { createArbeitsblaetterRouter } from './routes/arbeitsblaetter.js'
import { createTeilnehmendeRouter } from './routes/teilnehmende.js'
import { createBenutzerRouter } from './routes/benutzer.js'
import { createSucheRouter } from './routes/suche.js'
import { createAuthRouter } from './routes/auth.js'
import { authentifiziere, erfordereAnmeldung } from './auth/anmeldung.js'
import { kiLimiter, loginLimiter, sucheLimiter } from './http/rate-limit.js'

/**
 * @param {{ rateLimit?: Partial<typeof config.rateLimit> }} [options]
 *        override of the rate limits, e.g. small limits in tests
 */
export function createApp({ rateLimit = {} } = {}) {
  const app = express()
  const limits = { ...config.rateLimit, ...rateLimit }

  app.disable('x-powered-by')
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy)
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
  // Login (BE-01) – vor der Token-Prüfung, damit die Anmeldung auch mit einem abgelaufenen
  // Token im Browser klappt; GET /api/auth/me prüft das Token selbst.
  app.use('/api/auth', createAuthRouter({ loginLimiter: loginLimiter({ max: limits.loginMax, windowMs: limits.loginWindowMs }) }))
  // Ab hier (BE-06): jede Route verlangt ein gültiges Bearer-Token – ohne Token oder mit
  // ungültigem Token 401. Ein gültiges Token setzt req.benutzer = { id, rolle, name }.
  // Rollen prüfen die Router selbst (src/auth/rollen.js).
  app.use(authentifiziere, erfordereAnmeldung)

  // KI-Aufrufe kosten API-Kontingent – Limit pro Konto (BE-06). Der Statusabruf zählt nicht.
  const kiLimit = kiLimiter({ max: limits.kiMax, windowMs: limits.kiWindowMs })
  app.post(['/api/ai/arbeitsblatt', '/api/ai/generate'], kiLimit)
  // Spezifischere Route zuerst, damit /api/ai/arbeitsblatt nicht im aiRouter landet
  app.use('/api/ai/arbeitsblatt', arbeitsblattRouter)
  app.use('/api/ai', aiRouter)
  app.use('/api/lehrplaene', createLehrplaeneRouter())
  // Gespeicherte Arbeitsblaetter (MySQL) – ohne DB antworten die Routen mit 503
  app.use('/api/arbeitsblaetter', createArbeitsblaetterRouter())
  // Teilnehmende mit Lernweg (MySQL, BE-02) – ohne DB ebenfalls 503
  app.use('/api/teilnehmende', createTeilnehmendeRouter())
  // Staff accounts (table users, BE-03) – admins only
  app.use('/api/benutzer', createBenutzerRouter())
  // Online-Suche nach Lehrmaterial (FE-14) – nur echte Treffer, ohne Anbieter 503
  app.get('/api/suche', sucheLimiter({ max: limits.sucheMax, windowMs: limits.sucheWindowMs }))
  app.use('/api/suche', createSucheRouter())

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
