/**
 * Query of the online search (GET /api/suche?q=…).
 */
import { z } from 'zod'

export const SucheQuerySchema = z.object({
  q: z.string().trim().min(1, 'Suchbegriff fehlt').max(200, 'Suchbegriff darf höchstens 200 Zeichen lang sein'),
})
