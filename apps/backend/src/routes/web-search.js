/**
 * Route für die Websuche nach Arbeitsblättern.
 *
 *   GET /api/web-search?q=...
 *
 * Sucht im Internet nach Arbeitsblättern (PDF, DOCX, …) und gibt
 * strukturierte Treffer zurück (Titel, URL, Snippet, Quelle, Dateityp).
 *
 * Ohne API-Key läuft die Suche im Mock-Modus (simulierte Treffer).
 * Mit WEB_SEARCH_PROVIDER=serpapi bzw. =google und einem gültigen Key
 * wird eine echte Such-API aufgerufen.
 *
 * Fehler: { error, message, details? } mit deutschem Text
 *   (validation_error 400, web_search_unavailable 503, internal_error 500)
 */
import { Router } from 'express'
import { searchWeb } from '../web-search/service.js'
import { WebSearchQuerySchema } from '../web-search/schema.js'

export const webSearchRouter = Router()

webSearchRouter.get(
  '/',
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

      const results = await searchWeb(parsed.data.q)
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
