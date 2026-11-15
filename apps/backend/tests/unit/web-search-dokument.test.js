import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { Document, Packer, Paragraph } from 'docx'
import { createApp } from '../../src/app.js'
import { config } from '../../src/config.js'
import { DokumentError, istPrivateAdresse, ladeDokument, pruefeUrl } from '../../src/web-search/dokument.js'

/**
 * FE-35: loading a web search hit as template. No network: DNS lookup,
 * download and AI are replaced through `deps`.
 */

const oeffentlich = async () => [{ address: '93.184.216.34' }]
const antwort = (data, status = 200, headers = {}) => ({ status, data, headers })

async function beispielDocx() {
  const doc = new Document({ sections: [{ children: [new Paragraph('Arbeitsblatt Hygiene'), new Paragraph('Aufgabe 1: Wasche deine Hände.')] }] })
  return Packer.toBuffer(doc)
}

const PDF = Buffer.from('%PDF-1.4\n%Beispiel')

describe('istPrivateAdresse', () => {
  it('erkennt lokale und private Adressen', () => {
    for (const adresse of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.10', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(istPrivateAdresse(adresse), adresse).toBe(true)
    }
  })

  it('lässt öffentliche Adressen zu', () => {
    expect(istPrivateAdresse('93.184.216.34')).toBe(false)
    expect(istPrivateAdresse('2a00:1450:4001::1')).toBe(false)
  })
})

describe('pruefeUrl', () => {
  it('lehnt andere Protokolle, Zugangsdaten und lokale Ziele ab', async () => {
    await expect(pruefeUrl('file:///etc/passwd', oeffentlich)).rejects.toMatchObject({ status: 400 })
    await expect(pruefeUrl('https://nutzer:pw@example.de/a.pdf', oeffentlich)).rejects.toMatchObject({ status: 400 })
    await expect(pruefeUrl('http://127.0.0.1:3000/api', oeffentlich)).rejects.toMatchObject({ code: 'adresse_nicht_erlaubt' })
    await expect(pruefeUrl('http://intern.example/a.pdf', async () => [{ address: '192.168.0.5' }])).rejects.toMatchObject({ code: 'adresse_nicht_erlaubt' })
  })

  it('akzeptiert öffentliche https-Adressen', async () => {
    await expect(pruefeUrl('https://example.de/a.pdf', oeffentlich)).resolves.toBeInstanceOf(URL)
  })
})

describe('ladeDokument', () => {
  const basis = { provider: 'scrape', lookup: oeffentlich }

  it('liest den Text einer Word-Datei', async () => {
    const docx = await beispielDocx()
    const ergebnis = await ladeDokument('https://example.de/hygiene.docx', { ...basis, get: async () => antwort(docx) })
    expect(ergebnis).toMatchObject({ dateityp: 'docx', gekuerzt: false, mocked: false })
    expect(ergebnis.text).toContain('Aufgabe 1: Wasche deine Hände.')
  })

  it('lässt ein PDF von der KI lesen', async () => {
    const ai = vi.fn(async () => ({ text: 'Arbeitsblatt Begleitpapiere\n\nAufgabe 1: Prüfe den Lieferschein.' }))
    const ergebnis = await ladeDokument('https://example.de/blatt.pdf', { ...basis, get: async () => antwort(PDF), ai, aiConfigured: true })
    expect(ergebnis).toMatchObject({ dateityp: 'pdf', text: 'Arbeitsblatt Begleitpapiere\n\nAufgabe 1: Prüfe den Lieferschein.' })
    expect(ai.mock.calls[0][0].files).toEqual([{ mimeType: 'application/pdf', data: PDF.toString('base64') }])
  })

  it('meldet ohne KI-Schlüssel, dass ein PDF nicht gelesen werden kann', async () => {
    await expect(
      ladeDokument('https://example.de/blatt.pdf', { ...basis, get: async () => antwort(PDF), aiConfigured: false }),
    ).rejects.toMatchObject({ status: 422, code: 'pdf_nicht_lesbar' })
  })

  it('lehnt andere Dateitypen ab', async () => {
    await expect(
      ladeDokument('https://example.de/seite.html', { ...basis, get: async () => antwort(Buffer.from('<html></html>')) }),
    ).rejects.toMatchObject({ status: 415 })
  })

  it('prüft auch das Ziel einer Weiterleitung', async () => {
    const get = vi.fn(async () => antwort(Buffer.alloc(0), 302, { location: 'http://10.0.0.1/geheim.pdf' }))
    await expect(ladeDokument('https://example.de/a.pdf', { ...basis, get })).rejects.toMatchObject({ code: 'adresse_nicht_erlaubt' })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('folgt einer erlaubten Weiterleitung', async () => {
    const docx = await beispielDocx()
    const get = vi.fn(async (url) => (url.endsWith('/alt.docx') ? antwort(Buffer.alloc(0), 301, { location: '/neu.docx' }) : antwort(docx)))
    const ergebnis = await ladeDokument('https://example.de/alt.docx', { ...basis, get })
    expect(get.mock.calls.map((c) => c[0])).toEqual(['https://example.de/alt.docx', 'https://example.de/neu.docx'])
    expect(ergebnis.dateityp).toBe('docx')
  })

  it('meldet einen Fehler, wenn die Seite nicht antwortet', async () => {
    const fehler = await ladeDokument('https://example.de/a.pdf', { ...basis, get: async () => antwort(Buffer.alloc(0), 404) }).catch((e) => e)
    expect(fehler).toBeInstanceOf(DokumentError)
    expect(fehler).toMatchObject({ status: 502, code: 'dokument_nicht_erreichbar' })
  })

  it('liefert im Mock-Modus ein simuliertes Dokument', async () => {
    const ergebnis = await ladeDokument('https://www.4teachers.de/material/a.pdf', { provider: 'mock' })
    expect(ergebnis).toMatchObject({ mocked: true, dateityp: 'pdf' })
    expect(ergebnis.text).toContain('Aufgabe 1')
  })
})

describe('POST /api/web-search/dokument', () => {
  const app = createApp()

  it('lehnt eine fehlende Adresse mit 400 ab', async () => {
    const response = await request(app).post('/api/web-search/dokument').send({})
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('validation_error')
  })

  it('liefert im Mock-Modus den Text des Dokuments', async () => {
    const original = config.webSearch.provider
    config.webSearch.provider = 'mock'
    try {
      const response = await request(app).post('/api/web-search/dokument').send({ url: 'https://www.bibb.de/material/a.pdf' })
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({ mocked: true, text: expect.stringContaining('Aufgabe 1') })
    } finally {
      config.webSearch.provider = original
    }
  })

  it('lehnt lokale Adressen mit 400 ab', async () => {
    const original = config.webSearch.provider
    config.webSearch.provider = 'scrape'
    try {
      const response = await request(app).post('/api/web-search/dokument').send({ url: 'http://127.0.0.1:3000/api/benutzer' })
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('adresse_nicht_erlaubt')
    } finally {
      config.webSearch.provider = original
    }
  })
})
