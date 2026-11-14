/**
 * Validierung der Web-Suche-Query-Parameter.
 */
import { z } from 'zod'

export const WebSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Suchbegriff ist erforderlich').max(200, 'Suchbegriff darf maximal 200 Zeichen lang sein'),
  // Ein leerer fileType-Parameter (z. B. bei manuellen Aufrufen) bedeutet
  // "kein Filter" und soll nicht als Validierungsfehler enden.
  fileType: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.enum(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']).optional(),
  ),
})

