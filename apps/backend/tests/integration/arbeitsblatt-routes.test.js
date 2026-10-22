import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { REQUEST_T_TEXT, WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

/**
 * Routen-Tests der Arbeitsblatt-Generierung (Supertest, ohne Datenbank).
 * vitest.config.js leert GEMINI_API_KEY – die Generierung laeuft hier also
 * immer im Mock-Modus, auch wenn lokal eine .env mit Key existiert.
 */

describe('POST /api/ai/arbeitsblatt', () => {
  const app = createApp()

  it('lehnt einen leeren Body mit 400 und deutscher Meldung ab', async () => {
    const response = await request(app).post('/api/ai/arbeitsblatt').send({})
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('validation_error')
    expect(response.body.message).toContain('lernziel')
    expect(Array.isArray(response.body.details)).toBe(true)
  })

  it('lehnt eine ungueltige Stufe mit 400 ab', async () => {
    const response = await request(app).post('/api/ai/arbeitsblatt').send({ ...REQUEST_T_TEXT, stufe: 'X' })
    expect(response.status).toBe(400)
    expect(response.body.message).toContain('stufe')
  })

  it('lehnt ein Lernziel ohne Niveaustufen mit 400 ab', async () => {
    const { niveaus: _ignored, ...lernziel } = REQUEST_T_TEXT.lernziel
    const response = await request(app).post('/api/ai/arbeitsblatt').send({ ...REQUEST_T_TEXT, lernziel })
    expect(response.status).toBe(400)
    expect(response.body.message).toContain('niveaus')
  })

  it('liefert im Mock-Modus 200 mit vollstaendigem Arbeitsblatt', async () => {
    const response = await request(app).post('/api/ai/arbeitsblatt').send({ ...REQUEST_T_TEXT, stufe: 'F', format: 'mathefrei', thema: 'LKW' })

    expect(response.status).toBe(200)
    const { worksheet, meta } = response.body
    expect(meta.mocked).toBe(true)
    expect(meta.validation).toEqual({ ok: true, hinweise: [] })
    expect(typeof meta.durationMs).toBe('number')
    expect(meta.promptVersion).toMatch(/^\d+\.\d+\.\d+$/)

    expect(worksheet).toMatchObject({ stufe: 'F', format: 'mathefrei', sprache: 'Leichte Sprache', berufsfeld: REQUEST_T_TEXT.lernziel.berufsfeld, lernziel: 'Güter entladen', baustein: 1 })
    expect(worksheet.aufgaben.length).toBeGreaterThanOrEqual(5)
    expect(worksheet.aufgaben[0]).toMatchObject({ nr: 1 })
    expect(worksheet.woerterbuch.length).toBeGreaterThan(0)
    expect(typeof worksheet.einleitung).toBe('string')
    expect(typeof worksheet.hinweisAnleiter).toBe('string')
  })
})

describe('POST /api/ai/arbeitsblatt/docx', () => {
  const app = createApp()

  it('liefert eine Word-Datei mit richtigem Content-Type und Magic Bytes', async () => {
    const response = await request(app)
      .post('/api/ai/arbeitsblatt/docx')
      .send({ worksheet: { ...WORKSHEET_T_TEXT, baustein: 1 } })
      .responseType('blob')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(response.headers['content-disposition']).toContain('attachment')
    expect(response.headers['content-disposition']).toContain('_T-text.docx')
    expect(Buffer.from(response.body).subarray(0, 2).toString()).toBe('PK')
  })

  it('lehnt ein ungueltiges Arbeitsblatt mit 400 ab', async () => {
    const response = await request(app).post('/api/ai/arbeitsblatt/docx').send({ worksheet: { titel: 'nur ein Titel' } })
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('validation_error')
  })

  it('lehnt einen Body ohne worksheet mit 400 ab', async () => {
    const response = await request(app).post('/api/ai/arbeitsblatt/docx').send({})
    expect(response.status).toBe(400)
  })
})

describe('Bestehende KI-Routen bleiben erhalten', () => {
  const app = createApp()

  it('GET /api/ai/status antwortet weiterhin', async () => {
    const response = await request(app).get('/api/ai/status')
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('configured')
  })
})
