import { describe, it, expect, vi } from 'vitest'
import { bereinigeTreffer, reinerText, sichereUrl, SucheError, sucheOnline, sucheStatus } from '../../src/suche/service.js'

const BASIS = { provider: '', searxngUrl: '', braveApiKey: '', kostenpflichtigErlaubt: false, maxResults: 10, timeoutMs: 1000 }
const SEARXNG = { ...BASIS, provider: 'searxng', searxngUrl: 'http://searxng:8080' }
const BRAVE = { ...BASIS, provider: 'brave', braveApiKey: 'test-key', kostenpflichtigErlaubt: true }

const jsonAntwort = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

describe('sucheStatus', () => {
  it.each([
    [BASIS, /WEB_SEARCH_PROVIDER ist leer/],
    [{ ...BASIS, provider: 'scrape' }, /Unbekannter Anbieter/],
    [{ ...BASIS, provider: 'searxng' }, /SEARXNG_URL fehlt/],
    [{ ...BASIS, provider: 'brave' }, /BRAVE_SEARCH_API_KEY fehlt/],
    [{ ...BRAVE, kostenpflichtigErlaubt: false }, /kostenpflichtig/],
  ])('meldet fehlende Konfiguration (%#)', (cfg, hinweis) => {
    const status = sucheStatus(cfg)
    expect(status.konfiguriert).toBe(false)
    expect(status.hinweis).toMatch(hinweis)
  })

  it('erkennt eine vollständige Konfiguration', () => {
    expect(sucheStatus(SEARXNG)).toEqual({ konfiguriert: true, anbieter: 'searxng', hinweis: null })
    expect(sucheStatus(BRAVE)).toEqual({ konfiguriert: true, anbieter: 'brave', hinweis: null })
  })

  it('verrät keine Schlüssel', () => {
    expect(JSON.stringify(sucheStatus(BRAVE))).not.toContain('test-key')
  })
})

describe('sucheOnline', () => {
  it('ohne Anbieter: 503 suche_nicht_konfiguriert und kein Netzaufruf', async () => {
    const fetchImpl = vi.fn()
    const fehler = await sucheOnline('Holz', { cfg: BASIS, fetchImpl }).catch((e) => e)
    expect(fehler).toBeInstanceOf(SucheError)
    expect(fehler.status).toBe(503)
    expect(fehler.code).toBe('suche_nicht_konfiguriert')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('SearXNG: fragt das JSON-Format an und bildet title/url/snippet ab', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonAntwort({ results: [{ title: 'Holz bearbeiten', url: 'https://example.org/holz.pdf', content: 'Arbeitsblatt zum Sägen' }] }),
    )
    const treffer = await sucheOnline('Holz bearbeiten', { cfg: SEARXNG, fetchImpl })
    expect(treffer).toEqual([{ title: 'Holz bearbeiten', url: 'https://example.org/holz.pdf', snippet: 'Arbeitsblatt zum Sägen' }])
    const aufgerufen = new URL(fetchImpl.mock.calls[0][0])
    expect(aufgerufen.origin + aufgerufen.pathname).toBe('http://searxng:8080/search')
    expect(aufgerufen.searchParams.get('q')).toBe('Holz bearbeiten')
    expect(aufgerufen.searchParams.get('format')).toBe('json')
  })

  it('Brave: schickt den Schlüssel im Header, entfernt <strong> aus den Texten', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonAntwort({ web: { results: [{ title: '<strong>Holz</strong> &amp; Metall', url: 'https://example.org/a', description: 'Mit <strong>Holz</strong> arbeiten' }] } }),
    )
    const treffer = await sucheOnline('Holz', { cfg: BRAVE, fetchImpl })
    expect(treffer).toEqual([{ title: 'Holz & Metall', url: 'https://example.org/a', snippet: 'Mit Holz arbeiten' }])
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/api\.search\.brave\.com\/res\/v1\/web\/search\?/)
    expect(init.headers['X-Subscription-Token']).toBe('test-key')
  })

  it('Brave ohne Treffer: leere Liste statt Fehler', async () => {
    const treffer = await sucheOnline('xyz', { cfg: BRAVE, fetchImpl: async () => jsonAntwort({ type: 'search' }) })
    expect(treffer).toEqual([])
  })

  it.each([
    [async () => { throw new TypeError('fetch failed') }, 502, 'suchanbieter_nicht_erreichbar'],
    [async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }) }, 504, 'suchanbieter_timeout'],
    [async () => jsonAntwort({}, 429), 503, 'suchanbieter_limit'],
    [async () => jsonAntwort({}, 401), 502, 'suchanbieter_zugang'],
    [async () => jsonAntwort({}, 500), 502, 'suchanbieter_fehler'],
    [async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('html') } }), 502, 'suchanbieter_fehler'],
    [async () => jsonAntwort({ unerwartet: true }), 502, 'suchanbieter_fehler'],
  ])('Anbieterfehler werden verständlich gemeldet, nie durch erfundene Treffer ersetzt (%#)', async (fetchImpl, status, code) => {
    const fehler = await sucheOnline('Holz', { cfg: SEARXNG, fetchImpl }).catch((e) => e)
    expect(fehler).toBeInstanceOf(SucheError)
    expect(fehler.status).toBe(status)
    expect(fehler.code).toBe(code)
  })

  it('weist bei HTML statt JSON auf die SearXNG-Einstellung hin', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('html') } })
    const fehler = await sucheOnline('Holz', { cfg: SEARXNG, fetchImpl }).catch((e) => e)
    expect(fehler.message).toMatch(/search\.formats/)
  })
})

describe('bereinigeTreffer', () => {
  it('lässt nur sichere http(s)-URLs zu, entfernt Dubletten und begrenzt die Anzahl', () => {
    const roh = [
      { title: 'A', url: 'https://example.org/a', snippet: 'x' },
      { title: 'A doppelt', url: 'https://example.org/a', snippet: 'y' },
      { title: 'JS', url: 'javascript:alert(1)' },
      { title: 'Daten', url: 'data:text/html,hi' },
      { title: 'Mit Zugangsdaten', url: 'https://user:pass@example.org/' },
      { title: '', url: 'https://example.org/ohne-titel' },
      { title: 'B', url: 'http://example.org/b' },
      { title: 'C', url: 'https://example.org/c' },
    ]
    expect(bereinigeTreffer(roh, 2)).toEqual([
      { title: 'A', url: 'https://example.org/a', snippet: 'x' },
      { title: 'B', url: 'http://example.org/b', snippet: '' },
    ])
  })

  it('sichereUrl und reinerText', () => {
    expect(sichereUrl('ftp://example.org')).toBeNull()
    expect(sichereUrl('keine url')).toBeNull()
    expect(reinerText('  a <b>b</b>\n&lt;c&gt; ')).toBe('a b <c>')
  })
})
