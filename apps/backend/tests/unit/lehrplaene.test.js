import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLehrplaeneRouter, loadLehrplaene } from '../../src/routes/lehrplaene.js'
import { LehrplanDatenError, berlinerDatum } from '../../src/lehrplan/repository.js'
import { LehrplanImportSchema, LernzielImportSchema } from '../../src/lehrplan/schema.js'

/**
 * Lehrpläne in der Datenbank (Migration 004) ohne echte Datenbank: Schema der Importdaten
 * und die Reihenfolge Datenbank -> Datei -> leer in GET /api/lehrplaene (Repository als Stub).
 * Gegen MySQL: tests/integration/lehrplaene-db.test.js
 */
const LERNZIEL = {
  id: 1,
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  tq: 'für die Ausbildungsberufe als Fachlagerist (IHK)',
  baustein: 1,
  ausbildungsbaustein: 'Wareneingang',
  abschnitt: 1,
  titel: 'Güter entladen',
  niveaus: {
    T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt', beispiel: 'Informiert den Anleiter' },
    A: { kompetenz: 'Beherrscht einige Arbeitsschritte', beispiel: '' },
    F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte', beispiel: 'Kontrolliert den Lieferschein' },
    B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte', beispiel: 'Wählt das Transportmittel' },
  },
  quelle: 'Lehrplan TQ Lager Ausbildungsbaustein 1.docx',
}

const dbFehler = () => Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' })

/** Stub für src/lehrplan/repository.js */
const repository = ({ lernziele = [], fehler = null, stand = '2026-11-03' } = {}) => ({
  async listLernziele() {
    if (fehler) throw fehler
    return lernziele
  },
  async stand() {
    return stand
  },
})

function appWith(options) {
  const app = express()
  app.use('/api/lehrplaene', createLehrplaeneRouter(options))
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => res.status(500).json({ error: 'internal_error' }))
  return app
}

describe('LehrplanImportSchema', () => {
  it('übernimmt einen Eintrag der JSON-Datei unverändert', () => {
    expect(LernzielImportSchema.parse(LERNZIEL)).toEqual(LERNZIEL)
  })

  it('ergänzt fehlende Stufen und Felder mit leeren Werten', () => {
    const parsed = LernzielImportSchema.parse({ id: 2, berufsfeld: 'Metalltechnik & Montage', titel: 'Bauteile fügen', niveaus: { A: { kompetenz: 'x' } }, quelle: 'm.docx' })
    expect(parsed).toMatchObject({ tq: null, baustein: null, ausbildungsbaustein: null, abschnitt: null })
    expect(parsed.niveaus).toEqual({
      T: { kompetenz: '', beispiel: '' },
      A: { kompetenz: 'x', beispiel: '' },
      F: { kompetenz: '', beispiel: '' },
      B: { kompetenz: '', beispiel: '' },
    })
  })

  it('lehnt Einträge ohne Titel oder Quelle und doppelte IDs ab', () => {
    expect(LernzielImportSchema.safeParse({ ...LERNZIEL, titel: ' ' }).success).toBe(false)
    expect(LernzielImportSchema.safeParse({ ...LERNZIEL, quelle: undefined }).success).toBe(false)
    const doppelt = LehrplanImportSchema.safeParse([LERNZIEL, { ...LERNZIEL, titel: 'anders' }])
    expect(doppelt.success).toBe(false)
    expect(doppelt.error.issues[0].message).toContain('doppelt')
  })
})

describe('GET /api/lehrplaene – Datenbank, dann Datei', () => {
  let dir
  let datei

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'lehrplaene-'))
    datei = join(dir, 'lehrplaene.json')
    writeFileSync(datei, JSON.stringify({ stand: '2026-10-22', quelle: 'test', lernziele: [{ ...LERNZIEL, titel: 'aus der Datei' }] }))
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('liefert die Lernziele aus der Datenbank, wenn dort welche stehen', async () => {
    const response = await request(appWith({ file: datei, repository: repository({ lernziele: [LERNZIEL] }) })).get('/api/lehrplaene')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ herkunft: 'datenbank', stand: '2026-11-03', anzahl: 1, lernziele: [LERNZIEL] })
  })

  it('nimmt die Datei, solange die Datenbank leer ist', async () => {
    const response = await request(appWith({ file: datei, repository: repository() })).get('/api/lehrplaene')
    expect(response.body).toMatchObject({ herkunft: 'datei', stand: '2026-10-22', anzahl: 1 })
    expect(response.body.lernziele[0].titel).toBe('aus der Datei')
    expect(response.body.hinweis).toContain('db:seed')
  })

  it('nimmt die Datei, wenn die Datenbank nicht erreichbar ist', async () => {
    const response = await request(appWith({ file: datei, repository: repository({ fehler: dbFehler() }) })).get('/api/lehrplaene')
    expect(response.status).toBe(200)
    expect(response.body.herkunft).toBe('datei')
  })

  it('ohne Datenbank und ohne Datei: leere Liste mit Hinweis', async () => {
    const response = await request(appWith({ file: join(dir, 'fehlt.json'), repository: repository({ fehler: dbFehler() }) })).get('/api/lehrplaene')
    expect(response.body).toMatchObject({ herkunft: null, anzahl: 0, lernziele: [] })
    expect(response.body.hinweis).toContain('import:lehrplaene')
  })

  it('andere Datenbankfehler werden nicht verschluckt', async () => {
    const response = await request(appWith({ file: datei, repository: repository({ fehler: new Error('kaputt') }) })).get('/api/lehrplaene')
    expect(response.status).toBe(500)
  })

  it('versucht es nach einem DB-Ausfall 30 s lang nicht erneut', async () => {
    let aufrufe = 0
    const stub = {
      async listLernziele() {
        aufrufe += 1
        throw dbFehler()
      },
      async stand() {
        return null
      },
    }
    const app = appWith({ file: datei, repository: stub })
    await request(app).get('/api/lehrplaene')
    await request(app).get('/api/lehrplaene')
    expect(aufrufe).toBe(1)
  })

  it('mit dbRetryMs: 0 fragt jeder Aufruf erneut', async () => {
    let aufrufe = 0
    const stub = {
      async listLernziele() {
        aufrufe += 1
        throw dbFehler()
      },
      async stand() {
        return null
      },
    }
    const app = appWith({ file: datei, repository: stub, dbRetryMs: 0 })
    await request(app).get('/api/lehrplaene')
    await request(app).get('/api/lehrplaene')
    expect(aufrufe).toBe(2)
  })

  it('meldet eine kaputte JSON-Datei als LehrplanDatenError', async () => {
    const kaputt = join(dir, 'kaputt.json')
    writeFileSync(kaputt, '{ kein gueltiges json')
    await expect(loadLehrplaene(kaputt)).rejects.toBeInstanceOf(LehrplanDatenError)
  })
})

describe('berlinerDatum', () => {
  it('rechnet UTC in Europe/Berlin um (Winter- und Sommerzeit)', () => {
    expect(berlinerDatum('2026-11-03 23:30:00.000')).toBe('2026-11-04') // Winterzeit: +1 h
    expect(berlinerDatum('2026-07-01 22:30:00.000')).toBe('2026-07-02') // Sommerzeit: +2 h
    expect(berlinerDatum('2026-11-03 22:30:00.000')).toBe('2026-11-03')
  })

  it('akzeptiert DATETIME ohne Millisekunden', () => {
    expect(berlinerDatum('2026-11-03 23:30:00')).toBe('2026-11-04')
  })

  it('gibt bei ungültigen Werten null zurück', () => {
    expect(berlinerDatum('kaputt')).toBe(null)
    expect(berlinerDatum(null)).toBe(null)
  })
})
