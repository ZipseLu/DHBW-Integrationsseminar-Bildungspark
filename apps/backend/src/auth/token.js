/**
 * Login tokens (BE-01): JSON Web Tokens, signed with HS256 and JWT_SECRET.
 *
 * Payload: { sub: <account id>, rolle, name } – no email, no password data.
 * The algorithm is pinned when verifying, so tokens with "alg": "none" or any
 * other algorithm are rejected. Lifetime: JWT_EXPIRES_IN (default 8h = one working day).
 *
 * Tokens are stateless: a role change or a deleted account takes effect with the
 * next login, at the latest when the token expires. GET /api/auth/me always reads
 * the account from the database, so the frontend notices a deleted account.
 */
import jwt from 'jsonwebtoken'
import { config, DEV_JWT_SECRET } from '../config.js'
import { ROLLEN } from '../benutzer/schema.js'

const ALGORITHMUS = 'HS256'
export const MIN_SECRET_LAENGE = 32

/** Token missing parts, wrongly signed or expired (route -> 401 with `code`) */
export class TokenError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'TokenError'
    this.code = code
  }
}

const ungueltig = () => new TokenError('Das Anmelde-Token ist ungültig – bitte neu anmelden', 'token_ungueltig')

/**
 * Signs a token for an account.
 * @param {{id: string, rolle: string, name: string}} konto
 * @returns {{token: string, ablaufAm: string}} token and its expiry as ISO time
 */
export function erstelleToken({ id, rolle, name }, { secret = config.jwtSecret, expiresIn = config.jwtExpiresIn } = {}) {
  const token = jwt.sign({ rolle, name }, secret, { algorithm: ALGORITHMUS, subject: id, expiresIn })
  const { exp } = jwt.decode(token)
  return { token, ablaufAm: new Date(exp * 1000).toISOString() }
}

/**
 * Verifies signature, algorithm, expiry and payload.
 * @returns {{id: string, rolle: string, name: string|null}} becomes `req.benutzer`
 * @throws {TokenError} code `token_abgelaufen` or `token_ungueltig`
 */
export function pruefeToken(token, { secret = config.jwtSecret } = {}) {
  let payload
  try {
    payload = jwt.verify(token, secret, { algorithms: [ALGORITHMUS] })
  } catch (error) {
    if (error?.name === 'TokenExpiredError') throw new TokenError('Die Anmeldung ist abgelaufen – bitte neu anmelden', 'token_abgelaufen')
    throw ungueltig()
  }
  if (typeof payload?.sub !== 'string' || payload.sub === '' || !ROLLEN.includes(payload.rolle)) throw ungueltig()
  return { id: payload.sub, rolle: payload.rolle, name: typeof payload.name === 'string' ? payload.name : null }
}

/**
 * Stops the server start in production with the development secret or a short secret –
 * anyone who knows the secret can sign tokens for any role.
 */
export function pruefeJwtKonfiguration({ env = config.env, secret = config.jwtSecret } = {}) {
  if (env !== 'production') return
  if (!secret || secret === DEV_JWT_SECRET || secret.length < MIN_SECRET_LAENGE) {
    throw new Error(
      `JWT_SECRET fehlt oder ist unsicher – in Produktion mindestens ${MIN_SECRET_LAENGE} zufällige Zeichen setzen (z. B. \`openssl rand -base64 48\`).`,
    )
  }
}
