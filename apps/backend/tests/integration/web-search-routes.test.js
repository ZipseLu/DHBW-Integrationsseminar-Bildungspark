import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { config } from '../../src/config.js'

/**
 * Routen-Tests fuer GET /api/web-search.
 * Der Mock-Modus wird erzwungen, damit kein echter Netzwerkaufruf stattfindet.
 */

const app = createApp()
const originalProvider = config.webSearch.provider

beforeEach(() => {
  config.webSearch.provider = 'mock'
})

afterEach(() => {
  config.webSearch.provider = originalProvider
})

describe('GET /api/web-search', () => {
  it('lehnt einen leeren Suchbegriff mit 400 ab', async () => {
    const response = await request(app).get('/api/web-search?q=')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('validation_error')
  })

  it('lehnt einen nicht unterstuetzten Dateityp mit 400 ab', async () => {
    const response = await request(app).get('/api/web-search?q=Hygiene&fileType=exe')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('validation_error')
  })

  it('liefert Treffer inklusive Dateityp', async () => {
    const response = await request(app).get('/api/web-search?q=Hygiene&fileType=pdf')

    expect(response.status).toBe(200)
    expect(response.body.query).toBe('Hygiene')
    expect(response.body.count).toBeGreaterThan(0)
    expect(response.body.results[0]).toMatchObject({
      title: expect.any(String),
      url: expect.any(String),
      source: expect.any(String),
      fileType: 'pdf',
      mocked: true,
    })
  })
})
