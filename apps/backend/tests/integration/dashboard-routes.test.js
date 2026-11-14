import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

/** Gegen echte MySQL; ohne DB_HOST werden nur die Fehlerverhalten-Tests ausgeführt. */
const hasDb = Boolean(process.env.DB_HOST)
const app = createApp()

describe.skipIf(!hasDb)('GET /api/dashboard (MySQL)', () => {
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
  })

  afterAll(async () => {
    await closePool()
  })

  async function arbeitsblatt(overrides = {}, options = {}) {
    const response = await request(app).post('/api/arbeitsblaetter').send({
      worksheet: { ...WORKSHEET_T_TEXT, ...overrides },
      ...options,
    })
    expect(response.status).toBe(201)
    return response.body.arbeitsblatt
  }

  it('liefert Statuszahlen, aktive Teilnehmende und die fünf neuesten Arbeitsblatt-Aktivitäten', async () => {
    const entwurf = await arbeitsblatt({ titel: 'Entwurf', stufe: 'T', berufsfeld: 'Gastronomie' })
    const freigegeben = await arbeitsblatt(
      { titel: 'Freigegeben', stufe: 'A', berufsfeld: 'Lager' },
      { meta: { provider: 'gemini', mocked: true } },
    )
    expect((await request(app).patch(`/api/arbeitsblaetter/${freigegeben.id}`).send({ status: 'freigegeben', autor: 'Test' })).status).toBe(200)
    const archiviert = await arbeitsblatt({ titel: 'Archiviert', stufe: 'B', berufsfeld: 'Metall' })
    expect((await request(app).delete(`/api/arbeitsblaetter/${archiviert.id}`).send({ autor: 'Test' })).status).toBe(200)

    await query('UPDATE arbeitsblaetter SET geaendert_am = ? WHERE id = ?', ['2026-11-14 10:00:00.000', entwurf.id])
    await query('UPDATE arbeitsblaetter SET geaendert_am = ? WHERE id = ?', ['2026-11-14 12:00:00.000', freigegeben.id])
    await query('UPDATE arbeitsblaetter SET geaendert_am = ? WHERE id = ?', ['2026-11-14 11:00:00.000', archiviert.id])

    const aktiverProfil = await request(app).post('/api/teilnehmende').send({
      kennung: 'IW3-9701',
      stufe: 'A',
      stationen: [
        { berufsfeld: 'Lager', stufe: 'A', format: 'text', status: 'aktiv', fortschritt: 15 },
        { berufsfeld: 'Gastronomie', stufe: 'T', format: 'piktogramm', status: 'ausstehend', fortschritt: 0 },
      ],
    })
    expect(aktiverProfil.status).toBe(201)
    const zweiterAktiverProfil = await request(app).post('/api/teilnehmende').send({
      kennung: 'IW3-9703',
      stufe: 'T',
      stationen: [{ berufsfeld: 'Gastronomie', stufe: 'T', format: 'piktogramm', status: 'aktiv', fortschritt: 25 }],
    })
    expect(zweiterAktiverProfil.status).toBe(201)
    const abgeschlossen = await request(app).post('/api/teilnehmende').send({
      kennung: 'IW3-9702',
      stufe: 'T',
      stationen: [{ berufsfeld: 'Metall', stufe: 'T', format: 'text', status: 'abgeschlossen', fortschritt: 100 }],
    })
    expect(abgeschlossen.status).toBe(201)

    const gestartet = performance.now()
    const response = await request(app).get('/api/dashboard')
    const antwortzeitMs = performance.now() - gestartet

    expect(response.status).toBe(200)
    expect(antwortzeitMs).toBeLessThan(1000)
    expect(response.body).toMatchObject({
      arbeitsblaetter: {
        gesamt: 2,
        gesamtInklusiveArchiviert: 3,
        proStatus: { entwurf: 1, freigegeben: 1, archiviert: 1 },
        kiGeneriert: 1,
        berufsfelder: 2,
        proStufe: { T: 1, A: 1, F: 0, B: 0 },
      },
      aktiveTeilnehmende: 2,
    })
    expect(response.body.letzteAktivitaeten).toHaveLength(3)
    expect(response.body.letzteAktivitaeten.map((eintrag) => eintrag.id)).toEqual([freigegeben.id, archiviert.id, entwurf.id])
    expect(response.body.letzteAktivitaeten[0]).toMatchObject({
      titel: 'Freigegeben',
      status: 'freigegeben',
      aktion: 'freigegeben',
      autor: 'Test',
      kiGeneriert: true,
      geaendertAm: '2026-11-14T12:00:00.000Z',
    })
  })
})

describe.skipIf(hasDb)('GET /api/dashboard ohne Datenbank', () => {
  it('antwortet mit 503 db_unavailable', async () => {
    const response = await request(app).get('/api/dashboard')
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
  })
})
