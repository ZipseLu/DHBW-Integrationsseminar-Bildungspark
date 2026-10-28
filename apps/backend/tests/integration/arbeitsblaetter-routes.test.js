import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'
import { seedArbeitsblaetter, waehleLernziele, FALLBACK_LERNZIELE } from '../../src/arbeitsblaetter/seed.js'
import { count } from '../../src/arbeitsblaetter/repository.js'
import { REQUEST_T_TEXT, WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

/**
 * Routen der Arbeitsblatt-Verwaltung gegen eine echte MySQL.
 * Wie db.test.js: nur mit gesetztem DB_HOST (CI-Job backend-integration,
 * `docker compose --profile test run --rm backend-test` oder lokal mit
 * DB_HOST=127.0.0.1 DB_PORT=3307 DB_NAME=bildungspark_test …). Sonst uebersprungen.
 */
const hasDb = Boolean(process.env.DB_HOST)
const UNBEKANNT = '00000000-0000-4000-8000-000000000000'

const META = { provider: 'gemini', model: 'gemini-3.5-flash', mocked: false, promptVersion: '1.0.1', validation: { ok: true, hinweise: [] } }

/** Speichert ein Blatt mit Abweichungen vom Fixture und liefert das API-Objekt */
async function speichern(app, overrides = {}, body = {}) {
  const response = await request(app).post('/api/arbeitsblaetter').send({ worksheet: { ...WORKSHEET_T_TEXT, baustein: 1, ausbildungsbaustein: 'Wareneingang', ...overrides }, ...body })
  expect(response.status).toBe(201)
  return response.body.arbeitsblatt
}

describe.skipIf(!hasDb)('Arbeitsblatt-Verwaltung (MySQL)', () => {
  const app = createApp()

  beforeAll(async () => {
    await runMigrations()
  })

  beforeEach(async () => {
    await query('DELETE FROM arbeitsblaetter')
  })

  afterAll(async () => {
    await closePool()
  })

  describe('Migrationen', () => {
    it('sind wiederholbar und protokolliert', async () => {
      const { applied, skipped } = await runMigrations()
      expect(applied).toEqual([])
      expect(skipped).toContain('001_arbeitsblaetter.sql')
      const rows = await query('SELECT name FROM schema_migrations ORDER BY name')
      expect(rows.map((r) => r.name)).toContain('001_arbeitsblaetter.sql')
    })

    it('haben die Beispieltabellen vom 16.10. entfernt', async () => {
      const rows = await query("SHOW TABLES LIKE 'level_contents'")
      expect(rows).toHaveLength(0)
    })
  })

  describe('POST /api/arbeitsblaetter', () => {
    it('speichert ein Arbeitsblatt als Entwurf mit Version 1 und liefert es mit Inhalt zurueck', async () => {
      const response = await request(app).post('/api/arbeitsblaetter').send({ worksheet: WORKSHEET_T_TEXT, meta: META, erstelltVon: 'S. Oturucu' })

      expect(response.status).toBe(201)
      expect(response.headers.location).toMatch(/^\/api\/arbeitsblaetter\/[0-9a-f-]{36}$/)
      const { arbeitsblatt } = response.body
      expect(arbeitsblatt).toMatchObject({
        titel: 'Der LKW ist da', berufsfeld: WORKSHEET_T_TEXT.berufsfeld, lernziel: 'Güter entladen', stufe: 'T', format: 'text',
        sprache: 'Leichte Sprache', status: 'entwurf', kiGeneriert: true, favorit: false, elternId: null, version: 1, erstelltVon: 'S. Oturucu',
        baustein: null, ausbildungsbaustein: null,
      })
      expect(arbeitsblatt.inhalt).toEqual(WORKSHEET_T_TEXT)
      expect(new Date(arbeitsblatt.erstelltAm).toString()).not.toBe('Invalid Date')
      expect(arbeitsblatt.geaendertAm).toBe(arbeitsblatt.erstelltAm)
    })

    it('uebernimmt das Ergebnis von POST /api/ai/arbeitsblatt unveraendert (Mock-Durchlauf)', async () => {
      const generated = await request(app).post('/api/ai/arbeitsblatt').send({ ...REQUEST_T_TEXT, stufe: 'A', format: 'piktogramm' })
      expect(generated.status).toBe(200)

      const saved = await request(app).post('/api/arbeitsblaetter').send({ worksheet: generated.body.worksheet, meta: generated.body.meta })
      expect(saved.status).toBe(201)
      expect(saved.body.arbeitsblatt).toMatchObject({ stufe: 'A', format: 'piktogramm', baustein: 1, ausbildungsbaustein: 'Wareneingang', kiGeneriert: true })
      expect(saved.body.arbeitsblatt.inhalt).toEqual(generated.body.worksheet)

      const verlauf = await request(app).get(`/api/arbeitsblaetter/${saved.body.arbeitsblatt.id}/verlauf`)
      expect(verlauf.body.eintraege[0].kiMeta).toMatchObject({ mocked: true, model: 'mock' })
    })

    it('ohne meta gilt das Blatt als manuell erstellt', async () => {
      const blatt = await speichern(app)
      expect(blatt.kiGeneriert).toBe(false)
    })

    it('behaelt Umlaute und Piktogramm-Emoji im Inhalt (utf8mb4)', async () => {
      const einleitung = 'Gefahrgut: ä ö ü ß – 🏗️ 📦 „Achtung“'
      const blatt = await speichern(app, { einleitung })
      const response = await request(app).get(`/api/arbeitsblaetter/${blatt.id}`)
      expect(response.body.arbeitsblatt.inhalt.einleitung).toBe(einleitung)
    })

    it('verknuepft Varianten ueber elternId und prueft, dass das Elternblatt existiert', async () => {
      const eltern = await speichern(app, { stufe: 'T' })
      const kind = await speichern(app, { stufe: 'A' }, { elternId: eltern.id })
      expect(kind.elternId).toBe(eltern.id)

      const fehlt = await request(app).post('/api/arbeitsblaetter').send({ worksheet: WORKSHEET_T_TEXT, elternId: UNBEKANNT })
      expect(fehlt.status).toBe(400)
      expect(fehlt.body.message).toContain('elternId')

      const liste = await request(app).get(`/api/arbeitsblaetter?elternId=${eltern.id}`)
      expect(liste.body.eintraege.map((e) => e.id)).toEqual([kind.id])
    })

    it('lehnt ein ungueltiges Arbeitsblatt mit 400 und deutscher Meldung ab', async () => {
      const response = await request(app).post('/api/arbeitsblaetter').send({ worksheet: { ...WORKSHEET_T_TEXT, stufe: 'X' } })
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('validation_error')
      expect(response.body.message).toContain('worksheet.stufe')
    })

    it('lehnt einen Body ohne worksheet ab', async () => {
      const response = await request(app).post('/api/arbeitsblaetter').send({})
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/arbeitsblaetter', () => {
    it('liefert eine leere erste Seite', async () => {
      const response = await request(app).get('/api/arbeitsblaetter')
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ eintraege: [], seite: 1, proSeite: 15, gesamt: 0, seiten: 1 })
    })

    it('blaettert ab 15 Eintraegen, neueste zuerst, ohne Inhalt', async () => {
      for (let i = 1; i <= 17; i += 1) await speichern(app, { titel: `Blatt ${String(i).padStart(2, '0')}` })

      const seite1 = await request(app).get('/api/arbeitsblaetter')
      expect(seite1.body).toMatchObject({ seite: 1, proSeite: 15, gesamt: 17, seiten: 2 })
      expect(seite1.body.eintraege).toHaveLength(15)
      expect(seite1.body.eintraege[0].titel).toBe('Blatt 17')
      expect(seite1.body.eintraege[0]).not.toHaveProperty('inhalt')

      const seite2 = await request(app).get('/api/arbeitsblaetter?seite=2')
      expect(seite2.body.eintraege.map((e) => e.titel)).toEqual(['Blatt 02', 'Blatt 01'])

      const nachTitel = await request(app).get('/api/arbeitsblaetter?sortierung=titel&proSeite=3')
      expect(nachTitel.body.eintraege.map((e) => e.titel)).toEqual(['Blatt 01', 'Blatt 02', 'Blatt 03'])
    })

    it('filtert nach Berufsfeld, Baustein, Ausbildungsbaustein, Stufe, Format, Sprache, Favorit und KI', async () => {
      await speichern(app, { stufe: 'T', format: 'text' }, { meta: META })
      await speichern(app, { stufe: 'A', format: 'piktogramm', sprache: 'Standardsprache' }, { favorit: true })
      await speichern(app, { berufsfeld: 'Gastronomie & Hauswirtschaft', baustein: 2, ausbildungsbaustein: 'Küche', stufe: 'F' })

      const get = async (qs) => (await request(app).get(`/api/arbeitsblaetter?${qs}`)).body.eintraege
      expect(await get('berufsfeld=Gastronomie%20%26%20Hauswirtschaft')).toHaveLength(1)
      expect(await get('baustein=2')).toHaveLength(1)
      expect(await get('ausbildungsbaustein=Wareneingang')).toHaveLength(2)
      expect((await get('stufe=T,A')).map((e) => e.stufe).sort()).toEqual(['A', 'T'])
      expect(await get('format=piktogramm')).toHaveLength(1)
      expect(await get('sprache=Standardsprache')).toHaveLength(1)
      expect(await get('favorit=true')).toHaveLength(1)
      expect(await get('kiGeneriert=true')).toHaveLength(1)
      expect(await get('kiGeneriert=false')).toHaveLength(2)
      expect(await get('stufe=B')).toHaveLength(0)
    })

    it('sucht in Titel, Lernziel, Ausbildungsbaustein und Berufsfeld; Platzhalter werden nicht interpretiert', async () => {
      await speichern(app, { titel: 'Der LKW ist da' })
      await speichern(app, { titel: 'Regal einräumen', lernziel: 'Güter lagern' })

      const get = async (q) => (await request(app).get(`/api/arbeitsblaetter?q=${encodeURIComponent(q)}`)).body.eintraege
      expect(await get('lkw')).toHaveLength(1)
      expect(await get('güter')).toHaveLength(2)
      expect(await get('Wareneingang')).toHaveLength(2)
      expect(await get('Lagerlogistik')).toHaveLength(2)
      expect(await get('%')).toHaveLength(0)
      expect(await get('_KW')).toHaveLength(0)
    })

    it('blendet archivierte Blaetter standardmaessig aus; status=alle zeigt sie', async () => {
      const blatt = await speichern(app)
      await request(app).delete(`/api/arbeitsblaetter/${blatt.id}`)
      expect((await request(app).get('/api/arbeitsblaetter')).body.gesamt).toBe(0)
      expect((await request(app).get('/api/arbeitsblaetter?status=alle')).body.gesamt).toBe(1)
      expect((await request(app).get('/api/arbeitsblaetter?status=archiviert')).body.gesamt).toBe(1)
    })

    it('lehnt ungueltige Filter mit 400 ab', async () => {
      const response = await request(app).get('/api/arbeitsblaetter?stufe=X&proSeite=999')
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('validation_error')
    })
  })

  describe('GET /api/arbeitsblaetter/filteroptionen', () => {
    it('liefert Berufsfelder und Bausteine der nicht archivierten Blaetter', async () => {
      await speichern(app)
      await speichern(app, { stufe: 'A' })
      await speichern(app, { berufsfeld: 'Gastronomie & Hauswirtschaft', baustein: 2, ausbildungsbaustein: 'Küche' })
      const archiviert = await speichern(app, { berufsfeld: 'Metalltechnik & Montage', baustein: 2, ausbildungsbaustein: 'Fügen' })
      await request(app).delete(`/api/arbeitsblaetter/${archiviert.id}`)

      const response = await request(app).get('/api/arbeitsblaetter/filteroptionen')
      expect(response.status).toBe(200)
      expect(response.body.berufsfelder).toEqual(['Gastronomie & Hauswirtschaft', 'Lagerlogistik, Handel & Versand'])
      expect(response.body.bausteine).toEqual([
        { berufsfeld: 'Gastronomie & Hauswirtschaft', baustein: 2, ausbildungsbaustein: 'Küche', anzahl: 1 },
        { berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, ausbildungsbaustein: 'Wareneingang', anzahl: 2 },
      ])
    })
  })

  describe('GET /api/arbeitsblaetter/:id', () => {
    it('liefert das Blatt mit Inhalt', async () => {
      const blatt = await speichern(app)
      const response = await request(app).get(`/api/arbeitsblaetter/${blatt.id}`)
      expect(response.status).toBe(200)
      expect(response.body.arbeitsblatt.inhalt.aufgaben).toHaveLength(4)
    })

    it('antwortet fuer unbekannte und ungueltige IDs mit 404', async () => {
      expect((await request(app).get(`/api/arbeitsblaetter/${UNBEKANNT}`)).status).toBe(404)
      const kaputt = await request(app).get('/api/arbeitsblaetter/keine-uuid')
      expect(kaputt.status).toBe(404)
      expect(kaputt.body.error).toBe('not_found')
    })
  })

  describe('PATCH /api/arbeitsblaetter/:id', () => {
    it('Favorit aendern schreibt keine neue Version', async () => {
      const blatt = await speichern(app)
      const response = await request(app).patch(`/api/arbeitsblaetter/${blatt.id}`).send({ favorit: true })
      expect(response.status).toBe(200)
      expect(response.body.arbeitsblatt).toMatchObject({ favorit: true, version: 1 })
    })

    it('neuer Inhalt wird Version 2 mit Aktion "bearbeitet" und aktualisiert die Listenfelder', async () => {
      const blatt = await speichern(app)
      const geaendert = { ...WORKSHEET_T_TEXT, titel: 'Der LKW ist weg', stufe: 'A' }
      const response = await request(app).patch(`/api/arbeitsblaetter/${blatt.id}`).send({ worksheet: geaendert, autor: 'T. Neumann', notiz: 'Titel angepasst' })
      expect(response.status).toBe(200)
      expect(response.body.arbeitsblatt).toMatchObject({ titel: 'Der LKW ist weg', stufe: 'A', version: 2 })
      expect(response.body.arbeitsblatt.inhalt).toEqual(geaendert)

      const verlauf = await request(app).get(`/api/arbeitsblaetter/${blatt.id}/verlauf`)
      expect(verlauf.body.eintraege.map((e) => [e.version, e.aktion, e.autor, e.notiz])).toEqual([
        [2, 'bearbeitet', 'T. Neumann', 'Titel angepasst'],
        [1, 'erstellt', null, null],
      ])
      expect(verlauf.body.eintraege[0]).not.toHaveProperty('inhalt')

      const alt = await request(app).get(`/api/arbeitsblaetter/${blatt.id}/versionen/1`)
      expect(alt.body.version.inhalt.titel).toBe('Der LKW ist da')
      expect((await request(app).get(`/api/arbeitsblaetter/${blatt.id}/versionen/9`)).status).toBe(404)
    })

    it('Freigabe und Archivierung werden als Versionen protokolliert, KI-angepasst ist waehlbar', async () => {
      const blatt = await speichern(app)
      const frei = await request(app).patch(`/api/arbeitsblaetter/${blatt.id}`).send({ status: 'freigegeben', autor: 'C. Hager' })
      expect(frei.body.arbeitsblatt).toMatchObject({ status: 'freigegeben', version: 2 })

      const nochmal = await request(app).patch(`/api/arbeitsblaetter/${blatt.id}`).send({ status: 'freigegeben' })
      expect(nochmal.body.arbeitsblatt.version).toBe(2)

      const ki = await request(app).patch(`/api/arbeitsblaetter/${blatt.id}`).send({ worksheet: WORKSHEET_T_TEXT, aktion: 'KI-angepasst' })
      expect(ki.body.arbeitsblatt.version).toBe(3)

      const verlauf = await request(app).get(`/api/arbeitsblaetter/${blatt.id}/verlauf`)
      expect(verlauf.body.eintraege.map((e) => e.aktion)).toEqual(['KI-angepasst', 'freigegeben', 'erstellt'])
    })

    it('lehnt leere Aenderungen ab und meldet unbekannte Blaetter', async () => {
      const blatt = await speichern(app)
      expect((await request(app).patch(`/api/arbeitsblaetter/${blatt.id}`).send({})).status).toBe(400)
      expect((await request(app).patch(`/api/arbeitsblaetter/${UNBEKANNT}`).send({ favorit: true })).status).toBe(404)
    })
  })

  describe('DELETE /api/arbeitsblaetter/:id', () => {
    it('archiviert standardmaessig und loescht nur mit ?endgueltig=true', async () => {
      const blatt = await speichern(app)
      const archiviert = await request(app).delete(`/api/arbeitsblaetter/${blatt.id}`)
      expect(archiviert.status).toBe(200)
      expect(archiviert.body.arbeitsblatt).toMatchObject({ status: 'archiviert', version: 2 })

      const weg = await request(app).delete(`/api/arbeitsblaetter/${blatt.id}?endgueltig=true`)
      expect(weg.status).toBe(204)
      expect((await request(app).get(`/api/arbeitsblaetter/${blatt.id}`)).status).toBe(404)
      expect(await query('SELECT COUNT(*) AS n FROM arbeitsblatt_versionen WHERE arbeitsblatt_id = ?', [blatt.id])).toEqual([{ n: 0 }])
      expect((await request(app).delete(`/api/arbeitsblaetter/${blatt.id}?endgueltig=true`)).status).toBe(404)
    })
  })

  describe('GET /api/arbeitsblaetter/:id/docx', () => {
    it('liefert die aktuelle Version als Word-Datei', async () => {
      const blatt = await speichern(app)
      const response = await request(app).get(`/api/arbeitsblaetter/${blatt.id}/docx`).responseType('blob')
      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('wordprocessingml')
      expect(response.headers['content-disposition']).toContain('_T-text.docx')
      expect(Buffer.from(response.body).subarray(0, 2).toString()).toBe('PK')
    })
  })

  describe('Seed', () => {
    it('legt je Lernziel vier verknuepfte Blaetter an und laeuft nicht doppelt', async () => {
      const erst = await seedArbeitsblaetter({ lernziele: 2 })
      expect(erst).toMatchObject({ angelegt: 8, uebersprungen: false })
      expect(await count()).toBe(8)

      const liste = (await request(app).get('/api/arbeitsblaetter?proSeite=50&status=alle')).body.eintraege
      const eltern = liste.filter((e) => e.elternId === null)
      expect(eltern).toHaveLength(2)
      expect(liste.filter((e) => e.elternId === eltern[0].id || e.elternId === eltern[1].id)).toHaveLength(6)

      const zweit = await seedArbeitsblaetter({ lernziele: 2 })
      expect(zweit.uebersprungen).toBe(true)
      expect(await count()).toBe(8)

      const reset = await seedArbeitsblaetter({ lernziele: 1, reset: true })
      expect(reset.angelegt).toBe(4)
      expect(await count()).toBe(4)
    })
  })
})

describe('waehleLernziele', () => {
  it('verteilt die Auswahl gleichmaessig ueber die Berufsfelder', () => {
    const auswahl = waehleLernziele([...FALLBACK_LERNZIELE, { ...FALLBACK_LERNZIELE[0], titel: 'Zweites Lager' }], 3)
    expect(auswahl.map((lz) => lz.berufsfeld)).toEqual(FALLBACK_LERNZIELE.map((lz) => lz.berufsfeld))
  })
})

describe.skipIf(hasDb)('Arbeitsblatt-Verwaltung ohne Datenbank', () => {
  const app = createApp()

  it('antwortet mit 503 db_unavailable statt mit einem Absturz', async () => {
    const response = await request(app).get('/api/arbeitsblaetter')
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
    expect(response.body.message).toContain('MySQL')
  })

  it('prueft Eingaben auch ohne Datenbank (400 vor 503)', async () => {
    const response = await request(app).post('/api/arbeitsblaetter').send({ worksheet: { titel: 'kaputt' } })
    expect(response.status).toBe(400)
  })
})
