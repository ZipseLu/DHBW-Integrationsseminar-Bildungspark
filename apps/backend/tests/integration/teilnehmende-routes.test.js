import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { BEISPIEL_TEILNEHMENDE, seedTeilnehmende } from '../../src/teilnehmende/seed.js'

/**
 * Routen der Teilnehmenden-Verwaltung (BE-02) gegen eine echte MySQL.
 * Wie arbeitsblaetter-routes.test.js: nur mit gesetztem DB_HOST und nur gegen
 * eine *_test-Datenbank; sonst übersprungen.
 */
const hasDb = Boolean(process.env.DB_HOST)

const LAGER = 'Lagerlogistik, Handel & Versand'
const GASTRO = 'Gastronomie & Hauswirtschaft'
const METALL = 'Metalltechnik & Montage'

const PROFIL = {
  kennung: 'IW3-9001',
  stufe: 'A',
  stationen: [
    { berufsfeld: GASTRO, stufe: 'T', format: 'piktogramm', status: 'abgeschlossen', fortschritt: 100, startDatum: '2026-06-01', endDatum: '2026-07-12', blaetterErledigt: 8 },
    { berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'aktiv', fortschritt: 68, startDatum: '2026-07-13' },
    { berufsfeld: METALL, stufe: 'A', format: 'mathefrei' },
  ],
}

describe.skipIf(!hasDb)('Teilnehmende (MySQL)', () => {
  const app = createApp()

  beforeAll(async () => {
    const [{ db }] = await query('SELECT DATABASE() AS db')
    if (!/_test$/i.test(db ?? '')) {
      throw new Error(`Testlauf abgebrochen: "${db}" ist keine Testdatenbank – DB_NAME=bildungspark_test setzen.`)
    }
    await runMigrations()
  })

  beforeEach(async () => {
    await query('DELETE FROM teilnehmende')
  })

  afterAll(async () => {
    await closePool()
  })

  it('Migration 002 ist angewendet', async () => {
    const rows = await query('SELECT name FROM schema_migrations ORDER BY name')
    expect(rows.map((r) => r.name)).toContain('002_teilnehmende.sql')
  })

  describe('POST /api/teilnehmende', () => {
    it('legt ein Profil mit Lernweg an', async () => {
      const response = await request(app).post('/api/teilnehmende').send(PROFIL)

      expect(response.status).toBe(201)
      expect(response.headers.location).toBe('/api/teilnehmende/IW3-9001')
      const { teilnehmer } = response.body
      expect(teilnehmer).toMatchObject({ kennung: 'IW3-9001', stufe: 'A', fortschritt: 68 })
      expect(teilnehmer.stationen).toEqual([
        { berufsfeld: GASTRO, stufe: 'T', format: 'piktogramm', status: 'abgeschlossen', fortschritt: 100, startDatum: '2026-06-01', endDatum: '2026-07-12', blaetterErledigt: 8 },
        { berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'aktiv', fortschritt: 68, startDatum: '2026-07-13', endDatum: null, blaetterErledigt: 0 },
        { berufsfeld: METALL, stufe: 'A', format: 'mathefrei', status: 'ausstehend', fortschritt: 0, startDatum: null, endDatum: null, blaetterErledigt: 0 },
      ])
      expect(teilnehmer.zuletztAktiv).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('wandelt die Kennung in Großbuchstaben um', async () => {
      const response = await request(app).post('/api/teilnehmende').send({ kennung: 'iw3-9002', stufe: 'T' })
      expect(response.status).toBe(201)
      expect(response.body.teilnehmer.kennung).toBe('IW3-9002')
    })

    it('lehnt eine vergebene Kennung mit 409 ab', async () => {
      await request(app).post('/api/teilnehmende').send(PROFIL)
      const response = await request(app).post('/api/teilnehmende').send({ ...PROFIL, kennung: 'iw3-9001' })
      expect(response.status).toBe(409)
      expect(response.body.error).toBe('conflict')
    })

    it('lehnt Namen ab und speichert nichts', async () => {
      const response = await request(app).post('/api/teilnehmende').send({ ...PROFIL, name: 'Max Mustermann' })
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('validation_error')
      expect((await request(app).get('/api/teilnehmende')).body.gesamt).toBe(0)
    })
  })

  describe('GET /api/teilnehmende', () => {
    it('liefert alle Profile mit Lernweg, sortiert nach Kennung', async () => {
      await request(app).post('/api/teilnehmende').send({ ...PROFIL, kennung: 'IW3-9005' })
      await request(app).post('/api/teilnehmende').send(PROFIL)

      const response = await request(app).get('/api/teilnehmende')
      expect(response.status).toBe(200)
      expect(response.body.gesamt).toBe(2)
      expect(response.body.eintraege.map((t) => t.kennung)).toEqual(['IW3-9001', 'IW3-9005'])
      expect(response.body.eintraege[0].stationen).toHaveLength(3)
    })

    it('findet ein Profil auch mit klein geschriebener Kennung', async () => {
      await request(app).post('/api/teilnehmende').send(PROFIL)
      const response = await request(app).get('/api/teilnehmende/iw3-9001')
      expect(response.status).toBe(200)
      expect(response.body.teilnehmer.kennung).toBe('IW3-9001')
    })

    it('antwortet mit 404 für unbekannte und ungültige Kennungen', async () => {
      expect((await request(app).get('/api/teilnehmende/IW3-0000')).status).toBe(404)
      expect((await request(app).get('/api/teilnehmende/Max%20Mustermann')).status).toBe(404)
    })
  })

  describe('PUT /api/teilnehmende/:kennung', () => {
    it('ersetzt Stufe und Lernweg', async () => {
      await request(app).post('/api/teilnehmende').send(PROFIL)
      const response = await request(app)
        .put('/api/teilnehmende/IW3-9001')
        .send({ stufe: 'F', stationen: [{ berufsfeld: LAGER, stufe: 'F', format: 'text', status: 'aktiv', fortschritt: 10 }] })

      expect(response.status).toBe(200)
      expect(response.body.teilnehmer).toMatchObject({ kennung: 'IW3-9001', stufe: 'F', fortschritt: 10 })
      expect(response.body.teilnehmer.stationen).toHaveLength(1)
      const stationen = await query('SELECT COUNT(*) AS n FROM teilnehmende_stationen WHERE kennung = ?', ['IW3-9001'])
      expect(Number(stationen[0].n)).toBe(1)
    })

    it('lässt die Kennung nicht ändern', async () => {
      await request(app).post('/api/teilnehmende').send(PROFIL)
      const response = await request(app).put('/api/teilnehmende/IW3-9001').send({ kennung: 'IW3-9999', stufe: 'F', stationen: [] })
      expect(response.status).toBe(400)
    })

    it('antwortet mit 404 für unbekannte Kennungen und 400 für ungültige Daten', async () => {
      expect((await request(app).put('/api/teilnehmende/IW3-0000').send({ stufe: 'T', stationen: [] })).status).toBe(404)
      await request(app).post('/api/teilnehmende').send(PROFIL)
      expect((await request(app).put('/api/teilnehmende/IW3-9001').send({ stufe: 'Z' })).status).toBe(400)
    })
  })

  describe('DELETE /api/teilnehmende/:kennung', () => {
    it('löscht das Profil samt Lernweg', async () => {
      await request(app).post('/api/teilnehmende').send(PROFIL)
      expect((await request(app).delete('/api/teilnehmende/IW3-9001')).status).toBe(204)
      expect((await request(app).get('/api/teilnehmende/IW3-9001')).status).toBe(404)
      const stationen = await query('SELECT COUNT(*) AS n FROM teilnehmende_stationen WHERE kennung = ?', ['IW3-9001'])
      expect(Number(stationen[0].n)).toBe(0)
    })

    it('antwortet mit 404, wenn es das Profil nicht gibt', async () => {
      expect((await request(app).delete('/api/teilnehmende/IW3-0000')).status).toBe(404)
    })
  })

  describe('Seed', () => {
    it('legt die Beispiel-Teilnehmenden einmal an', async () => {
      expect(await seedTeilnehmende()).toEqual({ angelegt: BEISPIEL_TEILNEHMENDE.length, uebersprungen: false })
      expect(await seedTeilnehmende()).toEqual({ angelegt: 0, uebersprungen: true })
      const response = await request(app).get('/api/teilnehmende/IW3-4388')
      expect(response.body.teilnehmer).toMatchObject({ stufe: 'F', fortschritt: 82 })
    })
  })
})

describe.skipIf(hasDb)('Teilnehmende ohne Datenbank', () => {
  const app = createApp()

  it('antwortet mit 503 db_unavailable', async () => {
    const response = await request(app).get('/api/teilnehmende')
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
  })

  it('prüft Eingaben auch ohne Datenbank (400 vor 503)', async () => {
    const response = await request(app).post('/api/teilnehmende').send({ kennung: 'Max Mustermann', stufe: 'T' })
    expect(response.status).toBe(400)
    expect(response.body.message).toContain('pseudonyme Kennung')
  })
})
