/**
 * Schema des Arbeitsblatts.
 *
 * Begriff: Ein "Schema" ist eine formale Beschreibung, wie die Daten aussehen
 * muessen (welche Felder, welche Typen, welche erlaubten Werte). Wir nutzen es
 * zweimal:
 *
 *   1. Als JSON-Schema an das Sprachmodell (Gemini) geschickt – das Modell MUSS
 *      dann genau in dieser Struktur antworten ("strukturierte Ausgabe").
 *   2. Mit `zod` pruefen wir die Antwort des Modells trotzdem noch einmal –
 *      trauen ist gut, pruefen ist besser.
 *
 * Dasselbe Schema prueft auch die Eingaben der Routen (Request-Body).
 */
import { z } from 'zod'

// Fehlermeldungen von zod auf Deutsch (z. B. "Ungültige Eingabe: erwartet string")
z.config(z.locales.de())

// ---------------------------------------------------------------------------
// Fachliche Konstanten (Quelle: docs/fachliche-grundlagen.md)
// ---------------------------------------------------------------------------

/** Niveaustufen der binnendifferenzierten Lehrplaene */
export const STUFEN = ['T', 'A', 'F', 'B']

/**
 * Kompetenzformeln je Stufe – woertlich wiederkehrend in den Lehrplaenen.
 * Die Bezeichnungen (Taetigkeit/Arbeitsplatz/...) im Frontend sind nur eine
 * Hypothese, deshalb arbeitet der Prompt ausschliesslich mit diesen Formeln.
 */
export const KOMPETENZFORMEL = {
  T: 'beherrscht einen erlernten Arbeitsschritt',
  A: 'beherrscht einige erlernte Arbeitsschritte',
  F: 'wendet Erlerntes in bekannten Situationen an',
  B: 'wendet Erlerntes in neuen Situationen an',
}

/** Erlaubte Anzahl Aufgaben je Stufe: [min, max] */
export const AUFGABEN_ANZAHL = { T: [3, 4], A: [4, 5], F: [5, 6], B: [6, 8] }

/** Barrierefreiheits-Formate (Festlegung des Teams, siehe Frontend FORMAT_OPTIONS) */
export const FORMATE = ['text', 'piktogramm', 'mathefrei', 'piktogramm-mathefrei']

export const FORMAT_LABEL = {
  text: 'Standard-Text',
  piktogramm: 'Mit Piktogrammen',
  mathefrei: 'Ohne Rechnen',
  'piktogramm-mathefrei': 'Piktogramm + Mathefrei',
}

export const SPRACHEN = ['Leichte Sprache', 'Standardsprache']

/** Aufgabentypen – abgeleitet aus den echten Arbeitsblaettern des Bildungsparks */
export const AUFGABEN_TYPEN = ['offen', 'reihenfolge', 'zuordnen', 'ankreuzen', 'malen', 'praxis']

export const AUFGABEN_TYP_LABEL = {
  offen: 'Nach-denken',
  reihenfolge: 'Reihenfolge',
  zuordnen: 'Zuordnen',
  ankreuzen: 'Ankreuzen',
  malen: 'Malen',
  praxis: 'Praxis-Übung',
}

/**
 * Whitelist der Piktogramm-Schluessel.
 *
 * Das Modell darf nur diese Schluessel verwenden. Im Prototyp werden sie als
 * Symbol (Emoji) angezeigt; spaeter kann hier ein echtes Piktogramm-Set
 * (z. B. des Bildungsparks) hinterlegt werden, ohne den Prompt zu aendern.
 */
export const PIKTOGRAMME = {
  denken: { symbol: '💭', label: 'Nach-denken' },
  lesen: { symbol: '📖', label: 'Lesen' },
  schreiben: { symbol: '✏️', label: 'Schreiben' },
  sprechen: { symbol: '🗣️', label: 'Sprechen' },
  fragen: { symbol: '❓', label: 'Fragen' },
  anleiter: { symbol: '🧑‍🏫', label: 'Anleiter' },
  reihenfolge: { symbol: '🔢', label: 'Reihenfolge' },
  verbinden: { symbol: '🔗', label: 'Verbinden' },
  ankreuzen: { symbol: '☑️', label: 'Ankreuzen' },
  malen: { symbol: '🎨', label: 'Malen' },
  zaehlen: { symbol: '🧮', label: 'Zählen' },
  uhr: { symbol: '⏰', label: 'Zeit' },
  achtung: { symbol: '⚠️', label: 'Achtung' },
  stopp: { symbol: '🛑', label: 'Stopp' },
  haende: { symbol: '🤲', label: 'Hände' },
  handschuhe: { symbol: '🧤', label: 'Handschuhe' },
  helm: { symbol: '⛑️', label: 'Helm' },
  schutzbrille: { symbol: '🥽', label: 'Schutzbrille' },
  werkzeug: { symbol: '🔧', label: 'Werkzeug' },
  messer: { symbol: '🔪', label: 'Messer' },
  paket: { symbol: '📦', label: 'Paket' },
  lkw: { symbol: '🚚', label: 'LKW' },
  hubwagen: { symbol: '🛒', label: 'Hubwagen' },
  regal: { symbol: '🗄️', label: 'Regal' },
  waage: { symbol: '⚖️', label: 'Waage' },
  liste: { symbol: '📋', label: 'Liste' },
  computer: { symbol: '💻', label: 'Computer' },
  besen: { symbol: '🧹', label: 'Reinigen' },
  topf: { symbol: '🍲', label: 'Kochen' },
  teller: { symbol: '🍽️', label: 'Teller' },
  kuehlschrank: { symbol: '🧊', label: 'Kühlen' },
  pflanze: { symbol: '🌱', label: 'Pflanze' },
}

export const PIKTOGRAMM_KEYS = Object.keys(PIKTOGRAMME)

// ---------------------------------------------------------------------------
// Schema des Arbeitsblatts (Ausgabe des Modells)
// ---------------------------------------------------------------------------

const text = (max, description) => {
  const schema = z.string().trim().min(1).max(max)
  return description ? schema.describe(description) : schema
}

export const AufgabeSchema = z.object({
  nr: z.number().int().min(1).max(20).describe('Laufende Nummer, beginnend bei 1'),
  typ: z.enum(AUFGABEN_TYPEN).describe('Art der Aufgabe'),
  anweisung: text(600, 'Arbeitsanweisung in kurzen Sätzen, Anrede "du"'),
  optionen: z
    .array(text(200))
    .max(10)
    .optional()
    .describe('Bei reihenfolge/ankreuzen: die Auswahlzeilen. Bei zuordnen: Paare im Format "links | rechts".'),
  loesung: z.string().trim().max(400).optional().describe('Erwartete Lösung für den Anleiter (optional)'),
  piktogramm: z
    .enum(PIKTOGRAMM_KEYS)
    .optional()
    .describe('Nur bei Piktogramm-Formaten: Schlüssel aus der Whitelist'),
})

export const WoerterbuchEintragSchema = z.object({
  wort: text(80, 'Schweres Wort, mit Bindestrich getrennt'),
  erklaerung: text(300, 'Erklärung in einem kurzen Satz'),
})

/** Das, was das Sprachmodell liefern muss. */
export const LlmWorksheetSchema = z.object({
  titel: text(120, 'Kurzer Titel des Arbeitsblatts'),
  berufsfeld: text(120),
  stufe: z.enum(STUFEN),
  format: z.enum(FORMATE),
  sprache: z.enum(SPRACHEN),
  lernziel: text(500, 'Lernziel aus dem Lehrplan (wörtlich übernommen)'),
  einleitung: text(2000, 'Kurze Hinführung zum Thema. Bei gefährlichen Tätigkeiten ein Absatz, der mit "Achtung:" beginnt.'),
  aufgaben: z.array(AufgabeSchema).min(1).max(10),
  woerterbuch: z.array(WoerterbuchEintragSchema).max(12).describe('Kleines Wörterbuch mit den schweren Wörtern'),
  hinweisAnleiter: z.string().trim().max(800).describe('Hinweis für die Lehrkraft: Material, Zeit, worauf achten'),
})

/**
 * Das vollstaendige Arbeitsblatt, wie es die API zurueckgibt und der
 * DOCX-Export erwartet. `baustein` und `ausbildungsbaustein` setzt das Backend
 * aus der Anfrage – das Modell erzeugt sie nicht.
 */
export const WorksheetSchema = LlmWorksheetSchema.extend({
  baustein: z.number().int().min(0).max(99).optional(),
  ausbildungsbaustein: z.string().trim().max(200).optional(),
})

// ---------------------------------------------------------------------------
// Schema der Anfrage (Request-Body von POST /api/ai/arbeitsblatt)
// ---------------------------------------------------------------------------

const NiveauSchema = z.object({
  kompetenz: text(600),
  // Einzelne Beispielzellen sind in den Lehrplaenen leer – deshalb erlaubt.
  beispiel: z.string().trim().max(600).default(''),
})

export const LernzielSchema = z.object({
  berufsfeld: text(120),
  baustein: z.coerce.number().int().min(0).max(99),
  ausbildungsbaustein: text(200),
  titel: text(500),
  niveaus: z.object({ T: NiveauSchema, A: NiveauSchema, F: NiveauSchema, B: NiveauSchema }),
})

export const GenerateRequestSchema = z.object({
  lernziel: LernzielSchema,
  stufe: z.enum(STUFEN),
  format: z.enum(FORMATE),
  sprache: z.enum(SPRACHEN),
  thema: z.string().trim().max(300).optional(),
  erwartungen: z.string().trim().max(2000).optional(),
})

// ---------------------------------------------------------------------------
// JSON-Schema fuer Gemini
// ---------------------------------------------------------------------------

/**
 * Gemini versteht nur eine Teilmenge von JSON-Schema (siehe SDK-Doku zu
 * `responseJsonSchema`). Alles andere – z. B. maxLength – wird entfernt,
 * sonst lehnt die API die Anfrage ab.
 */
const GEMINI_SCHEMA_KEYS = new Set([
  '$defs', '$ref', 'type', 'format', 'title', 'description', 'enum', 'items', 'prefixItems',
  'minItems', 'maxItems', 'minimum', 'maximum', 'anyOf', 'oneOf', 'properties',
  'additionalProperties', 'required', 'propertyOrdering',
])

function toGeminiSchema(node) {
  if (Array.isArray(node)) return node.map(toGeminiSchema)
  if (node === null || typeof node !== 'object') return node

  const out = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === 'properties') {
      out.properties = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, toGeminiSchema(child)]))
      // Reihenfolge der Felder in der Antwort = Reihenfolge im Schema
      out.propertyOrdering = Object.keys(value)
    } else if (GEMINI_SCHEMA_KEYS.has(key)) {
      out[key] = toGeminiSchema(value)
    }
  }
  return out
}

export const WORKSHEET_JSON_SCHEMA = toGeminiSchema(
  z.toJSONSchema(LlmWorksheetSchema, { target: 'draft-2020-12', unrepresentable: 'any', io: 'input' }),
)

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** "lernziel.niveaus.T.kompetenz: Zu kurz" – lesbare Zusammenfassung von zod-Fehlern */
export function formatZodError(error) {
  return error.issues
    .map((issue) => `${issue.path.length ? issue.path.join('.') : 'body'}: ${issue.message}`)
    .join('; ')
}

export function zodIssues(error) {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}
