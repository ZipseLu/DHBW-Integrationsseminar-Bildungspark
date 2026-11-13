/**
 * Route für die Websuche nach Arbeitsblättern.
 *
 *   GET /api/web-search?q=...
 *
 * Sucht im Internet nach Arbeitsblättern (PDF, DOCX, …) und gibt
 * strukturierte Treffer zurück (Titel, URL, Snippet, Quelle, Dateityp).
 *
 * Die Suche laeuft ueber DuckDuckGo (HTML-Scraping) und benoetigt keinen
 * API-Key. Optional kann ein Dateityp als fileType uebergeben werden.
 *
 * Fehler: { error, message, details? } mit deutschem Text
 *   (validation_error 400, web_search_unavailable 503, too_many_requests 429,
 *    internal_error 500)
 *
 * Die Route ist derzeit noch ohne Anmeldung erreichbar (BE-06 folgt). Damit sie
 * auf Staging nicht als offener Such-Proxy missbraucht werden kann, gilt ein
 * Rate-Limit pro Client-IP (WEB_SEARCH_RATE_LIMIT_MAX / _WINDOW_MS).
 */
import { Router } from 'express'
import { config } from '../config.js'
import { createRateLimit } from '../http/rate-limit.js'
import { searchWeb } from '../web-search/service.js'
import { WebSearchQuerySchema } from '../web-search/schema.js'

export const webSearchRouter = Router()

const rateLimit = createRateLimit({
  max: config.webSearch.rateLimit.max,
  windowMs: config.webSearch.rateLimit.windowMs,
  message: 'Zu viele Suchanfragen – bitte kurz warten und erneut versuchen.',
})

webSearchRouter.get(
  '/',
  rateLimit,
  async (req, res, next) => {
    try {
      const parsed = WebSearchQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Ungültiger Suchbegriff.',
          details: parsed.error.issues,
        })
      }

      const results = await searchWeb(parsed.data.q, parsed.data.fileType)
      res.json({ query: parsed.data.q, results, count: results.length })
    } catch (error) {
      if (error?.status && error?.code) {
        console.error(`[web-search] ${error.code}: ${error.message}`)
        return res.status(error.status).json({
          error: error.code,
          message: error.message,
        })
      }
      next(error)
    }
  },
)
