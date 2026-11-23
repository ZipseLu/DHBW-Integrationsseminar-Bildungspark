import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { closePool, query, queryOne } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { erstelleToken } from '../../src/auth/token.js'

/**
 * Per-account settings (FE-20) against a real MySQL – only with DB_HOST set and
 * only against a *_test database; skipped otherwise.
 */
const hasDb = Boolean(process.env.DB_HOST)

const KONTO_A = { id: '11111111-1111-4111-8111-111111111111', email: 'a@test.example', name: 'A' }
const KONTO_B = { id: '22222222-2222-4222-8222-222222222222', email: 'b@test.example', name: 'B' }
const WERTE_A = {
  darkMode: true,
  accentColor: '#2A6B4B',
  primaryColor: '#00487A',
  sidebarCompact: true,
  defaultBerufsbild: 'Lagerlogistik, Handel & Versand',
  aiAutoExpand: true,
  showPersonaBadges: true,
  language: 'de',
  dateFormat: 'DD.MM.YYYY',
  exportFormat: 'docx',
  emailNotifications: false,
  worksheetReminders: true,
  autoSave: true,
}

describe.skipIf(!hasDb)('Einstellungen pro Konto (MySQL)', () => {
  const app = createApp()
  const pfad = (konto) => `/api/einstellungen?konto=${encodeURIComponent(konto.email)}`

  beforeAll(async () => {
    const [{ db }] = await query('SELECT DATABASE() AS db')
    if (!/_test$/i.test(db ?? '')) {
      throw new Error(`Testlauf abgebrochen: "${db}" ist keine Testdatenbank – DB_NAME=bildungspark_test setzen.`)
    }
    await runMigrations()
  })

  beforeEach(async () => {
    await query('DELETE FROM einstellungen')
    await query('DELETE FROM users')
    for (const konto of [KONTO_A, KONTO_B]) {
      await query('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)', [konto.id, konto.email, konto.name, 'hash', 'dozent'])
    }
  })

  afterAll(async () => {
    await closePool()
  })

  it('liefert null, solange nichts gespeichert ist', async () => {
    const response = await request(app).get(pfad(KONTO_A))
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ einstellungen: null })
  })

  it('speichert und lädt Einstellungen getrennt pro Konto', async () => {
    const gespeichert = await request(app).put(pfad(KONTO_A)).send({ einstellungen: WERTE_A })
    expect(gespeichert.status).toBe(200)
    expect(gespeichert.body.einstellungen).toMatchObject(WERTE_A)

    expect((await request(app).get(pfad(KONTO_A))).body.einstellungen).toMatchObject(WERTE_A)
    expect((await request(app).get(pfad(KONTO_B))).body.einstellungen).toBeNull()
  })

  it('behält vorhandene Werte bei einem teilweisen PUT', async () => {
    await request(app).put(pfad(KONTO_A)).send({ einstellungen: WERTE_A })
    await request(app).put(pfad(KONTO_A)).send({ einstellungen: { darkMode: false } })

    const geladen = (await request(app).get(pfad(KONTO_A))).body.einstellungen
    expect(geladen.darkMode).toBe(false)
    expect(geladen.accentColor).toBe(WERTE_A.accentColor)
  })

  it('verlangt ein bekanntes Konto', async () => {
    expect((await request(app).get('/api/einstellungen')).status).toBe(400)
    expect((await request(app).get('/api/einstellungen?konto=kein-mensch')).status).toBe(400)
    expect((await request(app).get('/api/einstellungen?konto=unbekannt@test.example')).status).toBe(404)
  })

  it('prüft die Werte', async () => {
    const antwort = await request(app).put(pfad(KONTO_A)).send({ einstellungen: { accentColor: 'rot' } })
    expect(antwort.status).toBe(400)
    expect(antwort.body.error).toBe('validation_error')
    expect((await request(app).put(pfad(KONTO_A)).send({ einstellungen: { unsinn: 1 } })).status).toBe(400)
  })

  it('nutzt die Konto-ID aus dem Token vor ?konto', async () => {
    const { token } = erstelleToken({ id: KONTO_A.id, rolle: 'admin', name: 'A' })
    const antwort = await request(app)
      .put(pfad(KONTO_B))
      .set('Authorization', `Bearer ${token}`)
      .send({ einstellungen: { darkMode: true } })

    expect(antwort.status).toBe(200)
    expect((await request(app).get(pfad(KONTO_A))).body.einstellungen.darkMode).toBe(true)
    expect((await request(app).get(pfad(KONTO_B))).body.einstellungen).toBeNull()
  })

  it('entfernt Einstellungen beim Löschen des Kontos', async () => {
    await request(app).put(pfad(KONTO_A)).send({ einstellungen: WERTE_A })
    await query('DELETE FROM users WHERE id = ?', [KONTO_A.id])

    const row = await queryOne('SELECT COUNT(*) AS anzahl FROM einstellungen')
    expect(Number(row.anzahl)).toBe(0)
  })
})
