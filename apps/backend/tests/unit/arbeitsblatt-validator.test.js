import { describe, it, expect } from 'vitest'
import { countWords, splitSentences, validateWorksheet } from '../../src/arbeitsblatt/validator.js'
import { WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

const aufgabe = (nr, patch = {}) => ({ nr, typ: 'offen', anweisung: 'Schreibe es auf.', ...patch })

function worksheet(patch = {}) {
  return { ...WORKSHEET_T_TEXT, ...patch }
}

describe('Textwerkzeuge', () => {
  it('zaehlt Bindestrich-Woerter als ein Wort', () => {
    expect(countWords('Die Ver-packung schützt die Ware.')).toBe(5)
    expect(countWords('')).toBe(0)
  })

  it('trennt Saetze an . ! ? und Zeilenumbruch', () => {
    expect(splitSentences('Erster Satz. Zweiter Satz! Dritter?\nVierter')).toHaveLength(4)
  })
})

describe('validateWorksheet', () => {
  it('meldet fuer ein gutes Arbeitsblatt keine Hinweise', () => {
    expect(validateWorksheet(WORKSHEET_T_TEXT)).toEqual({ ok: true, hinweise: [] })
  })

  it.each([
    ['T', 2, true],
    ['T', 4, false],
    ['T', 5, true],
    ['A', 4, false],
    ['A', 6, true],
    ['F', 5, false],
    ['F', 7, true],
    ['B', 6, false],
    ['B', 9, true],
  ])('Aufgabenanzahl Stufe %s mit %i Aufgaben -> Hinweis: %s', (stufe, anzahl, erwartetHinweis) => {
    const aufgaben = Array.from({ length: anzahl }, (_, i) => aufgabe(i + 1))
    const { hinweise } = validateWorksheet(worksheet({ stufe, aufgaben }))
    expect(hinweise.some((h) => h.startsWith('Aufgabenanzahl'))).toBe(erwartetHinweis)
  })

  it.each([
    ['T', 12, false],
    ['T', 13, true],
    ['A', 15, false],
    ['A', 16, true],
    ['F', 20, false],
    ['F', 21, true],
    ['B', 30, false],
  ])('Satzlaenge Stufe %s mit %i Woertern -> Hinweis: %s', (stufe, woerter, erwartetHinweis) => {
    const satz = Array.from({ length: woerter }, (_, i) => `Wort${i}`).join(' ') + '.'
    const { hinweise } = validateWorksheet(worksheet({ stufe, einleitung: satz, aufgaben: WORKSHEET_T_TEXT.aufgaben.slice(0, stufe === 'B' ? 4 : 4).concat(stufe === 'B' ? [aufgabe(5), aufgabe(6)] : stufe === 'F' ? [aufgabe(5)] : []) }))
    expect(hinweise.some((h) => h.includes('Satz mit'))).toBe(erwartetHinweis)
  })

  it('misst Optionen einzeln und trennt Zuordnen-Paare an "|"', () => {
    const paare = ['LKW | Ein großes Auto für schwere Waren', 'Ent-laden | Ware aus dem LKW holen', 'Anleiter | Dein Chef oder Ausbilder']
    const { hinweise } = validateWorksheet(worksheet({ aufgaben: [aufgabe(1, { typ: 'zuordnen', optionen: paare }), aufgabe(2), aufgabe(3)] }))
    expect(hinweise).toEqual([])
    const zuLang = ['Eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn.', 'kurz']
    const { hinweise: optionHinweise } = validateWorksheet(worksheet({ aufgaben: [aufgabe(1, { typ: 'ankreuzen', optionen: zuLang }), aufgabe(2), aufgabe(3)] }))
    expect(optionHinweise).toHaveLength(1)
    expect(optionHinweise[0]).toContain('Aufgabe 1 (Option): Satz mit 13 Wörtern, Stufe T erlaubt höchstens 12')
  })

  it('prueft die Satzlaenge auch in Aufgaben, Optionen und Woerterbuch, aber nicht im Anleiter-Hinweis', () => {
    const lang = 'Dieser Satz hat ganz bewusst deutlich mehr als zwölf Wörter und ist deshalb zu lang.'
    expect(validateWorksheet(worksheet({ aufgaben: [aufgabe(1, { anweisung: lang }), aufgabe(2), aufgabe(3)] })).hinweise.join()).toContain('Aufgabe 1')
    expect(validateWorksheet(worksheet({ aufgaben: [aufgabe(1, { optionen: [lang] }), aufgabe(2), aufgabe(3)] })).hinweise.join()).toContain('Aufgabe 1')
    expect(validateWorksheet(worksheet({ woerterbuch: [{ wort: 'LKW', erklaerung: lang }] })).hinweise.join()).toContain('Wörterbuch')
    expect(validateWorksheet(worksheet({ hinweisAnleiter: lang })).hinweise).toEqual([])
  })

  describe('Format "Ohne Rechnen" (mathefrei)', () => {
    it.each([
      ['Zahl groesser 3', 'Zähle 12 Kartons.', true],
      ['Zahlen bis 3 sind erlaubt', 'Schreibe 1, 2 und 3 in die Kästchen.', false],
      ['Rechenzeichen', 'Was ist 2 + 1?', true],
      ['Prozentzeichen', 'Fülle den Karton zu 50 %.', true],
      ['Bindestrich-Trennung ist kein Minus', 'Die Ver-packung schützt.', false],
      ['Rechenwort berechne', 'Berechne die Anzahl.', true],
      ['Rechenwort Prozent', 'Wie viel Prozent sind kaputt?', true],
      ['Rechenwort addiere', 'Addiere die Kartons.', true],
      ['Wort enthaelt Rechenwort nur als Teil', 'Das ist ein Minusgeschäft.', false],
    ])('%s: "%s" -> Hinweis: %s', (_label, text, erwartetHinweis) => {
      const { hinweise } = validateWorksheet(worksheet({ format: 'mathefrei', einleitung: text }))
      expect(hinweise.some((h) => h.includes('Ohne Rechnen'))).toBe(erwartetHinweis)
    })

    it('gilt auch fuer piktogramm-mathefrei, nicht fuer text', () => {
      const text = 'Zähle 12 Kartons.'
      expect(validateWorksheet(worksheet({ format: 'text', einleitung: text })).hinweise).toEqual([])
      expect(validateWorksheet(worksheet({ format: 'piktogramm-mathefrei', einleitung: text })).hinweise.join()).toContain('Ohne Rechnen')
    })
  })

  describe('Piktogramm-Format', () => {
    const pikto = (nr, patch) => aufgabe(nr, { piktogramm: 'denken', ...patch })

    it('verlangt einen Piktogramm-Schluessel je Aufgabe', () => {
      const { hinweise } = validateWorksheet(worksheet({ format: 'piktogramm', aufgaben: [pikto(1), aufgabe(2), pikto(3)] }))
      expect(hinweise).toEqual(['Aufgabe 2: Piktogramm-Format, aber kein Piktogramm-Schlüssel gesetzt.'])
    })

    it('begrenzt die Anweisung auf 8 Woerter', () => {
      const { hinweise } = validateWorksheet(
        worksheet({ format: 'piktogramm', aufgaben: [pikto(1, { anweisung: 'Eins zwei drei vier fünf sechs sieben acht.' }), pikto(2, { anweisung: 'Eins zwei drei vier fünf sechs sieben acht neun.' }), pikto(3)] }),
      )
      expect(hinweise).toEqual(['Aufgabe 2: Anweisung hat 9 Wörter, Piktogramm-Format erlaubt höchstens 8.'])
    })

    it('stellt im Format text keine Piktogramm-Anforderungen', () => {
      expect(validateWorksheet(worksheet({ format: 'text' })).hinweise).toEqual([])
    })
  })

  describe('Verbotsliste', () => {
    it.each([
      ['Einleitung', { einleitung: 'Die Behinderten tragen die Kisten.' }],
      ['Titel', { titel: 'Sei brav im Lager' }],
      ['Anleiter-Hinweis', { hinweisAnleiter: 'Die Teilnehmer sind etwas dumm.' }],
      ['Option', { aufgaben: [aufgabe(1, { optionen: ['Ich bin artig.'] }), aufgabe(2), aufgabe(3)] }],
    ])('findet Begriffe in %s', (_ort, patch) => {
      const { ok, hinweise } = validateWorksheet(worksheet(patch))
      expect(ok).toBe(false)
      expect(hinweise.some((h) => h.includes('Verbotsliste'))).toBe(true)
    })

    it('schlaegt bei "Menschen mit Behinderung" nicht an', () => {
      expect(validateWorksheet(worksheet({ einleitung: 'Hier lernen Menschen mit Behinderung.' })).hinweise).toEqual([])
    })
  })
})
