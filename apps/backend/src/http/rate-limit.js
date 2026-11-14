/**
 * Einfaches In-Memory-Rate-Limit pro Client-IP.
 *
 * Hintergrund (BE-06): Die Websuche ist ein offener Proxy zu fremden
 * Suchmaschinen. Ohne Limit kann sie auf Staging missbraucht werden.
 *
 * Die Zaehler liegen im Prozessspeicher: Sie setzen sich beim Neustart zurueck
 * und werden nicht zwischen mehreren Backend-Prozessen geteilt. Fuer den
 * einzelnen Staging-Server des Prototyps reicht das; fuer mehrere Instanzen
 * waere ein gemeinsamer Speicher (z. B. Redis) noetig.
 */

const CLEANUP_INTERVAL = 1_000

/**
 * @param {{
 *   max: number,
 *   windowMs: number,
 *   message?: string,
 *   keyGenerator?: (req: import('express').Request) => string,
 * }} options
 * @returns {import('express').RequestHandler}
 */
export function createRateLimit({ max, windowMs, message, keyGenerator }) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const hits = new Map()
  let requestsSinceCleanup = 0

  const keyFor = keyGenerator ?? ((req) => req.ip ?? req.socket?.remoteAddress ?? 'unbekannt')
  const limitMessage = message ?? 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.'
  const limit = Math.max(1, max)
  const window = Math.max(1, windowMs)

  return function rateLimit(req, res, next) {
    const now = Date.now()
    const key = keyFor(req)

    // Abgelaufene Eintraege gelegentlich entfernen, damit die Map bei vielen
    // wechselnden IPs nicht unbegrenzt waechst.
    requestsSinceCleanup += 1
    if (requestsSinceCleanup >= CLEANUP_INTERVAL) {
      requestsSinceCleanup = 0
      for (const [entryKey, entry] of hits) {
        if (entry.resetAt <= now) hits.delete(entryKey)
      }
    }

    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + window }
      hits.set(key, entry)
    }

    entry.count += 1
    const remaining = Math.max(0, limit - entry.count)
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))

    res.set('RateLimit-Limit', String(limit))
    res.set('RateLimit-Remaining', String(remaining))
    res.set('RateLimit-Reset', String(retryAfter))

    if (entry.count > limit) {
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({
        error: 'too_many_requests',
        message: limitMessage,
        retryAfter,
      })
    }

    next()
  }
}
