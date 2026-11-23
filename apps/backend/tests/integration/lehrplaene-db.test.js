import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { count, deleteAll, ersetzeAlle, fuegeLehrplanHinzu, LehrplanDatenError, listLernziele, quelleVorhanden, stand } from '../../src/lehrplan/repository.js'
import { leseLehrplanDatei } from '../../src/lehrplan/hochladen.js'
import { lehrplanDocx } from '../helpers/lehrplanDocx.js'
import { seedLehrplaene } from '../../src/lehrplan/seed.js'

/**
 * Lehrpläne in der Datenbank (Migration 005) gegen eine echte MySQL – nur mit gesetztem
 * DB_HOST und nur gegen eine *_test-Datenbank; sonst übersprungen.
 */
const hasDb = Boolean(process.env.DB_HOST)

const niveaus = (wort) => ({
  T: { kompetenz: `${wort} T`, beispiel: `Beispiel ${wort} T` },
  A: { kompetenz: `${wort} A`, beispiel: '' },
  F: { kompetenz: `${wort} F`, beispiel: `Beispiel ${wort} F` },
  B: { kompetenz: `${wort} B`, beispiel: `Beispiel ${wort} B` },
})

const LAGER_1 = 'Lehrplan TQ Lager Ausbildungsbaustein 1.docx'
const METALL_2 = 'Lehrplan TQ Metall Ausbildungsbaustein 2_Abschnitt 1.docx'

/** Drei Lernziele aus zwei Dokumenten – Form wie in data/lehrplaene.json */
const LERNZIELE = [
  { id: 1, berufsfeld: 'Lagerlogistik, Handel & Versand', tq: 'Fachlagerist (IHK)', baustein: 1, ausbildungsbaustein: 'Wareneingang', abschnitt: 1, titel: 'Güter entladen', niveaus: niveaus('entladen'), quelle: LAGER_1 },
  { id: 2, berufsfeld: 'Lagerlogistik, Handel & Versand', tq: 'Fachlagerist (IHK)', baustein: 1, ausbildungsbaustein: 'Wareneingang', abschnitt: 1, titel: 'Begleitpapiere prüfen', niveaus: niveaus('prüfen'), quelle: LAGER_1 },
  { id: 3, berufsfeld: 'Metalltechnik & Montage', tq: 'Industriemechaniker (HWK)', baustein: 2, ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', abschnitt: 1, titel: 'Bauteile fügen', niveaus: niveaus('fügen'), quelle: METALL_2 },
]

describe.skipIf(!hasDb)('Lehrpläne in der Datenbank (MySQL)', () => {
  const app = createApp()

  beforeAll(async () => {
    const [{ db }] = await query('SELECT DATABASE() AS db')
    if (!/_test$/i.test(db ?? '')) {
      throw new Error(`Testlauf abgebrochen: "${db}" ist keine Testdatenbank – DB_NAME=bildungspark_test setzen.`)
    }
    await runMigrations()
  })

  beforeEach(async () => {
    await deleteAll()
  })

  afterAll(async () => {
    // Andere Testdateien erwarten eine leere Lehrplan-Tabelle
    await deleteAll()
    await closePool()
  })

  it('Migration 005 ist angewendet', async () => {
    const rows = await query('SELECT name FROM schema_migrations ORDER BY name')
    expect(rows.map((r) => r.name)).toContain('005_lehrplaene.sql')
  })

  it('speichert Lehrpläne, Lernziele und Stufen und liefert sie in derselben Form zurück', async () => {
    expect(await ersetzeAlle(LERNZIELE)).toEqual({ lehrplaene: 2, lernziele: 3 })
    expect(await listLernziele()).toEqual(LERNZIELE)
    expect(await count()).toBe(3)
    expect(await stand()).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const tabellen = await query(
      'SELECT (SELECT COUNT(*) FROM lehrplaene) AS lehrplaene, (SELECT COUNT(*) FROM lernziele) AS lernziele, (SELECT COUNT(*) FROM lernziel_niveaus) AS niveaus',
    )
    expect(tabellen[0]).toEqual({ lehrplaene: 2, lernziele: 3, niveaus: 12 })
  })

  it('ein neuer Import ersetzt den alten Stand vollständig', async () => {
    await ersetzeAlle(LERNZIELE)
    await ersetzeAlle([{ ...LERNZIELE[0], titel: 'Güter entladen (neu)' }])
    const lernziele = await listLernziele()
    expect(lernziele.map((l) => l.titel)).toEqual(['Güter entladen (neu)'])
    expect((await query('SELECT COUNT(*) AS n FROM lernziel_niveaus'))[0].n).toBe(4)
  })

  it('ungültige Daten ändern nichts', async () => {
    await ersetzeAlle(LERNZIELE)
    await expect(ersetzeAlle([LERNZIELE[0], { ...LERNZIELE[1], id: 1 }])).rejects.toBeInstanceOf(LehrplanDatenError)
    await expect(ersetzeAlle([{ ...LERNZIELE[0], titel: '' }])).rejects.toThrow(/titel/)
    expect(await count()).toBe(3)
  })

  it('bricht bei einem Datenbankfehler mitten im Import ab, ohne den alten Stand zu verlieren', async () => {
    await ersetzeAlle(LERNZIELE)
    // Dateinamen, die sich nur in der Groß-/Kleinschreibung unterscheiden: Das Schema lässt sie durch,
    // der eindeutige Schlüssel (utf8mb4_unicode_ci) nicht -> Fehler, nachdem schon geschrieben wurde
    const kaputt = [
      { ...LERNZIELE[0], id: 7, quelle: 'Lehrplan.docx' },
      { ...LERNZIELE[1], id: 8, quelle: 'LEHRPLAN.docx' },
    ]
    await expect(ersetzeAlle(kaputt)).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' })
    expect(await listLernziele()).toEqual(LERNZIELE)
  })

  it('GET /api/lehrplaene liest aus der Datenbank', async () => {
    await ersetzeAlle(LERNZIELE)
    const response = await request(app).get('/api/lehrplaene')
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ herkunft: 'datenbank', anzahl: 3 })
    expect(response.body.lernziele[2]).toEqual(LERNZIELE[2])
  })

  describe('Seed', () => {
    let dir

    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), 'lehrplaene-seed-'))
      writeFileSync(join(dir, 'lehrplaene.json'), JSON.stringify({ stand: '2026-10-22', quelle: 'test', anzahl: 3, lernziele: LERNZIELE }))
    })

    afterAll(() => {
      rmSync(dir, { recursive: true, force: true })
    })

    it('übernimmt die JSON-Datei einmal in die Datenbank', async () => {
      const file = join(dir, 'lehrplaene.json')
      expect(await seedLehrplaene({ file })).toEqual({ angelegt: 3, uebersprungen: false })
      expect(await seedLehrplaene({ file })).toEqual({ angelegt: 0, uebersprungen: true })
      expect(await listLernziele()).toEqual(LERNZIELE)
    })

    it('ohne Datei passiert nichts', async () => {
      expect(await seedLehrplaene({ file: join(dir, 'fehlt.json') })).toEqual({ angelegt: 0, uebersprungen: true })
      expect(await count()).toBe(0)
    })

    it('eine kaputte JSON-Datei bricht den Seed nicht ab, sondern warnt', async () => {
      const kaputt = join(dir, 'kaputt.json')
      writeFileSync(kaputt, '{ kein gueltiges json')
      const meldungen = []
      expect(await seedLehrplaene({ file: kaputt, log: (zeile) => meldungen.push(zeile) })).toEqual({ angelegt: 0, uebersprungen: true })
      expect(meldungen.join('\n')).toContain('WARNUNG')
      expect(await count()).toBe(0)
    })

    it('auch ungültige Lehrplandaten werden nur als Warnung gemeldet', async () => {
      const falsch = join(dir, 'falsch.json')
      writeFileSync(falsch, JSON.stringify({ lernziele: [{ ...LERNZIELE[0], titel: '' }] }))
      const meldungen = []
      expect(await seedLehrplaene({ file: falsch, log: (zeile) => meldungen.push(zeile) })).toEqual({ angelegt: 0, uebersprungen: true })
      expect(meldungen.join('\n')).toContain('WARNUNG')
      expect(await count()).toBe(0)
    })
  })
  describe('Lehrplan hinzufügen (FE-34)', () => {
    const GALA = 'Lehrplan GaLa Baustein 1.docx'

    it('fügt einen Lehrplan hinzu, die IDs der vorhandenen Lernziele bleiben gleich', async () => {
      await ersetzeAlle(LERNZIELE)
      const lehrplan = leseLehrplanDatei(await lehrplanDocx({ titel: 'Pflanzen pflegen', lernziele: [{ titel: 'Hecke schneiden' }] }), { dateiname: GALA, berufsfeld: 'Garten- und Landschaftsbau' })

      expect(await quelleVorhanden(GALA)).toBe(false)
      expect(await fuegeLehrplanHinzu(lehrplan)).toEqual({ lernziele: 1, ersetzt: false })

      const alle = await listLernziele()
      expect(alle.slice(0, 3)).toEqual(LERNZIELE)
      expect(alle[3]).toMatchObject({ id: 4, berufsfeld: 'Garten- und Landschaftsbau', baustein: 1, ausbildungsbaustein: 'Pflanzen pflegen', titel: 'Hecke schneiden', quelle: GALA })
      expect(alle[3].niveaus.B).toEqual({ kompetenz: 'Kompetenz B', beispiel: 'Beispiel B' })
    })

    it('ersetzt einen Lehrplan mit gleichem Dateinamen (neue Version)', async () => {
      await ersetzeAlle(LERNZIELE)
      const v1 = leseLehrplanDatei(await lehrplanDocx({ lernziele: [{ titel: 'Hecke schneiden' }] }), { dateiname: GALA, berufsfeld: 'Garten- und Landschaftsbau' })
      const v2 = leseLehrplanDatei(await lehrplanDocx({ lernziele: [{ titel: 'Hecke schneiden' }, { titel: 'Rasen mähen' }] }), { dateiname: GALA, berufsfeld: 'Garten- und Landschaftsbau' })
      await fuegeLehrplanHinzu(v1)

      expect(await quelleVorhanden(GALA)).toBe(true)
      expect(await fuegeLehrplanHinzu(v2)).toEqual({ lernziele: 2, ersetzt: true })
      const gala = (await listLernziele()).filter((l) => l.quelle === GALA)
      expect(gala.map((l) => l.titel)).toEqual(['Hecke schneiden', 'Rasen mähen'])
      expect(await count()).toBe(5)
    })

    it('POST /api/lehrplaene speichert die Datei, GET liefert die neuen Lernziele', async () => {
      await ersetzeAlle(LERNZIELE)
      const response = await request(app)
        .post('/api/lehrplaene?berufsfeld=Garten-%20und%20Landschaftsbau')
        .set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .set('X-Dateiname', encodeURIComponent(GALA))
        .send(await lehrplanDocx({ lernziele: [{ titel: 'Hecke schneiden' }] }))
      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({ anzahl: 1, ersetzt: false })

      const liste = await request(app).get('/api/lehrplaene')
      expect(liste.body.herkunft).toBe('datenbank')
      expect(liste.body.lernziele.map((l) => l.berufsfeld)).toContain('Garten- und Landschaftsbau')
    })
  })
})
