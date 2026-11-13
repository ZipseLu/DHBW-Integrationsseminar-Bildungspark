/**
 * Schema of the login (BE-01).
 *
 * Deliberately loose: no email format and no minimum password length here – a
 * wrong combination simply gets 401, and the rules for new passwords live in
 * src/benutzer/schema.js. The email is compared in lower case (findForLogin).
 *
 * The password field is accepted as `password` (contract of the frontend, FE-08)
 * or `passwort` (original BE-01 contract). Exactly one of the two must be sent;
 * the parsed result always has `passwort`.
 */
import { z } from 'zod'

const passwortFeld = z.string().min(1, 'fehlt').max(200)

/** Body of POST /api/auth/login */
export const LoginSchema = z
  .strictObject({
    email: z.string().trim().min(1, 'fehlt').max(255),
    password: passwortFeld.optional(),
    passwort: passwortFeld.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.password === undefined && body.passwort === undefined) {
      ctx.addIssue({ code: 'custom', message: 'fehlt', path: ['password'] })
    }
    if (body.password !== undefined && body.passwort !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'nur eines der Felder password oder passwort senden', path: ['password'] })
    }
  })
  .transform(({ email, password, passwort }) => ({ email, passwort: password ?? passwort }))
