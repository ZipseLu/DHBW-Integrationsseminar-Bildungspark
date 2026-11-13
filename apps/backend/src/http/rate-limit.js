/**
 * Rate limits (BE-06): protect the login against password guessing and the KI
 * routes against using up the API quota.
 *
 *   login  per client IP, counts only failed attempts (a correct login is never blocked
 *          by its own earlier successes)
 *   ki     per logged-in account (falls back to the IP), every generation counts
 *
 * Limits come from the configuration (RATE_LIMIT_* in .env, see src/config.js).
 * The counters live in memory: they reset on restart and are not shared between
 * several backend processes – enough for the single staging server of the prototype.
 * Behind a reverse proxy, set TRUST_PROXY so the real client IP is used.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const antwort = (code, message) => (req, res, _next, options) => {
  res.status(options.statusCode).json({ error: 'too_many_requests', code, message })
}

/**
 * @param {{ max: number, windowMs: number }} limit
 * @returns {import('express').RequestHandler}
 */
export function loginLimiter({ max, windowMs }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: antwort('zu_viele_anmeldeversuche', `Zu viele fehlgeschlagene Anmeldeversuche – bitte in ${Math.ceil(windowMs / 60_000)} Minuten erneut versuchen.`),
  })
}

/**
 * @param {{ max: number, windowMs: number }} limit
 * @returns {import('express').RequestHandler}
 */
export function kiLimiter({ max, windowMs }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => (req.benutzer?.id ? `konto:${req.benutzer.id}` : `ip:${ipKeyGenerator(req.ip ?? '')}`),
    handler: antwort('zu_viele_ki_anfragen', `Zu viele KI-Anfragen – bitte in ${Math.ceil(windowMs / 60_000)} Minuten erneut versuchen.`),
  })
}
