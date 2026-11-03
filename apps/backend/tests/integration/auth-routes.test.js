import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { seedBenutzer } from '../../src/benutzer/seed.js'
import { pruefeToken } from '../../src/auth/token.js'

/**
 * Login (BE-01) against a real MySQL – only with DB_HOST set and only against a
 * *_test database; skipped otherwise.
 */
const hasDb = Boolean(process.env.DB_HOST)

const ADMIN = { name: 'Test Admin', email: 'admin@test.example', rolle: 'admin', passwort: 'sicheres-passwort' }
const DOZENT = { name: 'Test Dozent', email: 'dozent@test.example', rolle: 'dozent', passwort: 'anderes-passwort' }

describe.skipIf(!hasDb)('Anmeldung (MySQL)', () => {
  const app = createApp()

  async function anlegen(konto) {
    const response = await request(app).post('/api/benutzer').send(konto)
    expect(response.status).toBe(201)
    return response.body.benutzer
  }

  async function anmelden({ email, passwort }) {
    const response = await request(app).post('/api/auth/login').send({ email, passwort })
    expect(response.status).toBe(200)
    return response.body
  }

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

  describe('POST /api/auth/login', () => {
    it('liefert Token, Ablaufzeit und Konto – ohne Passwort-Hash', async () => {
      const admin = await anlegen(ADMIN)
      const response = await request(app).post('/api/auth/login').send({ email: ' Admin@Test.Example ', passwort: ADMIN.passwort })
      expect(response.status).toBe(200)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.body.benutzer).toEqual(admin)
      expect(Date.parse(response.body.ablaufAm)).toBeGreaterThan(Date.now())
      expect(pruefeToken(response.body.token)).toEqual({ id: admin.id, rolle: 'admin', name: 'Test Admin' })
      expect(JSON.stringify(response.body)).not.toMatch(/scrypt|passwort/i)
    })

    it('antwortet bei falschem Passwort und unbekannter E-Mail gleich', async () => {
      await anlegen(ADMIN)
      const falschesPasswort = await request(app).post('/api/auth/login').send({ email: ADMIN.email, passwort: 'falsch-falsch' })
      const unbekannt = await request(app).post('/api/auth/login').send({ email: 'niemand@test.example', passwort: 'falsch-falsch' })
      for (const response of [falschesPasswort, unbekannt]) {
        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: 'unauthorized', code: 'anmeldung_fehlgeschlagen', message: 'E-Mail-Adresse oder Passwort ist falsch' })
      }
    })

    it('klappt auch, wenn der Browser noch ein abgelaufenes Token mitschickt', async () => {
      await anlegen(ADMIN)
      const response = await request(app).post('/api/auth/login').set('Authorization', 'Bearer abgelaufen').send({ email: ADMIN.email, passwort: ADMIN.passwort })
      expect(response.status).toBe(200)
    })

    it('meldet die Beispielkonten aus dem Seed mit dem Startpasswort an', async () => {
      await seedBenutzer({ passwort: 'start-passwort' })
      const { benutzer } = await anmelden({ email: 'c.hager@bildungspark.example', passwort: 'start-passwort' })
      expect(benutzer.rolle).toBe('admin')
    })
  })

  describe('GET /api/auth/me', () => {
    it('liefert das eigene Konto aus der Datenbank', async () => {
      const dozent = await anlegen(DOZENT)
      const { token } = await anmelden(DOZENT)
      const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(200)
      expect(response.body.benutzer).toEqual(dozent)
    })

    it('meldet 401 konto_unbekannt, wenn das Konto inzwischen gelöscht ist', async () => {
      await anlegen(ADMIN)
      const dozent = await anlegen(DOZENT)
      const { token } = await anmelden(DOZENT)
      await query('DELETE FROM users WHERE id = ?', [dozent.id])
      const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(401)
      expect(response.body.code).toBe('konto_unbekannt')
    })
  })

  describe('Rollen in der Benutzerverwaltung (BE-03)', () => {
    it('Admin darf die Konten sehen, Dozent bekommt 403', async () => {
      await anlegen(ADMIN)
      await anlegen(DOZENT)
      const admin = await anmelden(ADMIN)
      const dozent = await anmelden(DOZENT)
      expect((await request(app).get('/api/benutzer').set('Authorization', `Bearer ${admin.token}`)).status).toBe(200)
      expect((await request(app).get('/api/benutzer').set('Authorization', `Bearer ${dozent.token}`)).status).toBe(403)
    })

    it('das eigene Konto lässt sich nicht löschen', async () => {
      await anlegen({ ...ADMIN, email: 'zweiter-admin@test.example' })
      const admin = await anlegen(ADMIN)
      const { token } = await anmelden(ADMIN)
      const response = await request(app).delete(`/api/benutzer/${admin.id}`).set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(409)
      expect(response.body.code).toBe('eigenes_konto')
    })
  })
})

describe.skipIf(hasDb)('Anmeldung ohne Datenbank', () => {
  const app = createApp()

  it('antwortet mit 503 db_unavailable', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'a@test.example', passwort: 'irgendwas' })
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
  })
})
