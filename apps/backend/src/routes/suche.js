/**
 * Online search (FE-14).
 *
 *   GET /api/suche?q=Holz          -> 200 { results: [{ title, url, snippet }] }
 *   GET /api/suche/status          -> 200 { konfiguriert, anbieter, hinweis }
 *
 * Real hits only (src/suche/service.js). Errors: { error, code, message }
 *   400 validation_error            q missing or longer than 200 characters
 *   503 suche_nicht_konfiguriert    no provider set up (WEB_SEARCH_PROVIDER, …)
 *   502 suchanbieter_*              provider unreachable, refused or answered wrongly
 *   503 suchanbieter_limit          provider rate limit
 *   504 suchanbieter_timeout        provider too slow (WEB_SEARCH_TIMEOUT_MS)
 * Login required like every API route (app.js). Details: docs/online-suche.md
 */
import { Router } from 'express'
import { formatZodError, zodIssues } from '../arbeitsblatt/schema.js'
import { SucheQuerySchema } from '../suche/schema.js'
import { SucheError, sucheOnline, sucheStatus } from '../suche/service.js'

export function createSucheRouter({ suche = sucheOnline, status = sucheStatus } = {}) {
  const router = Router()

  router.get('/status', (_req, res) => {
    res.json(status())
  })

  router.get('/', async (req, res, next) => {
    const parsed = SucheQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'validation_error', message: `Ungültige Suche: ${formatZodError(parsed.error)}`, details: zodIssues(parsed.error) })
    }
    try {
      const results = await suche(parsed.data.q)
      res.json({ results })
    } catch (error) {
      if (error instanceof SucheError) {
        console.error(`[suche] ${error.code}: ${error.message}`)
        return res.status(error.status).json({ error: error.status >= 500 ? 'search_unavailable' : 'search_error', code: error.code, message: error.message })
      }
      next(error)
    }
  })

  return router
}
