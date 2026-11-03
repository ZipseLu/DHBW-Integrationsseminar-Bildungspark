/**
 * Login routes (BE-01, MySQL, table `users`).
 *
 *   POST /api/auth/login   { email, passwort } -> { token, ablaufAm, benutzer }
 *   GET  /api/auth/me      own account (needs "Authorization: Bearer <token>")
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

// Hash of a random password, compared against when the email is unknown (created on first use)
let dummyHash = null
const vergleichsHash = () => (dummyHash ??= hashPasswort(randomUUID()))

const fehlgeschlagen = (res) =>
  res.status(401).json({ error: 'unauthorized', code: 'anmeldung_fehlgeschlagen', message: 'E-Mail-Adresse oder Passwort ist falsch' })

export function createAuthRouter() {
  const router = Router()

  router.post(
    '/login',
    wrap(async (req, res) => {
      const parsed = LoginSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Anmeldung nicht möglich:')

      const konto = await repo.findForLogin(parsed.data.email)
      const passt = await pruefePasswort(parsed.data.passwort, konto?.passwortHash ?? (await vergleichsHash()))
      if (!konto || !passt) return fehlgeschlagen(res)

      const { passwortHash: _hash, ...benutzer } = konto
      const { token, ablaufAm } = erstelleToken(benutzer)
      // The answer contains a credential – no browser or proxy may cache it
      res.set('Cache-Control', 'no-store')
      res.json({ token, ablaufAm, benutzer })
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
      res.json({ benutzer })
    }),
  )

  return router
}
