import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { closePool, query, queryOne } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { pruefePasswort } from '../../src/benutzer/passwort.js'
import { BEISPIEL_KONTEN, seedBenutzer } from '../../src/benutzer/seed.js'
import { findForLogin } from '../../src/benutzer/repository.js'
import { createBenutzerRouter } from '../../src/routes/benutzer.js'

/**
 * User administration (BE-03) against a real MySQL – only with DB_HOST set and only
 * against a *_test database; skipped otherwise.
 */
const hasDb = Boolean(process.env.DB_HOST)
const UNBEKANNT = '00000000-0000-4000-8000-000000000000'

const KONTO = { name: 'Test Admin', email: 'admin@test.example', rolle: 'admin', passwort: 'sicheres-passwort' }

async function anlegen(app, teil = {}) {
  const response = await request(app).post('/api/benutzer').send({ ...KONTO, ...teil })
  expect(response.status).toBe(201)
  return response.body.benutzer
}

describe.skipIf(!hasDb)('Benutzerverwaltung (MySQL)', () => {
  const app = createApp()

  beforeAll(async () => {
    const [{ db }] = await query('SELECT DATABASE() AS db')
    if (!/_test$/i.test(db ?? '')) {
      throw new Error(`Testlauf abgebrochen: "${db}" ist keine Testdatenbank – DB_NAME=bildungspark_test setzen.`)
    }
    await runMigrations()
  })

  beforeEach(async () => {
    await query('DELETE FROM users')
  })

  afterAll(async () => {
    await closePool()
  })

  describe('POST /api/benutzer', () => {
    it('legt ein Konto an und gibt keinen Passwort-Hash zurück', async () => {
      const response = await request(app).post('/api/benutzer').send({ ...KONTO, email: 'Admin@Test.Example' })
      expect(response.status).toBe(201)
      expect(response.headers.location).toMatch(/^\/api\/benutzer\/[0-9a-f-]{36}$/)
      expect(response.body.benutzer).toMatchObject({ name: 'Test Admin', email: 'admin@test.example', rolle: 'admin' })
      expect(JSON.stringify(response.body)).not.toMatch(/passwort|password|scrypt/i)
    })

    it('speichert das Passwort nur als Hash', async () => {
      const { id } = await anlegen(app)
      const row = await queryOne('SELECT password_hash FROM users WHERE id = ?', [id])
      expect(row.password_hash).not.toContain(KONTO.passwort)
      expect(await pruefePasswort(KONTO.passwort, row.password_hash)).toBe(true)
      expect((await findForLogin('ADMIN@test.example')).passwortHash).toBe(row.password_hash)
    })

    it('lehnt eine vergebene E-Mail mit 409 ab', async () => {
      await anlegen(app)
      const response = await request(app).post('/api/benutzer').send({ ...KONTO, email: 'ADMIN@test.example' })
      expect(response.status).toBe(409)
      expect(response.body.code).toBe('email_vergeben')
    })

    it('prüft Eingaben', async () => {
      expect((await request(app).post('/api/benutzer').send({ ...KONTO, passwort: 'kurz' })).status).toBe(400)
    })
  })

  describe('GET /api/benutzer', () => {
    it('listet alle Konten nach Name', async () => {
      await anlegen(app, { name: 'Zora Z', email: 'z@test.example' })
      await anlegen(app, { name: 'Anna A', email: 'a@test.example', rolle: 'dozent' })
      const response = await request(app).get('/api/benutzer')
      expect(response.status).toBe(200)
      expect(response.body.gesamt).toBe(2)
      expect(response.body.eintraege.map((b) => b.name)).toEqual(['Anna A', 'Zora Z'])
    })

    it('liefert ein Konto oder 404', async () => {
      const { id } = await anlegen(app)
      expect((await request(app).get(`/api/benutzer/${id}`)).body.benutzer.id).toBe(id)
      expect((await request(app).get(`/api/benutzer/${UNBEKANNT}`)).status).toBe(404)
      expect((await request(app).get('/api/benutzer/keine-uuid')).status).toBe(404)
    })
  })

  describe('PATCH /api/benutzer/:id', () => {
    it('ändert Rolle und Passwort', async () => {
      await anlegen(app)
      const { id } = await anlegen(app, { name: 'Doz', email: 'doz@test.example', rolle: 'dozent' })
      const response = await request(app).patch(`/api/benutzer/${id}`).send({ rolle: 'assistent', passwort: 'neues-passwort' })
      expect(response.status).toBe(200)
      expect(response.body.benutzer.rolle).toBe('assistent')
      expect(await pruefePasswort('neues-passwort', (await findForLogin('doz@test.example')).passwortHash)).toBe(true)
    })

    it('stuft das letzte Admin-Konto nicht herab', async () => {
      const { id } = await anlegen(app)
      const response = await request(app).patch(`/api/benutzer/${id}`).send({ rolle: 'dozent' })
      expect(response.status).toBe(409)
      expect(response.body.code).toBe('letzter_admin')
    })

    it('lehnt eine vergebene E-Mail ab', async () => {
      await anlegen(app)
      const { id } = await anlegen(app, { email: 'zwei@test.example' })
      expect((await request(app).patch(`/api/benutzer/${id}`).send({ email: 'admin@test.example' })).status).toBe(409)
    })
  })

  describe('DELETE /api/benutzer/:id', () => {
    it('löscht ein Konto', async () => {
      await anlegen(app)
      const { id } = await anlegen(app, { email: 'weg@test.example', rolle: 'dozent' })
      expect((await request(app).delete(`/api/benutzer/${id}`)).status).toBe(204)
      expect((await request(app).get(`/api/benutzer/${id}`)).status).toBe(404)
    })

    it('behält das letzte Admin-Konto', async () => {
      const { id } = await anlegen(app)
      const response = await request(app).delete(`/api/benutzer/${id}`)
      expect(response.status).toBe(409)
      expect(response.body.code).toBe('letzter_admin')
    })

    it('lässt das eigene Konto nicht löschen (sobald BE-01 req.benutzer setzt)', async () => {
      await anlegen(app, { email: 'zweiter-admin@test.example' })
      const { id } = await anlegen(app)
      const mitAnmeldung = express()
      mitAnmeldung.use((req, _res, next) => {
        req.benutzer = { id, rolle: 'admin' }
        next()
      })
      mitAnmeldung.use('/api/benutzer', createBenutzerRouter())
      const response = await request(mitAnmeldung).delete(`/api/benutzer/${id}`)
      expect(response.status).toBe(409)
      expect(response.body.code).toBe('eigenes_konto')
    })
  })

  describe('Seed', () => {
    it('legt die Beispielkonten einmal an', async () => {
      expect(await seedBenutzer({ passwort: 'test-passwort' })).toEqual({ angelegt: BEISPIEL_KONTEN.length, uebersprungen: false })
      expect(await seedBenutzer({ passwort: 'test-passwort' })).toEqual({ angelegt: 0, uebersprungen: true })
      const admin = await findForLogin('c.hager@bildungspark.example')
      expect(admin.rolle).toBe('admin')
      expect(await pruefePasswort('test-passwort', admin.passwortHash)).toBe(true)
    })
  })
})

describe.skipIf(hasDb)('Benutzerverwaltung ohne Datenbank', () => {
  const app = createApp()

  it('antwortet mit 503 db_unavailable', async () => {
    const response = await request(app).get('/api/benutzer')
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
  })

  it('prüft Eingaben auch ohne Datenbank (400 vor 503)', async () => {
    expect((await request(app).post('/api/benutzer').send({ name: 'X', email: 'kaputt', passwort: '1' })).status).toBe(400)
  })
})
