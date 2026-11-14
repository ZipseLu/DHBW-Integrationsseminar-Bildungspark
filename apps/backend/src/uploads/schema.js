/**
 * Schemas of the upload API (Trello "Upload von Arbeitsblättern").
 *
 * Objects are `strict` like in the other APIs, so typos in field names are reported
 * instead of being ignored silently.
 */
import { z } from 'zod'
import { MAX_TEXT_ZEICHEN } from './text.js'

/** Empty strings from forms count as "not given" */
const optionalerText = (max) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.string().trim().max(max).optional())

const leerZuNull = (max) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(max).nullable().optional())

/** Query of POST /api/uploads (file upload); the file itself is the request body */
export const UploadQuerySchema = z.strictObject({
  berufsfeld: optionalerText(120),
  thema: optionalerText(300),
  /** Only used without login token – with a token the name comes from the login (BE-01) */
  hochgeladenVon: optionalerText(120),
})

/** Body of POST /api/uploads with Content-Type application/json: pasted text */
export const TextUploadSchema = z.strictObject({
  text: z.string().trim().min(1, 'darf nicht leer sein').max(MAX_TEXT_ZEICHEN, `höchstens ${MAX_TEXT_ZEICHEN} Zeichen`),
  titel: optionalerText(200),
  berufsfeld: optionalerText(120),
  thema: optionalerText(300),
  hochgeladenVon: optionalerText(120),
})

/** Body of PATCH /api/uploads/:id – at least one field */
export const PatchSchema = z
  .strictObject({
    text: z.string().trim().max(MAX_TEXT_ZEICHEN, `höchstens ${MAX_TEXT_ZEICHEN} Zeichen`).nullable().optional(),
    berufsfeld: leerZuNull(120),
    thema: leerZuNull(300),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: 'Mindestens eines der Felder text, berufsfeld oder thema angeben' })

/** Query of GET /api/uploads */
export const ListQuerySchema = z.object({
  q: optionalerText(200),
  berufsfeld: optionalerText(120),
})

/** File name from the X-Dateiname header (URI-encoded, so umlauts survive HTTP headers) */
export function dateinameAusHeader(header) {
  if (!header) return null
  let name
  try {
    name = decodeURIComponent(header)
  } catch {
    return null
  }
  // Keep only the last path segment and drop control characters
  name = name.split(/[\\/]/).pop().replace(/[\u0000-\u001F\u007F]/g, '').trim()
  return name && name.length <= 255 ? name : null
}
