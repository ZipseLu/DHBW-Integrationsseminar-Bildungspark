import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'

/**
 * API-Routen-Tests (Supertest).
 *
 * Supertest laedt die Express-App direkt in den Speicher – kein Port noetig,
 * kein Docker, keine Datenbank. Deshalb laufen diese Tests ueberall.
 */
describe('GET /api/health', () => {
  const app = createApp()

  it('antwortet mit 200 und Status "ok", wenn die DB erreichbar ist', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'bildungspark-backend',
    })
    expect(response.body.database.status).toBe('up')
    expect(typeof response.body.database.latencyMs).toBe('number')
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  it('liefert einen ISO-Zeitstempel', async () => {
    const response = await request(app).get('/api/health')
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date')
  })
})

describe('GET /api/ai/status', () => {
  const app = createApp()

  it('meldet den konfigurierten Provider', async () => {
    const response = await request(app).get('/api/ai/status')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('provider')
    expect(response.body).toHaveProperty('configured')
    expect(typeof response.body.configured).toBe('boolean')
  })
})

describe('POST /api/ai/generate', () => {
  const app = createApp()

  it('lehnt einen leeren Prompt mit 400 ab', async () => {
    const response = await request(app).post('/api/ai/generate').send({ prompt: '   ' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('validation_error')
  })

  it('lehnt einen fehlenden Prompt mit 400 ab', async () => {
    const response = await request(app).post('/api/ai/generate').send({})

    expect(response.status).toBe(400)
  })

  it('antwortet ohne API-Key im Mock-Modus statt zu crashen', async () => {
    const response = await request(app)
      .post('/api/ai/generate')
      .send({ system: 'Du bist Lehrkraft.', prompt: 'Erstelle ein Arbeitsblatt.' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('text')
    expect(response.body).toHaveProperty('provider')
  })
})

describe('Unbekannte Routen', () => {
  const app = createApp()

  it('antwortet mit 404 und maschinenlesbarem Fehlerformat', async () => {
    const response = await request(app).get('/api/gibt-es-nicht')

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('not_found')
    expect(response.body.message).toContain('/api/gibt-es-nicht')
  })
})
