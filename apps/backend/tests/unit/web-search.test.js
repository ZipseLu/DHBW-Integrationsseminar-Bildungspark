import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { config } from '../../src/config.js'
import { searchWeb, WebSearchError } from '../../src/web-search/service.js'

/**
 * Unit-Tests für den Web-Search-Service.
 * Laufen ohne echte Netzwerkaufrufe: axios wird gemockt.
 */

vi.mock('axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

const originalProvider = config.webSearch.provider
const originalMaxResults = config.webSearch.maxResults

beforeEach(() => {
  config.webSearch.provider = 'mock'
  config.webSearch.maxResults = originalMaxResults
  vi.mocked(axios.post).mockReset()
  vi.mocked(axios.get).mockReset()
})

afterEach(() => {
  config.webSearch.provider = originalProvider
  config.webSearch.maxResults = originalMaxResults
  vi.restoreAllMocks()
})

describe('searchWeb – Mock-Modus (kein Internet nötig)', () => {
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

  it('wirft einen Fehler bei nicht unterstütztem Dateityp', async () => {
    await expect(searchWeb('Hygiene', 'exe')).rejects.toMatchObject({
      code: 'validation_error',
      status: 400,
    })
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
      <div class="result result--ad">
        <a class="result__a" href="https://werbung.example/ad.pdf">Anzeige</a>
      </div>
    </body></html>
  `

  it('ruft DuckDuckGo per POST auf und parst Treffer', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: duckduckgoHtml })

    const results = await searchWeb('Hygiene filetype:pdf')

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [calledUrl, calledBody, calledOptions] = vi.mocked(axios.post).mock.calls[0]
    expect(calledUrl).toContain('html.duckduckgo.com/html/')
    expect(calledBody).toBe('q=Hygiene+filetype%3Apdf')
    expect(calledOptions).toMatchObject({
      headers: expect.objectContaining({ 'User-Agent': expect.any(String) }),
    })

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      title: 'Arbeitsblatt: Hygiene',
      url: 'https://example.de/arbeitsblatt.pdf',
      snippet: 'Snippet zu Hygiene und Sicherheit am Arbeitsplatz.',
      source: 'example.de',
      fileType: 'pdf',
      mocked: false,
    })
    expect(results[1]).toMatchObject({
      title: 'BIBB Arbeitsblatt',
      url: 'https://bibb.de/material.pdf',
      source: 'bibb.de',
      mocked: false,
    })
  })

  it('ergänzt den filetype-Operator aus dem separaten Filter', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: '<html><body><div class="result"><a class="result__a" href="https://example.de/material.docx">Arbeitsblatt</a></div></body></html>',
    })

    await searchWeb('Hygiene', 'docx')

    const [, calledBody] = vi.mocked(axios.post).mock.calls[0]
    expect(calledBody).toBe('q=Hygiene+filetype%3Adocx')
  })

  it('meldet einen Fehler, wenn keine Suchmaschine Dokumente liefert', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: '<html><body>Keine Treffer</body></html>' })
    vi.mocked(axios.get).mockRejectedValue(new Error('Netzwerkfehler'))

    await expect(searchWeb('XYZ123NichtVorhanden')).rejects.toMatchObject({
      code: 'web_search_unavailable',
      status: 503,
    })
  })

  it('nutzt Yahoo als Ersatz, wenn DuckDuckGo Bot-Schutz meldet', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({
      status: 202,
      data: '<html><body>Unfortunately, bots use DuckDuckGo too. Anomaly detected.</body></html>',
    })
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: `
        <html><body>
          <div class="algo">
            <div class="compTitle">
              <a href="https://r.search.yahoo.com/_ylt=abc/RU=https%3a%2f%2fexample.de%2fkochrezept.pdf/RK=2/RS=def">
                <h3><span>Arbeitsblatt Kochen</span></h3>
              </a>
            </div>
            <div class="compText"><p>Aufgaben rund um das Kochen.</p></div>
          </div>
        </body></html>
      `,
    })

    const results = await searchWeb('Kochen', 'pdf')

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get.mock.calls[0][0]).toContain('search.yahoo.com/search')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      title: 'Arbeitsblatt Kochen',
      url: 'https://example.de/kochrezept.pdf',
      snippet: 'Aufgaben rund um das Kochen.',
      source: 'example.de',
      fileType: 'pdf',
      mocked: false,
    })
  })

  it('entfernt den Breadcrumb aus Yahoo-Titeln', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({
      status: 202,
      data: '<html><body>Unfortunately, bots use DuckDuckGo too. Anomaly detected.</body></html>',
    })
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: `
        <html><body>
          <div class="algo">
            <div class="compTitle">
              <a aria-label="Arbeitsblatt Kochen" href="https://r.search.yahoo.com/_ylt=abc/RU=https%3a%2f%2fexample.de%2fkochrezept.docx/RK=2/RS=def">
                <h3>
                  <span class="d-ib p-abs">www.example.de<span class="p-crumb"> · sites · default</span></span>
                  Arbeitsblatt Kochen
                </h3>
              </a>
            </div>
          </div>
        </body></html>
      `,
    })

    const results = await searchWeb('Kochen', 'docx')

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Arbeitsblatt Kochen')
  })

  it('nutzt Bing als Ersatz, wenn DuckDuckGo und Yahoo ausfallen', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({
      status: 202,
      data: '<html><body>Unfortunately, bots use DuckDuckGo too. Anomaly detected.</body></html>',
    })
    vi.mocked(axios.get).mockImplementation((url) => {
      if (String(url).includes('search.yahoo.com')) {
        return Promise.reject(new Error('Netzwerkfehler'))
      }
      return Promise.resolve({
        status: 200,
        data: `
          <html><body>
            <li class="b_algo">
              <h2>
                <a href="https://www.bing.com/ck/a?!&&u=a1aHR0cHM6Ly9leGFtcGxlLmRlL2FyYmVpdHNibGF0dC5wZGY&ntb=1">
                  Arbeitsblatt Hygiene (Bing)
                </a>
              </h2>
              <div class="b_caption"><p>Beschreibung aus Bing.</p></div>
            </li>
            <li class="b_algo">
              <h2><a href="https://www.bing.com/ck/a?!&&u=unlesbar&ntb=1">Ohne Ziel</a></h2>
            </li>
          </body></html>
        `,
      })
    })

    const results = await searchWeb('Hygiene', 'pdf')

    const calledUrls = vi.mocked(axios.get).mock.calls.map((call) => String(call[0]))
    expect(calledUrls.some((url) => url.includes('search.yahoo.com'))).toBe(true)
    expect(calledUrls.some((url) => url.includes('bing.com/search'))).toBe(true)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      title: 'Arbeitsblatt Hygiene (Bing)',
      url: 'https://example.de/arbeitsblatt.pdf',
      snippet: 'Beschreibung aus Bing.',
      source: 'example.de',
      fileType: 'pdf',
      mocked: false,
    })
  })

  it('liefert nur echte Dokumente und filtert normale Webseiten aus', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: `
        <html><body>
          <div class="result">
            <a class="result__a" href="https://de.wikipedia.org/wiki/Hygiene">Hygiene – Wikipedia</a>
          </div>
          <div class="result">
            <a class="result__a" href="https://example.de/hygiene-arbeitsblatt.pdf">Arbeitsblatt Hygiene</a>
          </div>
        </body></html>
      `,
    })

    const results = await searchWeb('Hygiene')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      url: 'https://example.de/hygiene-arbeitsblatt.pdf',
      fileType: 'pdf',
      mocked: false,
    })
  })

  it('sucht ohne Dateityp-Auswahl standardmäßig nach PDF und DOCX', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: duckduckgoHtml })

    await searchWeb('Hygiene')

    const [, calledBody] = vi.mocked(axios.post).mock.calls[0]
    expect(calledBody).toBe(
      new URLSearchParams({ q: 'Hygiene (filetype:pdf OR filetype:docx)' }).toString(),
    )
  })

  it('wechselt bei Yahoo auf einen anderen Host, wenn einer HTTP 500 liefert', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({
      status: 202,
      data: '<html><body>Unfortunately, bots use DuckDuckGo too. Anomaly detected.</body></html>',
    })
    let requestCount = 0
    vi.mocked(axios.get).mockImplementation(() => {
      requestCount += 1
      if (requestCount === 1) return Promise.resolve({ status: 500, data: '' })
      return Promise.resolve({
        status: 200,
        data: `
          <html><body>
            <div class="algo">
              <div class="compTitle">
                <a href="https://r.search.yahoo.com/_ylt=abc/RU=https%3a%2f%2fexample.de%2fhygiene.pdf/RK=2/RS=def">
                  <h3><span>Arbeitsblatt Hygiene</span></h3>
                </a>
              </div>
            </div>
          </body></html>
        `,
      })
    })

    const results = await searchWeb('Hygiene', 'pdf')

    const yahooCalls = vi
      .mocked(axios.get)
      .mock.calls.map((call) => String(call[0]))
      .filter((url) => url.includes('search.yahoo.com'))
    expect(yahooCalls).toHaveLength(2)
    expect(yahooCalls[0]).not.toBe(yahooCalls[1])
    expect(results).toHaveLength(1)
    expect(results[0].url).toBe('https://example.de/hygiene.pdf')
  })

  it('meldet einen Fehler, wenn DuckDuckGo nicht erreichbar ist und die Ersatzquellen ausfallen', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockRejectedValue(new Error('Netzwerkfehler'))
    vi.mocked(axios.get).mockRejectedValue(new Error('Netzwerkfehler'))

    await expect(searchWeb('Hygiene')).rejects.toMatchObject({
      code: 'web_search_unavailable',
      status: 503,
      message: expect.stringContaining('Websuche'),
    })
  })

  it('meldet einen Fehler, wenn DuckDuckGo einen Fehler liefert und die Ersatzquellen ausfallen', async () => {
    config.webSearch.provider = 'scrape'
    vi.mocked(axios.post).mockResolvedValue({ status: 503, data: '' })
    vi.mocked(axios.get).mockRejectedValue(new Error('Netzwerkfehler'))

    await expect(searchWeb('Hygiene')).rejects.toMatchObject({
      code: 'web_search_unavailable',
      status: 503,
    })
  })

  it('bricht ab, wenn das Gesamtzeitlimit bereits aufgebraucht ist', async () => {
    const originalTotalTimeout = config.webSearch.totalTimeoutMs
    config.webSearch.provider = 'scrape'
    config.webSearch.totalTimeoutMs = 0

    try {
      await expect(searchWeb('Hygiene')).rejects.toMatchObject({
        code: 'web_search_unavailable',
        status: 503,
      })
      expect(axios.post).not.toHaveBeenCalled()
      expect(axios.get).not.toHaveBeenCalled()
    } finally {
      config.webSearch.totalTimeoutMs = originalTotalTimeout
    }
  })
})
