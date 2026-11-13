import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { api, bearer } from '../helpers/auth.js'
import { REQUEST_T_TEXT } from '../fixtures/arbeitsblatt.js'

/**
 * Zugriffsschutz (BE-06): Anmeldung ist für jede API-Route Pflicht, außer
 * /api/health und POST /api/auth/login. Alle Prüfungen greifen vor der Datenbank –
 * die Tests laufen deshalb auch ohne MySQL.
 */
const ID = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90'

describe('Zugriffsschutz (BE-06)', () => {
  const app = createApp()

  it.each([
    ['get', '/api/arbeitsblaetter'],
    ['get', `/api/arbeitsblaetter/${ID}`],
    ['get', `/api/arbeitsblaetter/${ID}/docx`],
    ['post', '/api/arbeitsblaetter'],
    ['patch', `/api/arbeitsblaetter/${ID}`],
    ['delete', `/api/arbeitsblaetter/${ID}`],
    ['post', '/api/ai/arbeitsblatt'],
    ['post', '/api/ai/arbeitsblatt/docx'],
    ['post', '/api/ai/generate'],
    ['get', '/api/ai/status'],
    ['get', '/api/lehrplaene'],
    ['get', '/api/teilnehmende'],
    ['put', '/api/teilnehmende/IW3-4421'],
    ['get', '/api/benutzer'],
    ['get', '/api/auth/me'],
    ['get', '/api/gibt-es-nicht'],
  ])('%s %s ohne Token -> 401', async (methode, pfad) => {
    const response = await request(app)[methode](pfad)
    expect(response.status).toBe(401)
    expect(response.headers['www-authenticate']).toBe('Bearer')
    expect(response.body).toMatchObject({ error: 'unauthorized', code: 'anmeldung_erforderlich' })
  })

  it('weist ein gefälschtes Token mit 401 token_ungueltig ab', async () => {
    const response = await request(app).get('/api/arbeitsblaetter').set('Authorization', 'Bearer kein.echtes.token')
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('token_ungueltig')
  })

  it('weist ein falsches Header-Format ab', async () => {
    const response = await request(app).get('/api/arbeitsblaetter').set('Authorization', 'Basic YWRtaW46YWRtaW4=')
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('token_ungueltig')
  })

  it('lässt /api/health und den Login ohne Token zu', async () => {
    // Health antwortet ohne Datenbank mit 503 – entscheidend ist: kein 401
    expect((await request(app).get('/api/health')).status).not.toBe(401)
    // Login ohne Daten: Validierung (400), nicht 401
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400)
  })

  it('beantwortet den CORS-Preflight mit Authorization-Header ohne Token', async () => {
    const response = await request(app)
      .options('/api/arbeitsblaetter')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization')
    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-headers']).toMatch(/authorization/i)
  })

  it('erlaubt mit gültigem Token die KI-Erstellung (Mock-Modus)', async () => {
    const response = await api(app, 'assistent').post('/api/ai/arbeitsblatt').send(REQUEST_T_TEXT)
    expect(response.status).toBe(200)
    expect(response.body.worksheet).toBeTruthy()
  })
})

describe('Rollen (BE-06)', () => {
  const app = createApp()

  it('Status ändern (Freigabe) nur für admin und dozent', async () => {
    const response = await api(app, 'assistent').patch(`/api/arbeitsblaetter/${ID}`).send({ status: 'freigegeben' })
    expect(response.status).toBe(403)
    expect(response.body.error).toBe('forbidden')
  })

  it('Archivieren nur für admin und dozent', async () => {
    expect((await api(app, 'assistent').delete(`/api/arbeitsblaetter/${ID}`)).status).toBe(403)
  })

  it('endgültig löschen nur für admin', async () => {
    expect((await api(app, 'dozent').delete(`/api/arbeitsblaetter/${ID}?endgueltig=true`)).status).toBe(403)
    expect((await api(app, 'assistent').delete(`/api/arbeitsblaetter/${ID}?endgueltig=true`)).status).toBe(403)
  })

  it('Teilnehmerprofile löschen nur für admin und dozent', async () => {
    expect((await api(app, 'assistent').delete('/api/teilnehmende/IW3-4421')).status).toBe(403)
  })

  it('Benutzerverwaltung nur für admin', async () => {
    expect((await request(app).get('/api/benutzer').set('Authorization', bearer('dozent'))).status).toBe(403)
    expect((await request(app).get('/api/benutzer').set('Authorization', bearer('assistent'))).status).toBe(403)
  })
})

describe('Rate-Limit für KI-Aufrufe (BE-06)', () => {
  it('antwortet nach dem Limit pro Konto mit 429', async () => {
    const app = createApp({ rateLimit: { kiMax: 1, kiWindowMs: 60_000 } })
    expect((await api(app, 'dozent').post('/api/ai/arbeitsblatt').send(REQUEST_T_TEXT)).status).toBe(200)
    const gesperrt = await api(app, 'dozent').post('/api/ai/arbeitsblatt').send(REQUEST_T_TEXT)
    expect(gesperrt.status).toBe(429)
    expect(gesperrt.body.code).toBe('zu_viele_ki_anfragen')
    // Anderes Konto hat ein eigenes Kontingent
    expect((await api(app, 'admin').post('/api/ai/arbeitsblatt').send(REQUEST_T_TEXT)).status).toBe(200)
    // Lesende KI-Routen zählen nicht
    expect((await api(app, 'dozent').get('/api/ai/status')).status).toBe(200)
  })
})
