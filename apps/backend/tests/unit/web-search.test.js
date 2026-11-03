import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { config } from '../../src/config.js'
import { searchWeb } from '../../src/web-search/service.js'
import { WebSearchError } from '../../src/web-search/service.js'

/**
 * Unit-Tests für den Web-Search-Service.
 * Laufen ohne echte API-Aufrufe und ohne Kosten. fetch wird gemockt.
 */

const originalProvider = config.webSearch.provider

beforeEach(() => {
  config.webSearch.provider = 'mock'
})

afterEach(() => {
  config.webSearch.provider = originalProvider
  vi.restoreAllMocks()
})

describe('searchWeb – Mock-Modus (kein Internet noetig)', () => {
  it('liefert simulierte Treffer für einen Suchbegriff', async () => {
    const results = await searchWeb('Gabelstapler Sicherheit')

    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toMatchObject({
      title: expect.any(String),
      url: expect.any(String),
      snippet: expect.any(String),
      source: expect.any(String),
      mocked: true,
    })
  })

  it('respektiert maxResults aus der Konfiguration', async () => {
    config.webSearch.maxResults = 2
    const results = await searchWeb('Hygiene')
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('wirft einen Fehler bei leerem Suchbegriff', async () => {
    await expect(searchWeb('')).rejects.toBeInstanceOf(WebSearchError)
    await expect(searchWeb('')).rejects.toMatchObject({
      code: 'validation_error',
      status: 400,
    })
  })

  it('wirft einen Fehler bei Whitespace-only Suchbegriff', async () => {
    await expect(searchWeb('   ')).rejects.toBeInstanceOf(WebSearchError)
  })
})

describe('searchWeb – Scrape-Modus (DuckDuckGo HTML)', () => {
  const duckduckgoHtml = `
    <html><body>
      <div class="result results_links">
        <div class="links_main">
          <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.de%2Farbeitsblatt.pdf">Arbeitsblatt: Hygiene</a>
          <div class="result__snippet">Snippet zu Hygiene und Sicherheit am Arbeitsplatz.</div>
        </div>
      </div>
      <div class="result results_links">
        <div class="links_main">
          <a class="result__a" href="https://bibb.de/material.pdf">BIBB Arbeitsblatt</a>
          <div class="result__snippet">Offizielles BIBB Material zur Ausbildung.</div>
        </div>
      </div>
    </body></html>
  `

  it('ruft DuckDuckGo HTML auf und parst Treffer', async () => {
    config.webSearch.provider = 'scrape'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => duckduckgoHtml,
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWeb('Hygiene filetype:pdf')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = fetchMock.mock.calls[0][0]
    expect(calledUrl).toContain('html.duckduckgo.com/html/')
    expect(calledUrl).toContain('q=Hygiene+filetype%3Apdf')

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      title: 'Arbeitsblatt: Hygiene',
      url: 'https://example.de/arbeitsblatt.pdf',
      snippet: 'Snippet zu Hygiene und Sicherheit am Arbeitsplatz.',
      source: 'example.de',
      mocked: false,
    })
    expect(results[1]).toMatchObject({
      title: 'BIBB Arbeitsblatt',
      url: 'https://bibb.de/material.pdf',
      source: 'bibb.de',
      mocked: false,
    })
  })

  it('fällt auf Mock zurück, wenn DuckDuckGo keine Treffer liefert', async () => {
    config.webSearch.provider = 'scrape'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body>Keine Treffer</body></html>',
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWeb('XYZ123NichtVorhanden')

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.mocked === true)).toBe(true)
  })

  it('fällt auf Mock zurück, wenn DuckDuckGo nicht erreichbar ist', async () => {
    config.webSearch.provider = 'scrape'

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Netzwerkfehler')))

    const results = await searchWeb('Hygiene')

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.mocked === true)).toBe(true)
  })

  it('fällt auf Mock zurück, wenn DuckDuckGo einen Fehler liefert', async () => {
    config.webSearch.provider = 'scrape'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWeb('Hygiene')

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.mocked === true)).toBe(true)
  })
})
