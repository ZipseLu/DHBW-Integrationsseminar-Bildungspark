import { describe, it, expect } from 'vitest'
import { escapeLike, toApi, toIso } from '../../src/arbeitsblaetter/repository.js'

describe('toIso', () => {
  it('liest MySQL-DATETIME(3)-Strings als UTC', () => {
    expect(toIso('2026-10-28 09:30:15.123')).toBe('2026-10-28T09:30:15.123Z')
    expect(toIso('2026-10-28 09:30:15')).toBe('2026-10-28T09:30:15.000Z')
  })

  it('laesst null durch und akzeptiert Date-Objekte', () => {
    expect(toIso(null)).toBeNull()
    expect(toIso(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('escapeLike', () => {
  it('entschaerft Platzhalter in Suchbegriffen', () => {
    expect(escapeLike('100%_sicher\\')).toBe('100\\%\\_sicher\\\\')
    expect(escapeLike('Güter entladen')).toBe('Güter entladen')
  })
})

describe('toApi', () => {
  const row = {
    id: 'id-1', titel: 'T', berufsfeld: 'B', baustein: 2, ausbildungsbaustein: 'AB', lernziel: 'L', stufe: 'T', format: 'text',
    sprache: 'Leichte Sprache', status: 'entwurf', ki_generiert: 1, favorit: 0, eltern_id: null, version: '3', erstellt_von: null,
    erstellt_am: '2026-10-28 09:00:00.000', geaendert_am: '2026-10-28 10:00:00.000',
  }

  it('wandelt Spalten in camelCase, Booleans und ISO-Zeiten', () => {
    expect(toApi(row)).toEqual({
      id: 'id-1', titel: 'T', berufsfeld: 'B', baustein: 2, ausbildungsbaustein: 'AB', lernziel: 'L', stufe: 'T', format: 'text',
      sprache: 'Leichte Sprache', status: 'entwurf', kiGeneriert: true, favorit: false, elternId: null, version: 3, erstelltVon: null,
      erstelltAm: '2026-10-28T09:00:00.000Z', geaendertAm: '2026-10-28T10:00:00.000Z',
    })
  })

  it('haengt den Inhalt nur an, wenn er uebergeben wird – auch als JSON-String', () => {
    expect(toApi(row)).not.toHaveProperty('inhalt')
    expect(toApi(row, '{"titel":"X"}').inhalt).toEqual({ titel: 'X' })
    expect(toApi(row, { titel: 'Y' }).inhalt).toEqual({ titel: 'Y' })
  })
})
