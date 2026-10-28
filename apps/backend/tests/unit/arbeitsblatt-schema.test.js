import { describe, it, expect } from 'vitest'
import {
  GenerateRequestSchema,
  LlmWorksheetSchema,
  WORKSHEET_JSON_SCHEMA,
  WorksheetSchema,
  formatZodError,
} from '../../src/arbeitsblatt/schema.js'
import { REQUEST_T_TEXT, WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

describe('WorksheetSchema', () => {
  it('akzeptiert ein gueltiges Arbeitsblatt', () => {
    const result = WorksheetSchema.safeParse(WORKSHEET_T_TEXT)
    expect(result.success).toBe(true)
    expect(result.data.aufgaben).toHaveLength(4)
  })

  it('entfernt Leerzeichen am Rand (trim)', () => {
    const result = WorksheetSchema.safeParse({ ...WORKSHEET_T_TEXT, titel: '  Der LKW ist da  ' })
    expect(result.success).toBe(true)
    expect(result.data.titel).toBe('Der LKW ist da')
  })

  it.each([
    ['falsche Stufe', { stufe: 'X' }],
    ['falsches Format', { format: 'audio' }],
    ['falsche Sprache', { sprache: 'Englisch' }],
    ['leerer Titel', { titel: '' }],
    ['keine Aufgaben', { aufgaben: [] }],
    ['unbekannter Aufgabentyp', { aufgaben: [{ nr: 1, typ: 'quiz', anweisung: 'x' }] }],
    ['Piktogramm ausserhalb der Whitelist', { aufgaben: [{ nr: 1, typ: 'offen', anweisung: 'x', piktogramm: 'einhorn' }] }],
    ['Aufgabe ohne Anweisung', { aufgaben: [{ nr: 1, typ: 'offen' }] }],
    ['Woerterbuch ohne Erklaerung', { woerterbuch: [{ wort: 'LKW' }] }],
  ])('verwirft %s', (_label, patch) => {
    const result = WorksheetSchema.safeParse({ ...WORKSHEET_T_TEXT, ...patch })
    expect(result.success).toBe(false)
  })

  it('verwirft etwas, das kein Objekt ist', () => {
    expect(LlmWorksheetSchema.safeParse('kein json').success).toBe(false)
    expect(LlmWorksheetSchema.safeParse(null).success).toBe(false)
  })
})

describe('GenerateRequestSchema', () => {
  it('akzeptiert eine vollstaendige Anfrage und wandelt baustein in eine Zahl', () => {
    const result = GenerateRequestSchema.safeParse({ ...REQUEST_T_TEXT, lernziel: { ...REQUEST_T_TEXT.lernziel, baustein: '1' } })
    expect(result.success).toBe(true)
    expect(result.data.lernziel.baustein).toBe(1)
  })

  it('erlaubt leere Beispielzellen (kommen in den Lehrplaenen vor)', () => {
    const niveaus = { ...REQUEST_T_TEXT.lernziel.niveaus, A: { kompetenz: 'x' } }
    const result = GenerateRequestSchema.safeParse({ ...REQUEST_T_TEXT, lernziel: { ...REQUEST_T_TEXT.lernziel, niveaus } })
    expect(result.success).toBe(true)
    expect(result.data.lernziel.niveaus.A.beispiel).toBe('')
  })

  it('liefert deutsche, lesbare Fehlermeldungen mit Feldpfad', () => {
    const result = GenerateRequestSchema.safeParse({ stufe: 'Z' })
    expect(result.success).toBe(false)
    const message = formatZodError(result.error)
    expect(message).toContain('stufe:')
    expect(message).toContain('lernziel')
    expect(message).toMatch(/Ungültig/)
  })
})

describe('JSON-Schema fuer Gemini', () => {
  const allowed = new Set([
    '$defs', '$ref', 'type', 'format', 'title', 'description', 'enum', 'items', 'prefixItems', 'minItems', 'maxItems',
    'minimum', 'maximum', 'anyOf', 'oneOf', 'properties', 'additionalProperties', 'required', 'propertyOrdering',
  ])

  function collectKeys(node, keys = new Set()) {
    if (Array.isArray(node)) node.forEach((n) => collectKeys(n, keys))
    else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key !== 'properties' && key !== '$defs') keys.add(key)
        if (key === 'properties' || key === '$defs') Object.values(value).forEach((v) => collectKeys(v, keys))
        else collectKeys(value, keys)
      }
    }
    return keys
  }

  it('enthaelt nur Schluesselwoerter, die Gemini versteht', () => {
    for (const key of collectKeys(WORKSHEET_JSON_SCHEMA)) {
      expect(allowed.has(key), `unerlaubtes Schluesselwort: ${key}`).toBe(true)
    }
  })

  it('verlangt die Pflichtfelder und kennt keine Backend-Felder', () => {
    expect(WORKSHEET_JSON_SCHEMA.required).toEqual(expect.arrayContaining(['titel', 'stufe', 'aufgaben', 'woerterbuch', 'hinweisAnleiter']))
    expect(WORKSHEET_JSON_SCHEMA.properties).not.toHaveProperty('baustein')
    expect(WORKSHEET_JSON_SCHEMA.properties.stufe.enum).toEqual(['T', 'A', 'F', 'B'])
    expect(WORKSHEET_JSON_SCHEMA.propertyOrdering[0]).toBe('titel')
  })
})
