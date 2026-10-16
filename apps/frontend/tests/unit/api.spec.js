import { describe, it, expect, afterEach, vi } from 'vitest'
import { ApiError, api } from '../../src/api.js'

describe('api.js', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch({ ok = true, status = 200, body = {} } = {}) {
    const fn = vi.fn().mockResolvedValue({
      ok,
      status,
      headers: { get: () => 'application/json' },
      json: async () => body,
      text: async () => JSON.stringify(body),
    })
    vi.stubGlobal('fetch', fn)
    return fn
  }

  it('gibt bei Erfolg den JSON-Body zurueck', async () => {
    stubFetch({ body: { status: 'ok' } })
    await expect(api.health()).resolves.toEqual({ status: 'ok' })
  })

  it('wirft einen ApiError mit Status bei HTTP-Fehlern', async () => {
    stubFetch({ ok: false, status: 500, body: { message: 'Interner Serverfehler' } })

    await expect(api.health()).rejects.toBeInstanceOf(ApiError)
    await expect(api.health()).rejects.toThrow('Interner Serverfehler')
  })

  it('uebersetzt Netzwerkfehler in eine lesbare Meldung', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(api.health()).rejects.toThrow(/Backend nicht erreichbar/)
  })

  it('sendet POST-Anfragen als JSON', async () => {
    const fetchMock = stubFetch({ body: { text: 'ok' } })

    await api.aiGenerate({ prompt: 'Test' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/ai/generate')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ prompt: 'Test' })
  })
})
