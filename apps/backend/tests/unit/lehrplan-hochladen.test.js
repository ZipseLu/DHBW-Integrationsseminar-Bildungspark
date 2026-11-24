import { describe, it, expect, vi, beforeAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { LehrplanUploadError, leseLehrplanDatei } from '../../src/lehrplan/hochladen.js'
import { createLehrplaeneRouter } from '../../src/routes/lehrplaene.js'
import { briefDocx, lehrplanDocx } from '../helpers/lehrplanDocx.js'

/**
 * FE-34: adding a curriculum in the application. Reading the Word file and the two
 * routes POST /api/lehrplaene/vorschau and POST /api/lehrplaene – with a repository stub,
 * without MySQL (against MySQL: tests/integration/lehrplaene-db.test.js).
 */
const DATEI = 'Binnendifferenzierter Lehrplan TQ Lager Ausbildungsbaustein 1.docx'

let docx
let briefDocxBuffer
beforeAll(async () => {
  docx = await lehrplanDocx()
  briefDocxBuffer = await briefDocx()
})

function fehlerVon(fn) {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('kein Fehler geworfen')
}

describe('leseLehrplanDatei', () => {
  it('liest Baustein, Lernziele und die vier Stufen, das Berufsfeld kommt aus dem Dateinamen', () => {
    const lehrplan = leseLehrplanDatei(docx, { dateiname: DATEI })
    expect(lehrplan).toMatchObject({ quelle: DATEI, berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, ausbildungsbaustein: 'Wareneingang', hinweise: [] })
    expect(lehrplan.tq).toContain('Fachlagerist')
    expect(lehrplan.lernziele.map((l) => l.titel)).toEqual(['Güter entladen', 'Begleitpapiere prüfen'])
    expect(lehrplan.lernziele[0].niveaus.T).toEqual({ kompetenz: 'Kompetenz T', beispiel: 'Beispiel T' })
  })

  it('nimmt das gewählte Berufsfeld vor dem Dateinamen', () => {
    expect(leseLehrplanDatei(docx, { dateiname: DATEI, berufsfeld: ' Garten- und Landschaftsbau ' }).berufsfeld).toBe('Garten- und Landschaftsbau')
  })

  it('meldet fehlende Stufen und einen fehlenden Baustein als Hinweis', async () => {
    const unvollstaendig = await lehrplanDocx({ baustein: null, lernziele: [{ titel: 'Hecke schneiden', stufen: ['T', 'A'] }] })
    const lehrplan = leseLehrplanDatei(unvollstaendig, { dateiname: 'gala.docx', berufsfeld: 'Garten- und Landschaftsbau' })
    expect(lehrplan.baustein).toBeNull()
    expect(lehrplan.hinweise).toEqual(['Die Zeile „Ausbildungs-baustein N“ wurde nicht gefunden – der Baustein bleibt leer.', '„Hecke schneiden“: Stufe F, B fehlt.'])
    expect(lehrplan.lernziele[0].niveaus.F).toEqual({ kompetenz: '', beispiel: '' })
  })

  it('lehnt andere Dateitypen, fehlendes Berufsfeld und Dateien ohne Lernziele verständlich ab', async () => {
    expect(fehlerVon(() => leseLehrplanDatei(Buffer.from('%PDF-1.4'), { dateiname: 'a.pdf', berufsfeld: 'X' }))).toMatchObject({ status: 415 })
    expect(fehlerVon(() => leseLehrplanDatei(docx, { dateiname: 'lehrplan.docx' }))).toMatchObject({ status: 400, code: 'berufsfeld_fehlt' })
    expect(fehlerVon(() => leseLehrplanDatei(Buffer.alloc(0), { dateiname: DATEI }))).toMatchObject({ status: 400, code: 'datei_fehlt' })
    expect(fehlerVon(() => leseLehrplanDatei(null, { dateiname: DATEI }))).toBeInstanceOf(LehrplanUploadError)
    const ohneTabelle = fehlerVon(() => leseLehrplanDatei(briefDocxBuffer, { dateiname: DATEI }))
    expect(ohneTabelle).toMatchObject({ status: 422, code: 'keine_lernziele' })
  })
})

/** Stub for src/lehrplan/repository.js */
function repository({ anzahl = 5, vorhanden = false, fehler = null } = {}) {
  return {
    listLernziele: vi.fn(async () => []),
    stand: vi.fn(async () => null),
    count: vi.fn(async () => {
      if (fehler) throw fehler
      return anzahl
    }),
    quelleVorhanden: vi.fn(async () => {
      if (fehler) throw fehler
      return vorhanden
    }),
    ersetzeAlle: vi.fn(async (lernziele) => ({ lehrplaene: 1, lernziele: lernziele.length })),
    fuegeLehrplanHinzu: vi.fn(async (lehrplan) => ({ lernziele: lehrplan.lernziele.length, ersetzt: vorhanden })),
  }
}

function appWith(options, benutzer = null) {
  const app = express()
  app.use((req, _res, next) => {
    if (benutzer) req.benutzer = benutzer
    next()
  })
  app.use('/api/lehrplaene', createLehrplaeneRouter({ dbRetryMs: 0, ...options }))
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => res.status(500).json({ error: 'internal_error', message: err.message }))
  return app
}

const hochladen = (app, pfad, { datei = docx, name = DATEI, berufsfeld } = {}) => {
  const anfrage = request(app)
    .post(`/api/lehrplaene${pfad}${berufsfeld ? `?berufsfeld=${encodeURIComponent(berufsfeld)}` : ''}`)
    .set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  if (name) anfrage.set('X-Dateiname', encodeURIComponent(name))
  return anfrage.send(datei)
}

describe('POST /api/lehrplaene/vorschau', () => {
  it('zeigt die erkannten Lernziele und speichert nichts', async () => {
    const repo = repository({ vorhanden: true })
    const response = await hochladen(appWith({ repository: repo }), '/vorschau')
    expect(response.status).toBe(200)
    expect(response.body.ersetzt).toBe(true)
    expect(response.body.lehrplan).toMatchObject({ berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, quelle: DATEI })
    expect(response.body.lehrplan.lernziele).toHaveLength(2)
    expect(repo.fuegeLehrplanHinzu).not.toHaveBeenCalled()
  })

  it('funktioniert auch ohne Datenbank', async () => {
    const fehler = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    const response = await hochladen(appWith({ repository: repository({ fehler }) }), '/vorschau')
    expect(response.status).toBe(200)
    expect(response.body.ersetzt).toBe(false)
  })

  it('meldet Fehler der Datei mit Status und Code', async () => {
    const app = appWith({ repository: repository() })
    const ohneName = await hochladen(app, '/vorschau', { name: null })
    expect(ohneName.status).toBe(400)
    const pdf = await hochladen(app, '/vorschau', { datei: Buffer.from('%PDF-1.4 Beispiel') })
    expect(pdf.status).toBe(415)
    expect(pdf.body.error).toBe('dateityp_nicht_unterstuetzt')
    const brief = await hochladen(app, '/vorschau', { datei: briefDocxBuffer })
    expect(brief.status).toBe(422)
    expect(brief.body.message).toContain('keine Lernziele')
  })
})

describe('POST /api/lehrplaene', () => {
  it('speichert den Lehrplan mit dem gewählten Berufsfeld', async () => {
    const repo = repository()
    const response = await hochladen(appWith({ repository: repo }), '', { berufsfeld: 'Garten- und Landschaftsbau' })
    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ anzahl: 2, ersetzt: false, lehrplan: { berufsfeld: 'Garten- und Landschaftsbau' } })
    expect(repo.fuegeLehrplanHinzu).toHaveBeenCalledTimes(1)
    expect(repo.fuegeLehrplanHinzu.mock.calls[0][0].lernziele).toHaveLength(2)
    expect(repo.ersetzeAlle).not.toHaveBeenCalled()
  })

  it('übernimmt bei leerer Datenbank zuerst die Lehrpläne aus der JSON-Datei', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const ordner = mkdtempSync(join(tmpdir(), 'lehrplaene-'))
    const file = join(ordner, 'lehrplaene.json')
    const lernziel = { id: 7, berufsfeld: 'Metalltechnik & Montage', baustein: 2, ausbildungsbaustein: 'Fügen', abschnitt: 1, titel: 'Bauteile fügen', niveaus: {}, quelle: 'metall.docx' }
    writeFileSync(file, JSON.stringify({ lernziele: [lernziel] }))
    try {
      const repo = repository({ anzahl: 0 })
      const response = await hochladen(appWith({ repository: repo, file }), '')
      expect(response.status).toBe(201)
      expect(repo.ersetzeAlle).toHaveBeenCalledWith([lernziel])
      expect(repo.ersetzeAlle.mock.invocationCallOrder[0]).toBeLessThan(repo.fuegeLehrplanHinzu.mock.invocationCallOrder[0])
    } finally {
      rmSync(ordner, { recursive: true, force: true })
    }
  })

  it('erlaubt das Speichern nur Admins und Dozierenden', async () => {
    const repo = repository()
    const assistenz = await hochladen(appWith({ repository: repo }, { id: 'u3', rolle: 'assistent', name: 'A' }), '')
    expect(assistenz.status).toBe(403)
    expect(repo.fuegeLehrplanHinzu).not.toHaveBeenCalled()
    const dozent = await hochladen(appWith({ repository: repo }, { id: 'u2', rolle: 'dozent', name: 'D' }), '')
    expect(dozent.status).toBe(201)
  })

  it('antwortet ohne Datenbank mit 503', async () => {
    const fehler = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    const response = await hochladen(appWith({ repository: repository({ fehler }) }), '')
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('db_unavailable')
  })
})
