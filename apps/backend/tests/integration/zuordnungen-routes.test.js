import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { erstelleToken } from '../../src/auth/token.js'
import { seedTeilnehmende } from '../../src/teilnehmende/seed.js'
import { seedZuordnungen } from '../../src/zuordnungen/seed.js'
import { WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

/**
 * Assignments worksheet ↔ participant and learning status (BE-04) against a real
 * MySQL – only with DB_HOST set and only against a *_test database; skipped otherwise.
 */
const hasDb = Boolean(process.env.DB_HOST)
const UNBEKANNT = '00000000-0000-4000-8000-000000000000'
const LAGER = 'Lagerlogistik, Handel & Versand'
const METALL = 'Metalltechnik & Montage'
const KENNUNG = 'IW3-9101'

const PROFIL = {
  kennung: KENNUNG,
  stufe: 'A',
  stationen: [
    { berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'aktiv', fortschritt: 10, startDatum: '2026-10-01' },
    { berufsfeld: METALL, stufe: 'A', format: 'mathefrei' },
  ],
}

describe.skipIf(!hasDb)('Zuordnungen und Lernstand (MySQL)', () => {
  const app = createApp()
  const basis = `/api/teilnehmende/${KENNUNG}`

  /** Saves a worksheet and returns its id */
  async function blatt(overrides = {}) {
    const response = await request(app).post('/api/arbeitsblaetter').send({ worksheet: { ...WORKSHEET_T_TEXT, baustein: 1, ausbildungsbaustein: 'Wareneingang', ...overrides } })
    expect(response.status).toBe(201)
    return response.body.arbeitsblatt.id
  }

  async function zuordnen(arbeitsblattId, kennung = KENNUNG) {
    const response = await request(app).post(`/api/teilnehmende/${kennung}/zuordnungen`).send({ arbeitsblattId })
    expect(response.status).toBe(201)
    return response.body.zuordnung
  }

  beforeAll(async () => {
    const [{ db }] = await query('SELECT DATABASE() AS db')
    if (!/_test$/i.test(db ?? '')) {
      throw new Error(`Testlauf abgebrochen: "${db}" ist keine Testdatenbank – DB_NAME=bildungspark_test setzen.`)
    }
    await runMigrations()
  })

  beforeEach(async () => {
    await query('DELETE FROM zuordnungen')
    await query('DELETE FROM teilnehmende')
    await query('DELETE FROM arbeitsblaetter')
    expect((await request(app).post('/api/teilnehmende').send(PROFIL)).status).toBe(201)
  })

  afterAll(async () => {
    await closePool()
  })

  it('Migration 003 ist angewendet', async () => {
    const rows = await query('SELECT name FROM schema_migrations ORDER BY name')
    expect(rows.map((r) => r.name)).toContain('004_zuordnungen.sql')
  })

  describe('POST /:kennung/zuordnungen', () => {
    it('ordnet ein Arbeitsblatt zu und liefert die Eckdaten des Blatts mit', async () => {
      const id = await blatt({ titel: 'Lieferschein prüfen' })
      const response = await request(app).post(`/api/teilnehmende/${KENNUNG.toLowerCase()}/zuordnungen`).send({ arbeitsblattId: id })
      expect(response.status).toBe(201)
      expect(response.headers.location).toBe(`${basis}/zuordnungen/${response.body.zuordnung.id}`)
      const abgerufen = await request(app).get(response.headers.location)
      expect(abgerufen.status).toBe(200)
      expect(abgerufen.body.zuordnung).toEqual(response.body.zuordnung)
      expect(response.body.zuordnung).toMatchObject({
        kennung: KENNUNG,
        status: 'offen',
        erledigtAm: null,
        zugeordnetVon: null,
        arbeitsblatt: { id, titel: 'Lieferschein prüfen', berufsfeld: LAGER, stufe: 'T', status: 'entwurf' },
      })
    })

    it('übernimmt den Namen aus der Anmeldung (BE-01)', async () => {
      const id = await blatt()
      const { token } = erstelleToken({ id: UNBEKANNT, rolle: 'dozent', name: 'T. Neumann' })
      const response = await request(app).post(`${basis}/zuordnungen`).set('Authorization', `Bearer ${token}`).send({ arbeitsblattId: id })
      expect(response.body.zuordnung.zugeordnetVon).toBe('T. Neumann')
    })

    it('lehnt doppelte Zuordnung mit 409 ab', async () => {
      const id = await blatt()
      await zuordnen(id)
      const response = await request(app).post(`${basis}/zuordnungen`).send({ arbeitsblattId: id })
      expect(response.status).toBe(409)
      expect(response.body.code).toBe('bereits_zugeordnet')
    })

    it('meldet unbekannte Teilnehmende und Blätter mit 404', async () => {
      const id = await blatt()
      const ohneProfil = await request(app).post('/api/teilnehmende/IW3-1/zuordnungen').send({ arbeitsblattId: id })
      expect(ohneProfil.status).toBe(404)
      expect(ohneProfil.body.code).toBe('teilnehmer_unbekannt')
      const ohneBlatt = await request(app).post(`${basis}/zuordnungen`).send({ arbeitsblattId: UNBEKANNT })
      expect(ohneBlatt.status).toBe(404)
      expect(ohneBlatt.body.code).toBe('arbeitsblatt_unbekannt')
    })

    it('ordnet archivierte Blätter nicht zu', async () => {
      const id = await blatt()
      expect((await request(app).delete(`/api/arbeitsblaetter/${id}`)).status).toBe(200)
      const response = await request(app).post(`${basis}/zuordnungen`).send({ arbeitsblattId: id })
      expect(response.status).toBe(409)
      expect(response.body.code).toBe('blatt_archiviert')
    })
  })

  describe('GET, PATCH, DELETE', () => {
    it('listet die Zuordnungen, auf Wunsch nach Status gefiltert', async () => {
      const erste = await zuordnen(await blatt({ titel: 'Erstes' }))
      await zuordnen(await blatt({ titel: 'Zweites' }))
      await request(app).patch(`${basis}/zuordnungen/${erste.id}`).send({ status: 'erledigt' })

      const alle = await request(app).get(`${basis}/zuordnungen`)
      expect(alle.body.gesamt).toBe(2)
      expect(alle.body.eintraege.map((z) => z.arbeitsblatt.titel)).toEqual(['Erstes', 'Zweites'])
      const offen = await request(app).get(`${basis}/zuordnungen?status=offen`)
      expect(offen.body.eintraege.map((z) => z.arbeitsblatt.titel)).toEqual(['Zweites'])
      expect((await request(app).get('/api/teilnehmende/IW3-1/zuordnungen')).status).toBe(404)
    })

    it('hakt ab (mit Zeitpunkt), behält den ersten Zeitpunkt und öffnet wieder', async () => {
      const { id } = await zuordnen(await blatt())
      const erledigt = await request(app).patch(`${basis}/zuordnungen/${id}`).send({ status: 'erledigt' })
      expect(erledigt.status).toBe(200)
      expect(erledigt.body.zuordnung.status).toBe('erledigt')
      expect(Date.parse(erledigt.body.zuordnung.erledigtAm)).not.toBeNaN()

      const nochmal = await request(app).patch(`${basis}/zuordnungen/${id}`).send({ status: 'erledigt' })
      expect(nochmal.body.zuordnung.erledigtAm).toBe(erledigt.body.zuordnung.erledigtAm)

      const offen = await request(app).patch(`${basis}/zuordnungen/${id}`).send({ status: 'offen' })
      expect(offen.body.zuordnung).toMatchObject({ status: 'offen', erledigtAm: null })
    })

    it('ändert und löscht nur Zuordnungen der genannten Person', async () => {
      await request(app).post('/api/teilnehmende').send({ ...PROFIL, kennung: 'IW3-9102' })
      const fremd = await zuordnen(await blatt(), 'IW3-9102')
      expect((await request(app).get(`${basis}/zuordnungen/${fremd.id}`)).body.code).toBe('zuordnung_unbekannt')
      expect((await request(app).patch(`${basis}/zuordnungen/${fremd.id}`).send({ status: 'erledigt' })).status).toBe(404)
      expect((await request(app).delete(`${basis}/zuordnungen/${fremd.id}`)).status).toBe(404)
      expect((await request(app).delete(`/api/teilnehmende/IW3-9102/zuordnungen/${fremd.id}`)).status).toBe(204)
      expect((await request(app).delete(`/api/teilnehmende/IW3-9102/zuordnungen/${fremd.id}`)).status).toBe(404)
    })
  })

  describe('Lernstand', () => {
    it('zählt je Berufsfeld und nennt das nächste Blatt der aktiven Station', async () => {
      const a = await zuordnen(await blatt({ titel: 'Lager 1' }))
      await zuordnen(await blatt({ titel: 'Lager 2' }))
      await zuordnen(await blatt({ titel: 'Metall 1', berufsfeld: METALL }))
      await request(app).patch(`${basis}/zuordnungen/${a.id}`).send({ status: 'erledigt' })

      const response = await request(app).get(`${basis}/lernstand`)
      expect(response.status).toBe(200)
      const { lernstand } = response.body
      expect(lernstand.anzahl).toEqual({ erledigt: 1, offen: 2, gesamt: 3 })
      expect(lernstand.alsNaechstes.arbeitsblatt.titel).toBe('Lager 2')
      expect(lernstand.berufsfelder.map((feld) => [feld.berufsfeld, feld.fortschritt, feld.anzahl.gesamt])).toEqual([
        [LAGER, 50, 2],
        [METALL, 0, 1],
      ])
      expect(lernstand.berufsfelder[0].erledigt.map((z) => z.arbeitsblatt.titel)).toEqual(['Lager 1'])
    })

    it('liefert den Lernstand aller Teilnehmenden', async () => {
      await request(app).post('/api/teilnehmende').send({ ...PROFIL, kennung: 'IW3-9102' })
      await zuordnen(await blatt())
      const response = await request(app).get('/api/teilnehmende/lernstand')
      expect(response.status).toBe(200)
      expect(response.body.gesamt).toBe(2)
      expect(response.body.eintraege.map((l) => [l.kennung, l.anzahl.gesamt])).toEqual([
        [KENNUNG, 1],
        ['IW3-9102', 0],
      ])
    })

    it('404 für unbekannte Teilnehmende', async () => {
      expect((await request(app).get('/api/teilnehmende/IW3-1/lernstand')).status).toBe(404)
    })
  })

  describe('Löschen (BE-08: keine verwaisten Zuordnungen)', () => {
    it('Profil löschen entfernt Lernweg und eigene Zuordnungen, aber nicht die anderer Profile', async () => {
      const andereKennung = 'IW3-9102'
      expect((await request(app).post('/api/teilnehmende').send({ ...PROFIL, kennung: andereKennung })).status).toBe(201)
      await zuordnen(await blatt({ titel: 'Nur für das zu löschende Profil' }), KENNUNG)
      await zuordnen(await blatt({ titel: 'Bleibt beim anderen Profil' }), andereKennung)

      expect((await request(app).delete(basis)).status).toBe(204)
      expect(await query('SELECT position FROM teilnehmende_stationen WHERE kennung = ?', [KENNUNG])).toHaveLength(0)
      expect(await query('SELECT id FROM zuordnungen WHERE kennung = ?', [KENNUNG])).toHaveLength(0)
      expect(await query('SELECT id FROM zuordnungen WHERE kennung = ?', [andereKennung])).toHaveLength(1)
    })

    it('endgültiges Löschen eines Blatts entfernt die Zuordnung, Archivieren nicht', async () => {
      const archiv = await blatt({ titel: 'archiviert' })
      const weg = await blatt({ titel: 'weg' })
      await zuordnen(archiv)
      await zuordnen(weg)
      await request(app).delete(`/api/arbeitsblaetter/${archiv}`)
      await request(app).delete(`/api/arbeitsblaetter/${weg}?endgueltig=true`)
      const { body } = await request(app).get(`${basis}/zuordnungen`)
      expect(body.eintraege.map((z) => [z.arbeitsblatt.titel, z.arbeitsblatt.status])).toEqual([['archiviert', 'archiviert']])
    })

    it('die übrigen Teilnehmenden-Routen laufen weiter über den Profil-Router', async () => {
      expect((await request(app).get(basis)).body.teilnehmer.kennung).toBe(KENNUNG)
    })
  })

  describe('Seed', () => {
    it('ordnet jedem aktiven Berufsfeld Blätter zu, das erste erledigt – nur einmal', async () => {
      await query('DELETE FROM teilnehmende')
      await seedTeilnehmende()
      await blatt({ titel: 'Lager A', stufe: 'A' })
      await blatt({ titel: 'Lager T', stufe: 'T' })

      const ergebnis = await seedZuordnungen()
      expect(ergebnis.uebersprungen).toBe(false)
      expect(ergebnis.angelegt).toBeGreaterThan(0)
      expect(await seedZuordnungen()).toEqual({ angelegt: 0, uebersprungen: true })

      // IW3-4421 ist im Lager aktiv (Stufe A): passende Stufe zuerst, die ist erledigt
      const { body } = await request(app).get('/api/teilnehmende/IW3-4421/lernstand')
      const lager = body.lernstand.berufsfelder.find((feld) => feld.berufsfeld === LAGER)
      expect(lager.erledigt.map((z) => z.arbeitsblatt.titel)).toEqual(['Lager A'])
      expect(lager.alsNaechstes.arbeitsblatt.titel).toBe('Lager T')
    })
  })
})

describe.skipIf(hasDb)('Zuordnungen ohne Datenbank', () => {
  const app = createApp()

  it('antwortet mit 503 db_unavailable', async () => {
    const response = await request(app).get('/api/teilnehmende/IW3-4421/lernstand')
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
  })
})
