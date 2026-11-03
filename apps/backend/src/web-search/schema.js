/**
 * Validierung der Web-Suche-Query-Parameter.
 */
import { z } from 'zod'

export const WebSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Suchbegriff ist erforderlich').max(200, 'Suchbegriff darf maximal 200 Zeichen lang sein'),
})

export type WebSearchQuery = z.infer<typeof WebSearchQuerySchema>
