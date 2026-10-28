import { describe, it, expect } from 'vitest'
import { CreateSchema, ListQuerySchema, PatchSchema, isUuid, PRO_SEITE_STANDARD } from '../../src/arbeitsblaetter/schema.js'
import { WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

describe('ListQuerySchema', () => {
  it('liefert ohne Parameter Seite 1 mit 15 Eintraegen, neueste zuerst', () => {
    const parsed = ListQuerySchema.parse({})
    expect(parsed).toMatchObject({ seite: 1, proSeite: PRO_SEITE_STANDARD, sortierung: 'neueste' })
    expect(parsed.status).toBeUndefined()
  })

  it('zerlegt Kommalisten und Mehrfachparameter fuer Stufe, Format und Sprache', () => {
    const parsed = ListQuerySchema.parse({ stufe: 'T, A', format: ['text', 'piktogramm'], sprache: 'Leichte Sprache' })
    expect(parsed.stufe).toEqual(['T', 'A'])
    expect(parsed.format).toEqual(['text', 'piktogramm'])
    expect(parsed.sprache).toEqual(['Leichte Sprache'])
  })

  it('wandelt Zahlen und Booleans aus der Query um', () => {
    const parsed = ListQuerySchema.parse({ seite: '3', proSeite: '20', baustein: '2', favorit: 'true', kiGeneriert: '0' })
    expect(parsed).toMatchObject({ seite: 3, proSeite: 20, baustein: 2, favorit: true, kiGeneriert: false })
  })

  it('ignoriert leere Parameter (?stufe=&baustein=)', () => {
    const parsed = ListQuerySchema.parse({ stufe: '', baustein: '', favorit: '', seite: '' })
    expect(parsed.stufe).toBeUndefined()
    expect(parsed.baustein).toBeUndefined()
    expect(parsed.favorit).toBeUndefined()
    expect(parsed.seite).toBe(1)
  })

  it('lehnt unbekannte Stufen, zu grosse Seiten und Nicht-UUIDs ab', () => {
    expect(ListQuerySchema.safeParse({ stufe: 'X' }).success).toBe(false)
    expect(ListQuerySchema.safeParse({ proSeite: '500' }).success).toBe(false)
    expect(ListQuerySchema.safeParse({ seite: '0' }).success).toBe(false)
    expect(ListQuerySchema.safeParse({ elternId: 'abc' }).success).toBe(false)
    expect(ListQuerySchema.safeParse({ status: 'geloescht' }).success).toBe(false)
  })
})

describe('CreateSchema', () => {
  it('akzeptiert ein Arbeitsblatt mit Meta der Generierung und setzt Defaults', () => {
    const parsed = CreateSchema.parse({ worksheet: WORKSHEET_T_TEXT, meta: { provider: 'gemini', model: 'mock', mocked: true, promptVersion: '1.0.1', extra: 'weg' } })
    expect(parsed.status).toBe('entwurf')
    expect(parsed.favorit).toBe(false)
    expect(parsed.meta).toEqual({ provider: 'gemini', model: 'mock', mocked: true, promptVersion: '1.0.1' })
  })

  it('lehnt ein unvollstaendiges Arbeitsblatt ab', () => {
    const result = CreateSchema.safeParse({ worksheet: { titel: 'nur Titel' } })
    expect(result.success).toBe(false)
  })
})

describe('PatchSchema', () => {
  it('verlangt mindestens worksheet, status oder favorit', () => {
    expect(PatchSchema.safeParse({}).success).toBe(false)
    expect(PatchSchema.safeParse({ notiz: 'nur Notiz' }).success).toBe(false)
    expect(PatchSchema.safeParse({ favorit: true }).success).toBe(true)
    expect(PatchSchema.safeParse({ status: 'freigegeben', notiz: 'geprüft' }).success).toBe(true)
  })

  it('erlaubt als Aktion nur bearbeitet oder KI-angepasst', () => {
    expect(PatchSchema.safeParse({ worksheet: WORKSHEET_T_TEXT, aktion: 'KI-angepasst' }).success).toBe(true)
    expect(PatchSchema.safeParse({ worksheet: WORKSHEET_T_TEXT, aktion: 'erstellt' }).success).toBe(false)
  })
})

describe('isUuid', () => {
  it('erkennt UUIDs und weist anderes zurueck', () => {
    expect(isUuid('6f1b0c2e-9a4d-4c3b-8e2f-1a2b3c4d5e6f')).toBe(true)
    expect(isUuid('123')).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})
