/**
 * Login middleware (BE-01).
 *
 *   authentifiziere     runs in front of the API routes (app.js). A valid
 *                       "Authorization: Bearer <token>" sets
 *                         req.benutzer = { id, rolle, name }
 *                       – the contract that erfordereRolle (src/auth/rollen.js) and
 *                       the user administration (BE-03) expect. An invalid or expired
 *                       token is rejected with 401. Requests WITHOUT a token pass
 *                       unchanged, so the frontend keeps working until it sends the
 *                       token (FE-08); BE-06 then makes the login mandatory.
 *   erfordereAnmeldung  401 without a valid login (GET /api/auth/me now, the write
 *                       endpoints with BE-06).
 */
import { pruefeToken, TokenError } from './token.js'

function nichtAngemeldet(res, code, message) {
  // RFC 6750: tells clients which scheme is expected; does not open a browser login popup
  res.set('WWW-Authenticate', 'Bearer')
  return res.status(401).json({ error: 'unauthorized', code, message })
}

export function authentifiziere(req, res, next) {
  const header = req.get('authorization')
  if (!header) return next()

  const [schema, token, ...rest] = header.trim().split(/\s+/)
  if (!/^bearer$/i.test(schema) || !token || rest.length > 0) {
    return nichtAngemeldet(res, 'token_ungueltig', 'Erwartet wird der Header „Authorization: Bearer <Token>“')
  }
  try {
    req.benutzer = pruefeToken(token)
  } catch (error) {
    if (error instanceof TokenError) return nichtAngemeldet(res, error.code, error.message)
    return next(error)
  }
  next()
}

export function erfordereAnmeldung(req, res, next) {
  if (!req.benutzer) return nichtAngemeldet(res, 'anmeldung_erforderlich', 'Bitte zuerst anmelden')
  next()
}
