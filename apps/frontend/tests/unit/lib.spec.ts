import { describe, expect, it } from 'vitest'
import { BERUFSBILD_GASTRO, BERUFSBILD_METALL } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import { formatHeaderDate, isoWeek, todayIso } from '@/lib/date'
import { worksheetFileName } from '@/lib/docx'
import { toggleKeepOne, variantenLabel } from '@/lib/selection'
import { EMPTY_FILTER, ausbildungsbausteinOptions, bausteinOptions, filterWorksheets } from '@/lib/worksheetFilter'

describe('toggleKeepOne', () => {
  it('fuegt einen fehlenden Eintrag hinzu', () => {
    expect(toggleKeepOne(['A'], 'B')).toEqual(['A', 'B'])
  })

  it('entfernt einen vorhandenen Eintrag', () => {
    expect(toggleKeepOne(['A', 'B'], 'A')).toEqual(['B'])
  })

  it('laesst den letzten Eintrag stehen', () => {
    expect(toggleKeepOne(['A'], 'A')).toEqual(['A'])
  })
})

describe('variantenLabel', () => {
  it('nutzt Einzahl und Mehrzahl', () => {
    expect(variantenLabel(1)).toBe('1 Variante')
    expect(variantenLabel(4)).toBe('4 Varianten')
  })
})

describe('filterWorksheets', () => {
  it('liefert ohne Filter alle Arbeitsblaetter', () => {
    expect(filterWorksheets(WORKSHEETS, EMPTY_FILTER)).toHaveLength(WORKSHEETS.length)
  })

  it('filtert nach Berufsbild', () => {
    const result = filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, berufsbild: BERUFSBILD_METALL })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((w) => w.berufsbild === BERUFSBILD_METALL)).toBe(true)
  })

  it('sucht ohne Beachtung der Gross-/Kleinschreibung in Titel und Abschnitt', () => {
    const result = filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, search: 'BEGLEITPAPIERE' })
    expect(result.map((w) => w.id)).toContain(1)
  })

  it('kombiniert Baustein und Ausbildungsbaustein', () => {
    // TQ Gastro: Hygiene ist Ausbildungsbaustein 5
    const result = filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, baustein: 5, ausbildungsbaustein: 'Hygiene' })
    expect(result.every((w) => w.baustein === 5 && w.ausbildungsbaustein === 'Hygiene')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('liefert eine leere Liste, wenn nichts passt', () => {
    expect(filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, search: 'gibt es nicht' })).toEqual([])
  })

  it('filtert nach Niveau nur auf die hinterlegten Niveaus', () => {
    const result = filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, niveau: 'T' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((w) => w.niveaus.includes('T'))).toBe(true)
    expect(result.map((w) => w.id)).not.toContain(3)
  })

  it('filtert nach Sprache', () => {
    const result = filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, sprache: 'Leichte Sprache' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((w) => w.sprache === 'Leichte Sprache')).toBe(true)
  })

  it('filtert nach Format', () => {
    const result = filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, format: 'piktogramm-mathefrei' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((w) => w.format === 'piktogramm-mathefrei')).toBe(true)
  })

  it('kombiniert Niveau, Sprache und Format', () => {
    const result = filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, niveau: 'A', sprache: 'Leichte Sprache', format: 'piktogramm' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((w) => w.niveaus.includes('A') && w.sprache === 'Leichte Sprache' && w.format === 'piktogramm')).toBe(true)
    expect(result.map((w) => w.id)).toContain(2)
  })

  it('liefert eine leere Liste bei widerspruechlicher Filterkombination', () => {
    expect(filterWorksheets(WORKSHEETS, { ...EMPTY_FILTER, niveau: 'B', format: 'mathefrei', sprache: 'Leichte Sprache' })).toEqual([])
  })
})

describe('Filteroptionen', () => {
  it('sortiert Bausteine aufsteigend und ohne Duplikate', () => {
    const options = bausteinOptions(WORKSHEETS)
    expect(options).toEqual([...new Set(options)].sort((a, b) => a - b))
  })

  it('schraenkt Ausbildungsbausteine auf das Berufsbild ein', () => {
    expect(ausbildungsbausteinOptions(WORKSHEETS, BERUFSBILD_METALL)).toEqual(['Fügen von Bauteilen zu Baugruppen'])
    expect(ausbildungsbausteinOptions(WORKSHEETS, BERUFSBILD_GASTRO)).toEqual([
      'Grundlagen des Berufsbereichs Küche und Zubereitung',
      'Service',
      'Lager/Warenwirtschaft',
      'Hygiene',
    ])
  })

  it('kennt nur Bausteine, die in den Lehrplaenen vorkommen', () => {
    expect(bausteinOptions(WORKSHEETS)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('Datum', () => {
  it('berechnet die ISO-Kalenderwoche', () => {
    expect(isoWeek(new Date(2026, 9, 22))).toBe(43)
    // 1. Januar 2021 gehoert noch zur KW 53 des Vorjahres
    expect(isoWeek(new Date(2021, 0, 1))).toBe(53)
  })

  it('formatiert die Kopfzeile', () => {
    expect(formatHeaderDate(new Date(2026, 9, 22))).toBe('KW 43 · Donnerstag, 22. Oktober 2026')
  })

  it('liefert das Datum als YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('worksheetFileName', () => {
  it('erzeugt einen unter Windows gueltigen Dateinamen', () => {
    const name = worksheetFileName({ ...WORKSHEETS[0], berufsbild: BERUFSBILD_GASTRO, title: 'Hygiene: Hände/Arme?' })
    expect(name).toBe('Gastronomie_und_Hauswirtschaft_BS1_Hygiene_HändeArme.docx')
  })
})
