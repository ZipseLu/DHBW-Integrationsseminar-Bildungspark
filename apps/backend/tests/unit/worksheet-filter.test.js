import { describe, it, expect } from 'vitest'
import {
  fold,
  keywordStems,
  queryNamesWorksheet,
  rankWorksheets,
  stem,
  worksheetScore,
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

  it('zählt Stichwörter nur bei Arbeitsblättern', () => {
    const stems = keywordStems('Hände waschen')
    expect(worksheetScore({ title: 'Arbeitsblatt Händewaschen', url: 'https://x.de/a.pdf', snippet: '' }, stems)).toBe(2)
    expect(worksheetScore({ title: 'Arbeitsblatt Hände', url: 'https://x.de/a.pdf', snippet: '' }, stems)).toBe(1)
    expect(worksheetScore({ title: 'Händewaschen – Leitfaden', url: 'https://x.de/a.pdf', snippet: '' }, stems)).toBe(-1)
  })

  it('findet Merkmal und Stichwörter auch in der URL', () => {
    const stems = keywordStems('Gabelstapler')
    expect(
      worksheetScore({ title: 'Download', url: 'https://x.de/AB_Gabelstapler%20Arbeitsbl%C3%A4tter.pdf', snippet: '' }, stems),
    ).toBe(1)
  })

  it('erkennt Arbeitshefte und Lernfeld-Material', () => {
    const hit = (title, snippet = '') => ({ title, url: 'https://x.de/a.pdf', snippet })
    expect(worksheetScore(hit('Arbeitsheft Gut - Güter - Logistik'), [])).toBe(0)
    expect(worksheetScore(hit('Fachkraft für Lagerlogistik - LF01: Güter annehmen'), [])).toBe(0)
    expect(worksheetScore(hit('Checkliste Gefahrguttransport', 'Begleitpapiere: Beförderungspapier'), [])).toBe(-1)
  })

  it('sortiert Treffer mit mehr Stichwörtern nach vorne und verwirft Nicht-Arbeitsblätter', () => {
    const stems = keywordStems('Begleitpapiere prüfen Wareneingang')
    const hit = (title) => ({ title, url: 'https://x.de/a.pdf', snippet: '' })
    const ranked = rankWorksheets(
      [
        hit('Arbeitsblatt Lieferschein Wareneingang'),
        hit('Arbeitsblatt: Begleitpapiere im Wareneingang prüfen'),
        hit('Begleitpapiere prüfen Wareneingang – Verordnung'),
        hit('Arbeitsblatt Begleitpapiere Wareneingang'),
      ],
      stems,
    )
    expect(ranked.map((r) => r.title)).toEqual([
      'Arbeitsblatt: Begleitpapiere im Wareneingang prüfen',
      'Arbeitsblatt Begleitpapiere Wareneingang',
      'Arbeitsblatt Lieferschein Wareneingang',
    ])
  })
})
