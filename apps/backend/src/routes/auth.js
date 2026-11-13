/**
 * Login routes (BE-01, MySQL, table `users`).
 *
 *   POST /api/auth/login   { email, password } -> { token, expiresIn, user, ablaufAm, benutzer }
 *   GET  /api/auth/me      own account (needs "Authorization: Bearer <token>")
 *
 * Login answer: `token`, `expiresIn` (seconds, at most 86400) and `user`
 * ({ id, name, email, role }) are the contract of the frontend (FE-08). `ablaufAm`
 * and `benutzer` (with `rolle`) are kept from the original BE-01 contract, so
 * clients of either version work. The request accepts `password` or `passwort`.
 *
 * A wrong email and a wrong password get the same answer (401 anmeldung_fehlgeschlagen),
 * and an unknown email still runs one scrypt comparison – neither the message nor the
 * response time tells whether an account exists.
 * Logging out = the frontend discards the token; there is no server-side session.
 * Without a reachable MySQL: 503 db_unavailable. Details: docs/anmeldung-api.md
 */
import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { authentifiziere, erfordereAnmeldung } from '../auth/anmeldung.js'
import { LoginSchema } from '../auth/schema.js'
import { erstelleToken } from '../auth/token.js'
import { hashPasswort, pruefePasswort } from '../benutzer/passwort.js'
import * as repo from '../benutzer/repository.js'
import { validationError, wrap as wrapFuer } from '../http/fehler.js'

const wrap = wrapFuer('auth')

// Hash of a random password, compared against when the email is unknown. Created once when the
// module loads, so even the first failed login takes as long as all the others.
const vergleichsHash = hashPasswort(randomUUID())
vergleichsHash.catch(() => {}) // a failure surfaces when awaited in the route, not as an unhandled rejection

const fehlgeschlagen = (res) =>
  res.status(401).json({ error: 'unauthorized', code: 'anmeldung_fehlgeschlagen', message: 'E-Mail-Adresse oder Passwort ist falsch' })

/** `benutzer` of the BE-01 contract -> `user` of the frontend contract (FE-08) */
export const alsUser = ({ id, name, email, rolle }) => ({ id, name, email, role: rolle })

/**
 * @param {{ loginLimiter?: import('express').RequestHandler }} [options]
 *        rate limit for POST /login (src/http/rate-limit.js); none if omitted
 */
export function createAuthRouter({ loginLimiter } = {}) {
  const router = Router()
  const vorLogin = loginLimiter ? [loginLimiter] : []

  router.post(
    '/login',
    ...vorLogin,
    wrap(async (req, res) => {
      const parsed = LoginSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Anmeldung nicht möglich:')

      const konto = await repo.findForLogin(parsed.data.email)
      const passt = await pruefePasswort(parsed.data.passwort, konto?.passwortHash ?? (await vergleichsHash))
      if (!konto || !passt) return fehlgeschlagen(res)

      const { passwortHash: _hash, ...benutzer } = konto
      const { token, ablaufAm, expiresIn } = erstelleToken(benutzer)
      // The answer contains a credential – no browser or proxy may cache it
      res.set('Cache-Control', 'no-store')
      res.json({ token, expiresIn, user: alsUser(benutzer), ablaufAm, benutzer })
    }),
  )

  // This router is mounted in front of the global `authentifiziere` (app.js), so that a
  // login works even while the browser still holds an expired token – /me checks itself.
  router.get(
    '/me',
    authentifiziere,
    erfordereAnmeldung,
    wrap(async (req, res) => {
      const benutzer = await repo.findById(req.benutzer.id)
      if (!benutzer) {
        res.set('WWW-Authenticate', 'Bearer')
        return res.status(401).json({ error: 'unauthorized', code: 'konto_unbekannt', message: 'Das Konto existiert nicht mehr – bitte neu anmelden' })
      }
      res.json({ user: alsUser(benutzer), benutzer })
    }),
  )

  return router
}
