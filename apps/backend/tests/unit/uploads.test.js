import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx'
import { createApp } from '../../src/app.js'
import { bestimmeDateityp, DateitypError, endungVon, istText, typAusInhalt } from '../../src/uploads/dateityp.js'
import { toApi } from '../../src/uploads/repository.js'
import { dateinameAusHeader, ListQuerySchema, PatchSchema, TextUploadSchema, UploadQuerySchema } from '../../src/uploads/schema.js'
import { docxText, leseText, MAX_TEXT_ZEICHEN, normalisiereText } from '../../src/uploads/text.js'

/**
 * Upload of worksheets – file type detection, text extraction, schemas and the
 * checks the routes do before touching the database (no MySQL needed).
 */

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF')
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16])
const DOC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])

/** A real .docx with two paragraphs, an empty paragraph and a table */
async function beispielDocx() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('Lieferschein prüfen'), new TextRun({ text: ' – Aufgabe 1', bold: true })] }),
          new Paragraph({}),
          new Paragraph('Vergleiche Menge & Artikel.'),
          new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph('Zelle A')] }), new TableCell({ children: [new Paragraph('Zelle B')] })] })] }),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

describe('Dateityp', () => {
  it('erkennt Typen am Inhalt', async () => {
    expect(typAusInhalt(PDF)).toBe('pdf')
    expect(typAusInhalt(PNG)).toBe('png')
    expect(typAusInhalt(JPG)).toBe('jpg')
    expect(typAusInhalt(DOC)).toBe('doc')
    expect(typAusInhalt(await beispielDocx())).toBe('docx')
    expect(typAusInhalt(Buffer.from('hallo'))).toBeNull()
  })

  it('erkennt Text an gültigem UTF-8 ohne Steuerzeichen', () => {
    expect(istText(Buffer.from('Grüße\n\tZeile 2\r\n'))).toBe(true)
    expect(istText(PNG)).toBe(false)
    expect(istText(Buffer.from([0x48, 0xc3]))).toBe(false) // cut-off UTF-8 sequence
  })

  it('verlangt, dass Endung und Inhalt zusammenpassen', async () => {
    expect(bestimmeDateityp('Blatt.PDF', PDF)).toBe('pdf')
    expect(bestimmeDateityp('foto.jpeg', JPG)).toBe('jpg')
    expect(bestimmeDateityp('notiz.md', Buffer.from('# Titel'))).toBe('md')
    expect(bestimmeDateityp('Blatt.docx', await beispielDocx())).toBe('docx')

    expect(() => bestimmeDateityp('bild.png', PDF)).toThrow(DateitypError)
    expect(() => bestimmeDateityp('text.txt', PNG)).toThrow(/passt nicht zur Endung/)
    try {
      bestimmeDateityp('programm.exe', Buffer.from('MZ'))
    } catch (error) {
      expect(error).toMatchObject({ code: 'dateityp_nicht_erlaubt', status: 415 })
    }
  })

  it('liest die Endung ohne Punkt-Dateien zu verwechseln', () => {
    expect(endungVon('a.b.DOCX')).toBe('.docx')
    expect(endungVon('.bashrc')).toBe('')
    expect(endungVon('ohne')).toBe('')
  })
})

describe('Text auslesen', () => {
  it('liest Absätze und Tabellen aus Word-Dateien', async () => {
    const text = docxText(await beispielDocx())
    expect(text.split('\n')).toEqual(['Lieferschein prüfen – Aufgabe 1', '', 'Vergleiche Menge & Artikel.', 'Zelle A', 'Zelle B'])
  })

  it('liest Text- und Markdown-Dateien und normalisiert Zeilen', () => {
    expect(leseText('txt', Buffer.from('\uFEFFZeile 1  \r\n\r\n\r\n\r\nZeile 2\n'))).toEqual({ text: 'Zeile 1\n\nZeile 2', gekuerzt: false, hinweis: null })
    expect(normalisiereText('  a\rb  ')).toBe('a\nb')
  })

  it('speichert PDF und Bilder ohne Text, mit Hinweis', () => {
    const ergebnis = leseText('pdf', PDF)
    expect(ergebnis.text).toBeNull()
    expect(ergebnis.hinweis).toContain('kein Text')
  })

  it('meldet kaputte Word-Dateien und leere Dateien als Hinweis statt Fehler', () => {
    expect(leseText('docx', Buffer.from('PK\u0003\u0004word/document.xml kaputt')).hinweis).toContain('konnte nicht gelesen werden')
    expect(leseText('txt', Buffer.from('   \n  ')).hinweis).toContain('keinen lesbaren Text')
  })

  it('kürzt sehr lange Texte', () => {
    const ergebnis = leseText('txt', Buffer.from('x'.repeat(MAX_TEXT_ZEICHEN + 10)))
    expect(ergebnis.text).toHaveLength(MAX_TEXT_ZEICHEN)
    expect(ergebnis.gekuerzt).toBe(true)
  })
})

describe('Schemas', () => {
  it('liest den Dateinamen aus dem Header und entfernt Pfade', () => {
    expect(dateinameAusHeader(encodeURIComponent('Übung Gabelstapler.docx'))).toBe('Übung Gabelstapler.docx')
    expect(dateinameAusHeader(encodeURIComponent('C:\\Users\\x\\blatt.pdf'))).toBe('blatt.pdf')
    expect(dateinameAusHeader(encodeURIComponent('../../etc/passwd'))).toBe('passwd')
    expect(dateinameAusHeader('%E0%A4%A')).toBeNull()
    expect(dateinameAusHeader(undefined)).toBeNull()
  })

  it('behandelt leere Formularfelder als nicht angegeben', () => {
    expect(UploadQuerySchema.parse({ berufsfeld: '', thema: ' Gabelstapler ' })).toEqual({ thema: 'Gabelstapler' })
    expect(UploadQuerySchema.safeParse({ unbekannt: 'x' }).success).toBe(false)
    expect(ListQuerySchema.parse({ q: '' })).toEqual({})
  })

  it('prüft eingefügten Text und Änderungen', () => {
    expect(TextUploadSchema.safeParse({ text: '   ' }).success).toBe(false)
    expect(TextUploadSchema.parse({ text: ' Hallo ', titel: 'Notiz' })).toEqual({ text: 'Hallo', titel: 'Notiz' })
    expect(PatchSchema.safeParse({}).success).toBe(false)
    expect(PatchSchema.parse({ thema: '' })).toEqual({ thema: null })
    expect(PatchSchema.parse({ text: null })).toEqual({ text: null })
  })
})

describe('Umwandlung für die API', () => {
  it('wandelt Spalten in camelCase und Zahlen', () => {
    const upload = toApi(
      {
        id: 'u1', dateiname: 'a.pdf', dateityp: 'pdf', groesse: '1234', hat_datei: 1, text_quelle: null, text_laenge: null, text_vorschau: null,
        berufsfeld: null, thema: 'Lager', hochgeladen_von: 'C. Hager', hochgeladen_am: '2026-11-04 08:00:00.000', geaendert_am: '2026-11-04 08:00:00.000', text: 'x',
      },
      { mitText: true },
    )
    expect(upload).toMatchObject({ groesse: 1234, hatDatei: true, textLaenge: 0, thema: 'Lager', hochgeladenAm: '2026-11-04T08:00:00.000Z', text: 'x' })
  })
})

describe('Upload-Routen: Prüfungen vor der Datenbank', () => {
  const app = createApp()

  it('lehnt Dateien ohne Dateinamen ab', async () => {
    const response = await request(app).post('/api/uploads').set('Content-Type', 'application/pdf').send(PDF)
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('dateiname_fehlt')
  })

  it('lehnt leere Dateien ab', async () => {
    const response = await request(app).post('/api/uploads').set('X-Dateiname', 'leer.pdf').set('Content-Type', 'application/pdf').send(Buffer.alloc(0))
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('datei_leer')
  })

  it('lehnt nicht erlaubte und umbenannte Dateien mit 415 ab', async () => {
    const exe = await request(app).post('/api/uploads').set('X-Dateiname', 'virus.exe').set('Content-Type', 'application/octet-stream').send(Buffer.from('MZ....'))
    expect(exe.status).toBe(415)
    expect(exe.body.code).toBe('dateityp_nicht_erlaubt')

    const falsch = await request(app).post('/api/uploads').set('X-Dateiname', 'bild.png').set('Content-Type', 'image/png').send(PDF)
    expect(falsch.status).toBe(415)
    expect(falsch.body.code).toBe('inhalt_passt_nicht')
  })

  it('lehnt Dateien über 20 MB mit 413 ab', async () => {
    const gross = Buffer.alloc(20 * 1024 * 1024 + 1, 0x20)
    const response = await request(app).post('/api/uploads').set('X-Dateiname', 'gross.txt').set('Content-Type', 'text/plain').send(gross)
    expect(response.status).toBe(413)
    expect(response.body.code).toBe('datei_zu_gross')
  })

  it('prüft eingefügten Text und unbekannte Felder', async () => {
    const leer = await request(app).post('/api/uploads').send({ text: '' })
    expect(leer.status).toBe(400)
    expect((await request(app).post('/api/uploads').send({ text: 'x', name: 'Max' })).status).toBe(400)
  })

  it('antwortet für ungültige IDs mit 404', async () => {
    expect((await request(app).get('/api/uploads/keine-uuid')).status).toBe(404)
    expect((await request(app).get('/api/uploads/keine-uuid/datei')).body.code).toBe('upload_unbekannt')
  })
})
