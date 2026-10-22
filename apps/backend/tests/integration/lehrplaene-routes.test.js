import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLehrplaeneRouter } from '../../src/routes/lehrplaene.js'
import { createApp } from '../../src/app.js'

function appWith(file) {
  const app = express()
  app.use('/api/lehrplaene', createLehrplaeneRouter({ file }))
  return app
}

describe('GET /api/lehrplaene', () => {
  let dir

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'lehrplaene-'))
    writeFileSync(
      join(dir, 'ok.json'),
      JSON.stringify({
        stand: '2026-10-22',
        quelle: 'test',
        lernziele: [{ id: 1, berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, ausbildungsbaustein: 'Wareneingang', titel: 'Güter entladen', niveaus: {} }],
      }),
    )
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('liefert die importierten Lernziele', async () => {
    const response = await request(appWith(join(dir, 'ok.json'))).get('/api/lehrplaene')
    expect(response.status).toBe(200)
    expect(response.body.anzahl).toBe(1)
    expect(response.body.lernziele[0].titel).toBe('Güter entladen')
    expect(response.body.stand).toBe('2026-10-22')
  })

  it('antwortet ohne Datei mit leerer Liste und Hinweis statt mit Fehler', async () => {
    const response = await request(appWith(join(dir, 'fehlt.json'))).get('/api/lehrplaene')
    expect(response.status).toBe(200)
    expect(response.body.lernziele).toEqual([])
    expect(response.body.hinweis).toContain('import:lehrplaene')
  })

  it('ist in der App eingehaengt', async () => {
    const response = await request(createApp()).get('/api/lehrplaene')
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.lernziele)).toBe(true)
  })
})
