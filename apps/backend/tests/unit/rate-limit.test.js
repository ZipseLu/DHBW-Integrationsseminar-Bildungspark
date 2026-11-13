import { describe, it, expect } from 'vitest'
import { createRateLimit } from '../../src/http/rate-limit.js'

/** Minimaler Express-Response fuer den Test des Middleware-Verhaltens. */
function call(limiter, ip) {
  const headers = {}
  let status = 200
  let body
  let nextCalled = false

  const req = { ip }
  const res = {
    set(name, value) {
      headers[name] = value
      return this
    },
    status(code) {
      status = code
      return this
    },
    json(payload) {
      body = payload
      return this
    },
  }

  limiter(req, res, () => {
    nextCalled = true
  })

  return { headers, status, body, nextCalled }
}

describe('createRateLimit', () => {
  it('laesst Anfragen bis zum Limit durch und antwortet danach mit 429', () => {
    const limiter = createRateLimit({ max: 2, windowMs: 60_000 })

    expect(call(limiter, '10.0.0.1').nextCalled).toBe(true)
    expect(call(limiter, '10.0.0.1').nextCalled).toBe(true)

    const blocked = call(limiter, '10.0.0.1')
    expect(blocked.nextCalled).toBe(false)
    expect(blocked.status).toBe(429)
    expect(blocked.body).toMatchObject({ error: 'too_many_requests' })
    expect(blocked.headers['Retry-After']).toBeDefined()
    expect(blocked.headers['RateLimit-Remaining']).toBe('0')
  })

  it('zaehlt verschiedene IPs getrennt', () => {
    const limiter = createRateLimit({ max: 1, windowMs: 60_000 })

    expect(call(limiter, '10.0.0.1').nextCalled).toBe(true)
    expect(call(limiter, '10.0.0.2').nextCalled).toBe(true)
    expect(call(limiter, '10.0.0.1').status).toBe(429)
  })
})
