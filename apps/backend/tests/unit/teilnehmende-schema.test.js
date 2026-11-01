import { describe, it, expect } from 'vitest'
import { CreateSchema, UpdateSchema, istKennung, normalisiereKennung } from '../../src/teilnehmende/schema.js'
import { gesamtFortschritt, stationToApi, toApi } from '../../src/teilnehmende/repository.js'
import { BEISPIEL_TEILNEHMENDE } from '../../src/teilnehmende/seed.js'

const LAGER = 'Lagerlogistik, Handel & Versand'
const GASTRO = 'Gastronomie & Hauswirtschaft'
const station = (teil = {}) => ({ berufsfeld: LAGER, stufe: 'A', format: 'text', ...teil })

describe('Kennung', () => {
  it('akzeptiert pseudonyme Kennungen und wandelt in Großbuchstaben um', () => {
    expect(istKennung('IW3-4421')).toBe(true)
    expect(istKennung(' iw3-4421 ')).toBe(true)
    expect(normalisiereKennung(' iw3-4421 ')).toBe('IW3-4421')
  })

  it('lehnt Namen und freie Texte ab', () => {
    expect(istKennung('Max Mustermann')).toBe(false)
    expect(istKennung('IW3-')).toBe(false)
    expect(istKennung('IW3-4421; DROP TABLE')).toBe(false)
  })
})

describe('CreateSchema', () => {
  it('setzt Standardwerte für eine Station', () => {
    const parsed = CreateSchema.parse({ kennung: 'iw3-9999', stufe: 'T', stationen: [station()] })
    expect(parsed).toEqual({
      kennung: 'IW3-9999',
      stufe: 'T',
      stationen: [{ berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'ausstehend', fortschritt: 0, startDatum: null, endDatum: null, blaetterErledigt: 0 }],
    })
  })

  it('erlaubt ein Profil ohne Lernweg', () => {
    expect(CreateSchema.parse({ kennung: 'IW3-1', stufe: 'B' }).stationen).toEqual([])
  })

  it('lehnt zusätzliche Felder wie Namen ab (§ 60 SGB IX)', () => {
    const result = CreateSchema.safeParse({ kennung: 'IW3-9999', stufe: 'T', name: 'Max' })
    expect(result.success).toBe(false)
  })

  it('lehnt zusätzliche Felder in einer Station ab', () => {
    expect(CreateSchema.safeParse({ kennung: 'IW3-9999', stufe: 'T', stationen: [station({ diagnose: 'x' })] }).success).toBe(false)
  })

  it('lehnt doppelte Berufsfelder ab', () => {
    const result = CreateSchema.safeParse({ kennung: 'IW3-9999', stufe: 'T', stationen: [station(), station({ berufsfeld: LAGER.toUpperCase() })] })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('doppelt')
  })

  it('erlaubt höchstens eine aktive Station', () => {
    const result = CreateSchema.safeParse({ kennung: 'IW3-9999', stufe: 'T', stationen: [station({ status: 'aktiv' }), station({ berufsfeld: GASTRO, status: 'aktiv' })] })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('höchstens eine Station')
  })

  it('prüft Datum, Reihenfolge und Fortschritt', () => {
    expect(CreateSchema.safeParse({ kennung: 'IW3-1', stufe: 'T', stationen: [station({ startDatum: '2026-02-30' })] }).success).toBe(false)
    expect(CreateSchema.safeParse({ kennung: 'IW3-1', stufe: 'T', stationen: [station({ startDatum: '2026-09-01', endDatum: '2026-08-01' })] }).success).toBe(false)
    expect(CreateSchema.safeParse({ kennung: 'IW3-1', stufe: 'T', stationen: [station({ fortschritt: 101 })] }).success).toBe(false)
    expect(CreateSchema.parse({ kennung: 'IW3-1', stufe: 'T', stationen: [station({ startDatum: '' })] }).stationen[0].startDatum).toBeNull()
  })

  it('lehnt unbekannte Stufen, Formate und Status ab', () => {
    expect(CreateSchema.safeParse({ kennung: 'IW3-1', stufe: 'X' }).success).toBe(false)
    expect(CreateSchema.safeParse({ kennung: 'IW3-1', stufe: 'T', stationen: [station({ format: 'bunt' })] }).success).toBe(false)
    expect(CreateSchema.safeParse({ kennung: 'IW3-1', stufe: 'T', stationen: [station({ status: 'pausiert' })] }).success).toBe(false)
  })

  it('akzeptiert alle Beispiel-Teilnehmenden aus dem Seed', () => {
    for (const profil of BEISPIEL_TEILNEHMENDE) expect(CreateSchema.safeParse(profil).success).toBe(true)
  })
})

describe('UpdateSchema', () => {
  it('braucht keine Kennung im Body', () => {
    expect(UpdateSchema.parse({ stufe: 'F', stationen: [] })).toEqual({ stufe: 'F', stationen: [] })
  })
})

describe('Umwandlung für die API', () => {
  const zeile = (teil) => ({
    kennung: 'IW3-4421', position: 0, berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'aktiv', fortschritt: '68',
    start_datum: '2026-07-13', end_datum: null, blaetter_erledigt: '3', ...teil,
  })

  it('wandelt Spalten in camelCase und Zahlen', () => {
    expect(stationToApi(zeile())).toEqual({
      berufsfeld: LAGER, stufe: 'A', format: 'text', status: 'aktiv', fortschritt: 68, startDatum: '2026-07-13', endDatum: null, blaetterErledigt: 3,
    })
  })

  it('sortiert Stationen nach Position und berechnet Fortschritt und letzte Aktivität', () => {
    const profil = toApi(
      { kennung: 'IW3-4421', stufe: 'A', erstellt_am: '2026-10-01 08:00:00.000', geaendert_am: '2026-10-21 09:30:00.000' },
      [zeile({ position: 1 }), zeile({ position: 0, berufsfeld: GASTRO, status: 'abgeschlossen', fortschritt: 100 })],
    )
    expect(profil.stationen.map((s) => s.berufsfeld)).toEqual([GASTRO, LAGER])
    expect(profil).toMatchObject({ kennung: 'IW3-4421', stufe: 'A', fortschritt: 68, zuletztAktiv: '2026-10-21', geaendertAm: '2026-10-21T09:30:00.000Z' })
  })

  it('Gesamtfortschritt ohne aktive Station', () => {
    expect(gesamtFortschritt([])).toBe(0)
    expect(gesamtFortschritt([{ status: 'abgeschlossen', fortschritt: 100 }, { status: 'abgeschlossen', fortschritt: 100 }])).toBe(100)
    expect(gesamtFortschritt([{ status: 'abgeschlossen', fortschritt: 100 }, { status: 'ausstehend', fortschritt: 0 }])).toBe(0)
  })
})
