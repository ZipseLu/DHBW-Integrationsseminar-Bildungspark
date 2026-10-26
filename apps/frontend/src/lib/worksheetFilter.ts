import { ALLE_BERUFSBILDER } from '@/data/constants'
import type { Format, Level, Sprache, Worksheet } from '@/types'

export type WorksheetFilter = {
  berufsbild: string
  baustein: number | 'Alle'
  ausbildungsbaustein: string
  niveau: Level | 'Alle'
  sprache: Sprache | 'Alle'
  format: Format | 'Alle'
  search: string
}

export const EMPTY_FILTER: WorksheetFilter = {
  berufsbild: ALLE_BERUFSBILDER,
  baustein: 'Alle',
  ausbildungsbaustein: 'Alle',
  niveau: 'Alle',
  sprache: 'Alle',
  format: 'Alle',
  search: '',
}

export function filterWorksheets(worksheets: readonly Worksheet[], filter: WorksheetFilter): Worksheet[] {
  const query = filter.search.trim().toLowerCase()

  return worksheets.filter((w) => {
    const matchBeruf = filter.berufsbild === ALLE_BERUFSBILDER || w.berufsbild === filter.berufsbild
    const matchBaustein = filter.baustein === 'Alle' || w.baustein === filter.baustein
    const matchAb = filter.ausbildungsbaustein === 'Alle' || w.ausbildungsbaustein === filter.ausbildungsbaustein
    const matchNiveau = filter.niveau === 'Alle' || w.niveaus.includes(filter.niveau)
    const matchSprache = filter.sprache === 'Alle' || w.sprache === filter.sprache
    const matchFormat = filter.format === 'Alle' || w.format === filter.format
    const matchSearch =
      query === '' ||
      w.title.toLowerCase().includes(query) ||
      w.ausbildungsbaustein.toLowerCase().includes(query) ||
      w.abschnitt.titel.toLowerCase().includes(query)

    return matchBeruf && matchBaustein && matchAb && matchNiveau && matchSprache && matchFormat && matchSearch
  })
}

/** Alle vorkommenden Bausteinnummern, aufsteigend */
export function bausteinOptions(worksheets: readonly Worksheet[]): number[] {
  return [...new Set(worksheets.map((w) => w.baustein))].sort((a, b) => a - b)
}

/** Ausbildungsbausteine, eingeschraenkt auf das gewaehlte Berufsbild */
export function ausbildungsbausteinOptions(worksheets: readonly Worksheet[], berufsbild: string): string[] {
  const relevant = berufsbild === ALLE_BERUFSBILDER ? worksheets : worksheets.filter((w) => w.berufsbild === berufsbild)
  return [...new Set(relevant.map((w) => w.ausbildungsbaustein))]
}
