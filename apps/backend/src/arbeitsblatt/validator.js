/**
 * Heuristik-Validator (Konzept AP4, Kapitel 7.5).
 *
 * Begriff: Ein "Validator" prueft ein Ergebnis nach festen Regeln. Dieser hier
 * ist deterministisch (gleiche Eingabe -> gleiche Hinweise) und arbeitet ohne
 * KI. Er blockiert nichts: Verstoesse werden als Hinweise an die Lehrkraft
 * zurueckgegeben, die das Blatt vor der Freigabe ohnehin prueft.
 *
 * Regeln:
 *   - Satzlaenge je Stufe (T <= 12 Woerter, A <= 15, F <= 20, B frei)
 *   - Aufgabenanzahl je Stufe (T 3-4, A 4-5, F 5-6, B 6-8)
 *   - mathefrei: keine Zahlen > 3, keine Rechenzeichen, keine Rechenwoerter
 *   - piktogramm: Schluessel vorhanden, Anweisung <= 8 Woerter
 *   - Verbotsliste: verniedlichende oder diskriminierende Begriffe
 */
import { AUFGABEN_ANZAHL } from './schema.js'

export const SATZLAENGE_MAX = { T: 12, A: 15, F: 20, B: null }
export const PIKTOGRAMM_ANWEISUNG_MAX_WOERTER = 8
export const MATHEFREI_MAX_ZAHL = 3

/**
 * Verbotsliste – klein geschrieben, ganze Woerter oder Wortfolgen.
 * Erweiterbar; fachliche Abstimmung mit dem Bildungspark steht aus.
 */
export const VERBOTENE_BEGRIFFE = [
  // diskriminierend / veraltet
  'behinderte', 'behinderter', 'behinderten', 'invalide', 'invaliden', 'krüppel',
  'idiot', 'idioten', 'idiotisch', 'depp', 'deppen', 'spasti', 'spast', 'mongo', 'mongoloid',
  'schwachsinn', 'schwachsinnig', 'geisteskrank', 'zurückgeblieben', 'dumm', 'dumme', 'dummen',
  'blöd', 'blöde', 'blöden',
  // verniedlichend
  'brav', 'artig', 'schätzchen', 'kindchen', 'kleiner mann', 'kleine maus', 'ihr lieben', 'ihr kinder',
]

/** Woerter, die auf Rechenaufgaben hindeuten (Format mathefrei) */
export const MATHE_WOERTER = [
  'berechne', 'berechnen', 'berechnet', 'rechne', 'rechnen', 'rechnet', 'addiere', 'addieren',
  'subtrahiere', 'subtrahieren', 'multipliziere', 'multiplizieren', 'dividiere', 'dividieren',
  'prozent', 'summe', 'differenz', 'plus', 'minus', 'geteilt durch', 'mal nehmen', 'bruch',
  'hälfte', 'drittel', 'viertel', 'dezimal', 'kommazahl',
]

const wordBoundary = (words) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu')

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const VERBOTEN_RE = wordBoundary(VERBOTENE_BEGRIFFE)
const MATHE_WOERTER_RE = wordBoundary(MATHE_WOERTER)
const ZAHL_RE = /\d+(?:[.,]\d+)?/g
// Rechenzeichen: + × ÷ = % immer; - * / : nur zwischen zwei Zahlen (Bindestrich-Trennung bleibt erlaubt)
const RECHENZEICHEN_RE = /[+×÷=%]|\d\s*[-*/:]\s*\d/

/** Zerlegt einen Text in Saetze (an . ! ? mit folgendem Leerzeichen oder Zeilenende). */
export function splitSentences(text) {
  return String(text ?? '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Zaehlt Woerter (Bindestrich-Woerter wie "Ver-packung" zaehlen als ein Wort). */
export function countWords(text) {
  return String(text ?? '')
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length
}

const kurz = (text, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

function allMatches(regex, text) {
  regex.lastIndex = 0
  return [...String(text).matchAll(regex)].map((m) => m[0])
}

/**
 * @param {object} worksheet  Arbeitsblatt (WorksheetSchema)
 * @returns {{ ok: boolean, hinweise: string[] }}
 */
export function validateWorksheet(worksheet) {
  const hinweise = []
  const { stufe, format } = worksheet
  const aufgaben = worksheet.aufgaben ?? []
  const woerterbuch = worksheet.woerterbuch ?? []
  const istMathefrei = format === 'mathefrei' || format === 'piktogramm-mathefrei'
  const istPiktogramm = format === 'piktogramm' || format === 'piktogramm-mathefrei'

  // 1. Aufgabenanzahl
  const range = AUFGABEN_ANZAHL[stufe]
  if (range) {
    const [min, max] = range
    if (aufgaben.length < min || aufgaben.length > max) {
      hinweise.push(`Aufgabenanzahl: ${aufgaben.length} Aufgaben, für Stufe ${stufe} sind ${min} bis ${max} vorgesehen.`)
    }
  }

  // Texte, die Teilnehmende lesen (Hinweis fuer den Anleiter zaehlt nicht)
  // Jede Option zaehlt als eigener Text; Zuordnen-Paare "links | rechts" werden getrennt gemessen
  const lesetexte = [
    { ort: 'Einleitung', text: worksheet.einleitung ?? '' },
    ...aufgaben.flatMap((a) => [
      { ort: `Aufgabe ${a.nr}`, text: a.anweisung ?? '' },
      ...(a.optionen ?? [])
        .flatMap((option) => (a.typ === 'zuordnen' ? option.split('|') : [option]))
        .map((text) => ({ ort: `Aufgabe ${a.nr} (Option)`, text: text.trim() })),
    ]),
    ...woerterbuch.map((w) => ({ ort: `Wörterbuch „${w.wort}“`, text: w.erklaerung ?? '' })),
  ]

  // 2. Satzlaenge je Stufe
  const maxWoerter = SATZLAENGE_MAX[stufe]
  if (maxWoerter) {
    for (const { ort, text } of lesetexte) {
      for (const satz of splitSentences(text)) {
        const n = countWords(satz)
        if (n > maxWoerter) {
          hinweise.push(`${ort}: Satz mit ${n} Wörtern, Stufe ${stufe} erlaubt höchstens ${maxWoerter}: „${kurz(satz)}“`)
        }
      }
    }
  }

  // 3. mathefrei
  if (istMathefrei) {
    for (const { ort, text } of lesetexte) {
      const zahlen = allMatches(ZAHL_RE, text).filter((z) => Number.parseFloat(z.replace(',', '.')) > MATHEFREI_MAX_ZAHL)
      if (zahlen.length) hinweise.push(`${ort}: Format „Ohne Rechnen“, aber Zahl größer als ${MATHEFREI_MAX_ZAHL}: ${zahlen.join(', ')}`)
      if (RECHENZEICHEN_RE.test(text)) hinweise.push(`${ort}: Format „Ohne Rechnen“, aber Rechenzeichen gefunden.`)
      const woerter = allMatches(MATHE_WOERTER_RE, text)
      if (woerter.length) hinweise.push(`${ort}: Format „Ohne Rechnen“, aber Rechenwort gefunden: ${[...new Set(woerter)].join(', ')}`)
    }
  }

  // 4. piktogramm
  if (istPiktogramm) {
    for (const a of aufgaben) {
      if (!a.piktogramm) hinweise.push(`Aufgabe ${a.nr}: Piktogramm-Format, aber kein Piktogramm-Schlüssel gesetzt.`)
      const n = countWords(a.anweisung)
      if (n > PIKTOGRAMM_ANWEISUNG_MAX_WOERTER) {
        hinweise.push(`Aufgabe ${a.nr}: Anweisung hat ${n} Wörter, Piktogramm-Format erlaubt höchstens ${PIKTOGRAMM_ANWEISUNG_MAX_WOERTER}.`)
      }
    }
  }

  // 5. Verbotsliste – alle Texte inklusive Titel und Anleiter-Hinweis
  const alleTexte = [
    { ort: 'Titel', text: worksheet.titel ?? '' },
    ...lesetexte,
    { ort: 'Hinweis für den Anleiter', text: worksheet.hinweisAnleiter ?? '' },
  ]
  for (const { ort, text } of alleTexte) {
    const treffer = allMatches(VERBOTEN_RE, text)
    if (treffer.length) hinweise.push(`${ort}: Begriff aus der Verbotsliste: ${[...new Set(treffer)].join(', ')}`)
  }

  return { ok: hinweise.length === 0, hinweise }
}
