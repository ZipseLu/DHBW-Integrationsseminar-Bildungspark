import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { Document, Packer, Paragraph } from 'docx'
import { createApp } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { runMigrations } from '../../src/db/migrate.js'

/**
 * Upload of worksheets against a real MySQL – only with DB_HOST set and only
 * against a *_test database; skipped otherwise (like the other route tests).
 */
const hasDb = Boolean(process.env.DB_HOST)
const UNBEKANNT = '00000000-0000-4000-8000-000000000000'
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF')

async function docx(...absaetze) {
  return Packer.toBuffer(new Document({ sections: [{ children: absaetze.map((a) => new Paragraph(a)) }] }))
}

describe.skipIf(!hasDb)('Uploads (MySQL)', () => {
  const app = createApp()

  /** Uploads a file like the frontend does: raw body + X-Dateiname */
  const hochladen = (dateiname, inhalt, { typ = 'application/octet-stream', query = '' } = {}) =>
    request(app).post(`/api/uploads${query}`).set('X-Dateiname', encodeURIComponent(dateiname)).set('Content-Type', typ).send(inhalt)

  beforeAll(async () => {
    const [{ db }] = await query('SELECT DATABASE() AS db')
    if (!/_test$/i.test(db ?? '')) {
      throw new Error(`Testlauf abgebrochen: "${db}" ist keine Testdatenbank – DB_NAME=bildungspark_test setzen.`)
    }
    await runMigrations()
  })

  beforeEach(async () => {
    await query('DELETE FROM uploads')
  })

  afterAll(async () => {
    await closePool()
  })

  it('Migration 003 ist angewendet', async () => {
    const rows = await query('SELECT name FROM schema_migrations ORDER BY name')
    expect(rows.map((r) => r.name)).toContain('003_uploads.sql')
  })

  describe('POST /api/uploads', () => {
    it('speichert eine Word-Datei und liest den Text', async () => {
      const inhalt = await docx('Gabelstapler sicher fahren', 'Aufgabe 1: Kreuze an.')
      const response = await hochladen('Übung Gabelstapler.docx', inhalt, { query: '?berufsfeld=Lagerlogistik%2C%20Handel%20%26%20Versand&thema=Gabelstapler&hochgeladenVon=C.%20Hager' })

      expect(response.status).toBe(201)
      expect(response.headers.location).toBe(`/api/uploads/${response.body.upload.id}`)
      expect(response.body.hinweise).toEqual([])
      expect(response.body.upload).toMatchObject({
        dateiname: 'Übung Gabelstapler.docx',
        dateityp: 'docx',
        groesse: inhalt.length,
        hatDatei: true,
        textQuelle: 'datei',
        text: 'Gabelstapler sicher fahren\nAufgabe 1: Kreuze an.',
        berufsfeld: 'Lagerlogistik, Handel & Versand',
        thema: 'Gabelstapler',
        hochgeladenVon: 'C. Hager',
      })
    })

    it('speichert ein PDF ohne Text und gibt einen Hinweis', async () => {
      const response = await hochladen('Lieferschein.pdf', PDF, { typ: 'application/pdf' })
      expect(response.status).toBe(201)
      expect(response.body.upload).toMatchObject({ dateityp: 'pdf', text: null, textQuelle: null, textLaenge: 0 })
      expect(response.body.hinweise[0]).toContain('kein Text')
    })

    it('speichert eingefügten Text ohne Datei', async () => {
      const response = await request(app).post('/api/uploads').send({ text: 'Lies den Text.\nKreuze an.', titel: 'Hygiene', berufsfeld: 'Gastronomie & Hauswirtschaft' })
      expect(response.status).toBe(201)
      expect(response.body.upload).toMatchObject({ dateiname: 'Hygiene.txt', dateityp: 'txt', hatDatei: false, textQuelle: 'eingefuegt', thema: 'Hygiene' })
      expect((await request(app).get(`/api/uploads/${response.body.upload.id}/datei`)).status).toBe(404)
    })

    it('speichert ohne Namen, wenn keiner angegeben ist', async () => {
      const response = await hochladen('notiz.txt', Buffer.from('Hallo'))
      expect(response.status).toBe(201)
      expect(response.body.upload.hochgeladenVon).toBeNull()
    })
  })

  describe('GET /api/uploads', () => {
    it('listet neueste zuerst ohne vollen Text und filtert', async () => {
      await hochladen('alt.txt', Buffer.from('Wareneingang prüfen'), { query: '?berufsfeld=Lager' })
      await new Promise((resolve) => setTimeout(resolve, 5))
      await hochladen('neu.txt', Buffer.from('x'.repeat(500)), { query: '?berufsfeld=Gastro&thema=Hygiene' })

      const alle = await request(app).get('/api/uploads')
      expect(alle.status).toBe(200)
      expect(alle.body.gesamt).toBe(2)
      expect(alle.body.eintraege.map((u) => u.dateiname)).toEqual(['neu.txt', 'alt.txt'])
      expect(alle.body.eintraege[0]).not.toHaveProperty('text')
      expect(alle.body.eintraege[0]).toMatchObject({ textLaenge: 500 })
      expect(alle.body.eintraege[0].textVorschau).toHaveLength(200)

      expect((await request(app).get('/api/uploads?berufsfeld=Lager')).body.eintraege.map((u) => u.dateiname)).toEqual(['alt.txt'])
      expect((await request(app).get('/api/uploads?q=wareneingang')).body.gesamt).toBe(1)
      expect((await request(app).get('/api/uploads?q=Hygiene')).body.gesamt).toBe(1)
      // LIKE wildcards are searched literally
      expect((await request(app).get('/api/uploads?q=%25')).body.gesamt).toBe(0)
    })
  })

  describe('Datei, Ändern, Löschen', () => {
    it('liefert die Originaldatei zum Herunterladen und PDFs zur Ansicht', async () => {
      const { body } = await hochladen('Lieferschein Ü.pdf', PDF)
      const download = await request(app).get(`/api/uploads/${body.upload.id}/datei`).buffer(true).parse((res, cb) => {
        const teile = []
        res.on('data', (c) => teile.push(c))
        res.on('end', () => cb(null, Buffer.concat(teile)))
      })
      expect(download.status).toBe(200)
      expect(download.headers['content-type']).toBe('application/pdf')
      expect(download.headers['content-disposition']).toContain("filename*=UTF-8''Lieferschein%20%C3%9C.pdf")
      expect(download.headers['content-disposition']).toMatch(/^attachment;/)
      expect(Buffer.compare(download.body, PDF)).toBe(0)

      const ansicht = await request(app).get(`/api/uploads/${body.upload.id}/datei?anzeigen=true`)
      expect(ansicht.headers['content-disposition']).toMatch(/^inline;/)
      expect(ansicht.headers['content-security-policy']).toBeUndefined()
    })

    it('zeigt Word-Dateien nie direkt im Browser an', async () => {
      const { body } = await hochladen('a.docx', await docx('x'))
      const ansicht = await request(app).get(`/api/uploads/${body.upload.id}/datei?anzeigen=true`)
      expect(ansicht.headers['content-disposition']).toMatch(/^attachment;/)
    })

    it('ergänzt den Text eines PDFs von Hand und ändert das Thema', async () => {
      const { body } = await hochladen('scan.pdf', PDF)
      const response = await request(app).patch(`/api/uploads/${body.upload.id}`).send({ text: 'Abgetippter Text', thema: 'Scan' })
      expect(response.status).toBe(200)
      expect(response.body.upload).toMatchObject({ text: 'Abgetippter Text', textQuelle: 'bearbeitet', thema: 'Scan', textLaenge: 16 })

      const ohneText = await request(app).patch(`/api/uploads/${body.upload.id}`).send({ text: null })
      expect(ohneText.body.upload).toMatchObject({ text: null, textQuelle: null })
    })

    it('löscht einen Upload samt Datei', async () => {
      const { body } = await hochladen('weg.txt', Buffer.from('weg'))
      expect((await request(app).delete(`/api/uploads/${body.upload.id}`)).status).toBe(204)
      expect((await request(app).get(`/api/uploads/${body.upload.id}`)).status).toBe(404)
      expect((await request(app).delete(`/api/uploads/${body.upload.id}`)).status).toBe(404)
    })

    it('antwortet mit 404 für unbekannte Uploads', async () => {
      expect((await request(app).get(`/api/uploads/${UNBEKANNT}`)).body.code).toBe('upload_unbekannt')
      expect((await request(app).patch(`/api/uploads/${UNBEKANNT}`).send({ thema: 'x' })).status).toBe(404)
      expect((await request(app).get(`/api/uploads/${UNBEKANNT}/datei`)).body.code).toBe('datei_unbekannt')
    })
  })
})

describe.skipIf(hasDb)('Uploads ohne Datenbank', () => {
  const app = createApp()

  it('antwortet mit 503 db_unavailable', async () => {
    const response = await request(app).get('/api/uploads')
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
  })
})
