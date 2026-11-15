import { describe, expect, it } from 'vitest'
import { requestLogFormat, safeRequestUrl } from '../../src/http/request-logger.js'

describe('Request-Logging ohne vertrauliche Request-Daten', () => {
  it('entfernt Query-Strings und pseudonyme oder ungültige Kennungen aus dem Logpfad', () => {
    expect(safeRequestUrl({ originalUrl: '/api/teilnehmende/IW3-4421/zuordnungen?status=offen&token=secret' })).toBe(
      '/api/teilnehmende/[redacted]/zuordnungen',
    )
    expect(safeRequestUrl({ originalUrl: '/api/teilnehmende/Max%20Mustermann?name=Max' })).toBe('/api/teilnehmende/[redacted]')
    expect(safeRequestUrl({ originalUrl: '/api/teilnehmende/lernstand?kennung=IW3-4421' })).toBe('/api/teilnehmende/lernstand')
    expect(safeRequestUrl({ originalUrl: '/api/auth/login?passwort=secret&token=secret' })).toBe('/api/auth/login')
  })

  it('protokolliert weder Request-Body noch Header, Referrer oder User-Agent', () => {
    for (const env of ['development', 'production']) {
      const format = requestLogFormat(env)
      expect(format).toContain(':safe-url')
      expect(format).not.toContain(':url')
      expect(format).not.toMatch(/:req\[|:referrer|:user-agent|:remote-user|:remote-addr/)
    }
  })
})
