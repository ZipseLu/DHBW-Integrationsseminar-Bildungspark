/**
 * Mock-Arbeitsblatt – laeuft ohne API-Key und ohne Internet.
 *
 * Begriff: Ein "Mock" ist eine Attrappe, die sich nach aussen wie das Echte
 * verhaelt (gleiche Struktur, gleiche Felder), aber feste Inhalte liefert.
 * So laesst sich die komplette Demo – Formular, Anzeige, Validator, DOCX –
 * auch ohne Gemini vorfuehren. Stufe, Format, Sprache, Berufsfeld und
 * Lernziel kommen aus der Anfrage; die Aufgaben sind generische Beispiele.
 */
import { AUFGABEN_ANZAHL, KOMPETENZFORMEL } from './schema.js'

/** Kuerzt lange Lernzieltexte fuer den Titel auf Wortgrenze (Schema: hoechstens 120 Zeichen) */
export function kurzerTitel(text, max = 100) {
  const clean = String(text).replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–-]+$/, '')}…`
}

/**
 * Aufgabenpool. `anweisung` haelt die Satzlaengen-Regel fuer Stufe T ein
 * (hoechstens 12 Woerter je Satz), `kurz` die Piktogramm-Regel (hoechstens
 * 8 Woerter insgesamt). Keine Zahl groesser als 3 (Regel "Ohne Rechnen").
 */
const AUFGABEN = [
  {
    typ: 'offen',
    piktogramm: 'denken',
    anweisung: 'Was machst du zuerst bei dieser Arbeit? Schreibe es auf.',
    kurz: 'Was machst du zuerst? Schreibe es auf.',
  },
  {
    typ: 'reihenfolge',
    piktogramm: 'reihenfolge',
    anweisung: 'Bringe die Schritte in die richtige Reihenfolge. Schreibe 1, 2 und 3 in die Kästchen.',
    kurz: 'Schreibe 1, 2 und 3 in die Kästchen.',
    optionen: ['Ich räume den Arbeits-platz auf.', 'Ich hole mir die Schutz-ausrüstung.', 'Ich mache die Arbeit wie gezeigt.'],
    loesung: '2, 3, 1',
  },
  {
    typ: 'ankreuzen',
    piktogramm: 'ankreuzen',
    anweisung: 'Was ist richtig? Kreuze an.',
    kurz: 'Was ist richtig? Kreuze an.',
    optionen: ['Ich frage den Anleiter, wenn ich unsicher bin.', 'Ich arbeite ohne Schutz-ausrüstung.', 'Ich melde kaputte Sachen sofort.'],
    loesung: 'Aussage 1 und 3',
  },
  {
    typ: 'praxis',
    piktogramm: 'anleiter',
    anweisung: 'Übe die Arbeit mit deinem Anleiter. Frage deinen Anleiter: Habe ich alles richtig gemacht?',
    kurz: 'Übe mit deinem Anleiter. Alles richtig gemacht?',
  },
  {
    typ: 'zuordnen',
    piktogramm: 'verbinden',
    anweisung: 'Verbinde das Hilfs-mittel mit der passenden Aufgabe.',
    kurz: 'Verbinde Hilfs-mittel und Aufgabe.',
    optionen: ['Handschuhe | Hände schützen', 'Liste | Arbeit auf-schreiben', 'Hub-wagen | Schwere Sachen fahren'],
  },
  {
    typ: 'malen',
    piktogramm: 'malen',
    anweisung: 'Male deinen Arbeits-platz in den Rahmen.',
    kurz: 'Male deinen Arbeits-platz in den Rahmen.',
  },
  {
    typ: 'offen',
    piktogramm: 'sprechen',
    anweisung: 'Erkläre einem Kollegen die Arbeit. Nutze drei Sätze.',
    kurz: 'Erkläre einem Kollegen die Arbeit.',
  },
  {
    typ: 'offen',
    piktogramm: 'schreiben',
    anweisung: 'Was war heute schwer? Schreibe es auf.',
    kurz: 'Was war heute schwer? Schreibe es auf.',
  },
]

/**
 * @param {object} input  Validierter Request (GenerateRequestSchema)
 * @returns {object}      Arbeitsblatt (WorksheetSchema)
 */
export function buildMockWorksheet(input) {
  const { lernziel, stufe, format, sprache } = input
  const istPiktogramm = format === 'piktogramm' || format === 'piktogramm-mathefrei'
  const anzahl = Math.min(AUFGABEN_ANZAHL[stufe][1], 7)
  const niveau = lernziel.niveaus[stufe]

  const aufgaben = AUFGABEN.slice(0, anzahl).map((vorlage, index) => {
    const aufgabe = {
      nr: index + 1,
      typ: vorlage.typ,
      anweisung: istPiktogramm ? vorlage.kurz : vorlage.anweisung,
    }
    if (vorlage.optionen) aufgabe.optionen = [...vorlage.optionen]
    if (vorlage.loesung) aufgabe.loesung = vorlage.loesung
    if (istPiktogramm) aufgabe.piktogramm = vorlage.piktogramm
    return aufgabe
  })

  return {
    titel: kurzerTitel(lernziel.titel),
    berufsfeld: lernziel.berufsfeld,
    baustein: lernziel.baustein,
    ausbildungsbaustein: lernziel.ausbildungsbaustein,
    stufe,
    format,
    sprache,
    lernziel: lernziel.titel,
    einleitung: [
      `Heute übst du: ${lernziel.titel}.`,
      `Das steht im Lehr-plan für das Berufsfeld ${lernziel.berufsfeld}.`,
      'Lies alles in Ruhe. Frage deinen Anleiter, wenn etwas unklar ist.',
    ].join('\n'),
    aufgaben,
    woerterbuch: [
      { wort: 'Anleiter', erklaerung: 'Die Person, die dir die Arbeit zeigt und dir hilft.' },
      { wort: 'Schutz-ausrüstung', erklaerung: 'Kleidung und Sachen, die dich bei der Arbeit schützen. Zum Beispiel Handschuhe.' },
      { wort: 'Lehr-plan', erklaerung: 'Eine Liste mit allem, was du in der Ausbildung lernst.' },
    ],
    hinweisAnleiter: [
      'Beispielantwort ohne API-Key (Mock-Modus) – Inhalte sind allgemein gehalten.',
      `Lehrplan Stufe ${stufe} (${KOMPETENZFORMEL[stufe]}): ${niveau.kompetenz}.`,
      niveau.beispiel ? `Beispiel laut Lehrplan: ${niveau.beispiel}` : '',
    ]
      .filter(Boolean)
      .join(' '),
  }
}
