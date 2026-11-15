import { describe, it, expect } from 'vitest'
import {
  fold,
  isMatchingWorksheet,
  keywordStems,
  queryNamesWorksheet,
  stem,
} from '../../src/web-search/worksheet-filter.js'

describe('worksheet-filter', () => {
  it('faltet Umlaute und ß', () => {
    expect(fold('Übungsblätter Größe')).toBe('uebungsblaetter groesse')
  })

  it('kürzt deutsche Endungen nur bis zu einem Stamm mit vier Buchstaben', () => {
    expect(stem('werkzeuge')).toBe('werkzeug')
    expect(stem('bruchrechnung')).toBe('bruchrechn')
    expect(stem('haus')).toBe('haus')
  })

  it('ignoriert Operatoren, Füllwörter und Arbeitsblatt-Begriffe bei den Stichwörtern', () => {
    expect(keywordStems('Arbeitsblatt Hygiene in der Küche filetype:pdf -Rezept OR site:example.de')).toEqual([
      'hygien',
      'kuech',
    ])
  })

  it('erkennt Arbeitsblatt-Begriffe im Suchbegriff', () => {
    expect(queryNamesWorksheet('Kopiervorlage Brüche')).toBe(true)
    expect(queryNamesWorksheet('Brüche')).toBe(false)
  })

  it('verlangt ein Arbeitsblatt-Merkmal und alle Stichwörter', () => {
    const stems = keywordStems('Hände waschen')
    expect(isMatchingWorksheet({ title: 'Arbeitsblatt Händewaschen', url: 'https://x.de/a.pdf', snippet: '' }, stems)).toBe(true)
    expect(isMatchingWorksheet({ title: 'Händewaschen – Leitfaden', url: 'https://x.de/a.pdf', snippet: '' }, stems)).toBe(false)
    expect(isMatchingWorksheet({ title: 'Arbeitsblatt Hände', url: 'https://x.de/a.pdf', snippet: '' }, stems)).toBe(false)
  })

  it('findet Merkmal und Stichwörter auch in der URL', () => {
    const stems = keywordStems('Gabelstapler')
    expect(
      isMatchingWorksheet({ title: 'Download', url: 'https://x.de/AB_Gabelstapler%20Arbeitsbl%C3%A4tter.pdf', snippet: '' }, stems),
    ).toBe(true)
  })
})
