import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { config } from '../../src/config.js'
import { searchWeb } from '../../src/web-search/service.js'
import { WebSearchError } from '../../src/web-search/service.js'

/**
 * Unit-Tests für den Web-Search-Service.
 * Laufen immer im Mock-Modus (keine echten API-Aufrufe, keine Kosten).
 */

const originalProvider = config.webSearch.provider
const originalApiKey = config.webSearch.apiKey
const originalEngineId = config.webSearch.engineId

beforeEach(() => {
  // Jeder Test startet sauber im Mock-Modus
  config.webSearch.provider = 'mock'
  config.webSearch.apiKey = ''
  config.webSearch.engineId = ''
})

afterEach(() => {
  config.webSearch.provider = originalProvider
  config.webSearch.apiKey = originalApiKey
  config.webSearch.engineId = originalEngineId
  vi.restoreAllMocks()
})

describe('searchWeb – Mock-Modus (kein API-Key)', () => {
  it('liefert simulierte Treffer für einen Suchbegriff', async () => {
    const results = await searchWeb('Gabelstapler Sicherheit')

    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toMatchObject({
      title: expect.any(String),
      url: expect.any(String),
      snippet: expect.any(String),
      source: expect.any(String),
      fileType: expect.any(String),
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

describe('searchWeb – SerpApi-Modus', () => {
  it('ruft die SerpApi mit korrekten Parametern auf', async () => {
    config.webSearch.provider = 'serpapi'
    config.webSearch.apiKey = 'test-serpapi-key'
    config.webSearch.maxResults = 5

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic_results: [
          {
            title: 'Arbeitsblatt: Hygiene',
            link: 'https://example.de/arbeitsblatt.pdf',
            snippet: 'Snippet zu Hygiene',
            source: 'example.de',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWeb('Hygiene filetype:pdf')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = fetchMock.mock.calls[0][0]
    expect(calledUrl).toContain('serpapi.com/search.json')
    expect(calledUrl).toContain('q=Hygiene+filetype%3Apdf')
    expect(calledUrl).toContain('api_key=test-serpapi-key')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      title: 'Arbeitsblatt: Hygiene',
      url: 'https://example.de/arbeitsblatt.pdf',
      fileType: 'pdf',
    })
  })

  it('wirft 503 wenn SerpApi nicht erreichbar ist', async () => {
    config.webSearch.provider = 'serpapi'
    config.webSearch.apiKey = 'test-key'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'Bad Gateway',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchWeb('Hygiene')).rejects.toMatchObject({
      code: 'web_search_unavailable',
      status: 503,
    })
  })

  it('wirft 503 wenn kein API-Key gesetzt ist', async () => {
    config.webSearch.provider = 'serpapi'
    config.webSearch.apiKey = ''

    await expect(searchWeb('Hygiene')).rejects.toMatchObject({
      code: 'web_search_unavailable',
      status: 503,
    })
  })
})

describe('searchWeb – Google Custom Search-Modus', () => {
  it('ruft die Google Custom Search API auf', async () => {
    config.webSearch.provider = 'google'
    config.webSearch.apiKey = 'test-google-key'
    config.webSearch.engineId = 'test-engine-id'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            title: 'BIBB Arbeitsblatt',
            link: 'https://bibb.de/material.pdf',
            snippet: 'Offizielles BIBB Material',
            displayLink: 'bibb.de',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchWeb('BIBB Ausbildung')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = fetchMock.mock.calls[0][0]
    expect(calledUrl).toContain('www.googleapis.com/customsearch/v1')
    expect(calledUrl).toContain('key=test-google-key')
    expect(calledUrl).toContain('cx=test-engine-id')
    expect(calledUrl).toContain('q=BIBB+Ausbildung')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      title: 'BIBB Arbeitsblatt',
      url: 'https://bibb.de/material.pdf',
      source: 'bibb.de',
    })
  })

  it('wirft 503 wenn Key oder Engine-ID fehlt', async () => {
    config.webSearch.provider = 'google'
    config.webSearch.apiKey = ''
    config.webSearch.engineId = ''

    await expect(searchWeb('Hygiene')).rejects.toMatchObject({
      code: 'web_search_unavailable',
      status: 503,
    })
  })
})

describe('searchWeb – unbekannter Provider', () => {
  it('wirft einen internen Fehler', async () => {
    config.webSearch.provider = 'unbekannt'

    await expect(searchWeb('Hygiene')).rejects.toMatchObject({
      code: 'internal_error',
      status: 500,
    })
  })
})
