/**
 * Schema of the login (BE-01).
 *
 * Deliberately loose: no email format and no minimum password length here – a
 * wrong combination simply gets 401, and the rules for new passwords live in
 * src/benutzer/schema.js. The email is compared in lower case (findForLogin).
 */
import { z } from 'zod'

/** Body of POST /api/auth/login */
export const LoginSchema = z.strictObject({
  email: z.string().trim().min(1, 'fehlt').max(255),
  passwort: z.string().min(1, 'fehlt').max(200),
})
