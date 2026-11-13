import { describe, it, expect, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { createSucheRouter } from '../../src/routes/suche.js'
import { SucheError } from '../../src/suche/service.js'
import { api } from '../helpers/auth.js'

describe('GET /api/suche (FE-14)', () => {
  const app = createApp()

  it('verlangt eine Anmeldung', async () => {
    expect((await request(app).get('/api/suche?q=Holz')).status).toBe(401)
  })

  it('400 ohne Suchbegriff oder mit zu langem Begriff', async () => {
    expect((await api(app, 'dozent').get('/api/suche')).status).toBe(400)
    expect((await api(app, 'dozent').get('/api/suche?q=%20%20')).status).toBe(400)
    expect((await api(app, 'dozent').get(`/api/suche?q=${'a'.repeat(201)}`)).status).toBe(400)
  })

  it('ohne eingerichteten Anbieter: 503 suche_nicht_konfiguriert, keine erfundenen Treffer', async () => {
    const response = await api(app, 'assistent').get('/api/suche?q=Holz')
    expect(response.status).toBe(503)
    expect(response.body).toMatchObject({ error: 'search_unavailable', code: 'suche_nicht_konfiguriert' })
    expect(response.body.message).toMatch(/nicht eingerichtet/)
    expect(response.body.results).toBeUndefined()
  })

  it('GET /api/suche/status sagt, was fehlt', async () => {
    const response = await api(app, 'dozent').get('/api/suche/status')
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ konfiguriert: false, anbieter: null })
  })

  it('Rate-Limit pro Konto', async () => {
    const limitiert = createApp({ rateLimit: { sucheMax: 1, sucheWindowMs: 60_000 } })
    expect((await api(limitiert, 'dozent').get('/api/suche?q=Holz')).status).toBe(503)
    const gesperrt = await api(limitiert, 'dozent').get('/api/suche?q=Holz')
    expect(gesperrt.status).toBe(429)
    expect(gesperrt.body.code).toBe('zu_viele_suchanfragen')
  })
})

describe('Suchroute mit nachgebautem Anbieter', () => {
  const mitSuche = (suche) => express().use('/api/suche', createSucheRouter({ suche }))

  it('liefert { results: [{ title, url, snippet }] } im Vertrag des Frontends', async () => {
    const suche = vi.fn(async () => [{ title: 'Holz bearbeiten', url: 'https://example.org/holz.pdf', snippet: 'Kurz' }])
    const response = await request(mitSuche(suche)).get('/api/suche?q=Holz%20bearbeiten')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ results: [{ title: 'Holz bearbeiten', url: 'https://example.org/holz.pdf', snippet: 'Kurz' }] })
    expect(suche).toHaveBeenCalledWith('Holz bearbeiten')
  })

  it('reicht Anbieterfehler mit Status und Code durch', async () => {
    const suche = async () => { throw new SucheError('Der Suchanbieter (SearXNG) hat nicht rechtzeitig geantwortet.', 504, 'suchanbieter_timeout') }
    const response = await request(mitSuche(suche)).get('/api/suche?q=Holz')
    expect(response.status).toBe(504)
    expect(response.body).toEqual({ error: 'search_unavailable', code: 'suchanbieter_timeout', message: 'Der Suchanbieter (SearXNG) hat nicht rechtzeitig geantwortet.' })
  })
})
