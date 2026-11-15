/**
 * Relevance filter for the web search (FE-36).
 *
 * The search engines return every PDF/DOCX that merely mentions the entered
 * words (laws, brochures, annual reports, …). Teachers only want worksheets
 * about the entered topic, so a hit is kept only if
 *   1. it is recognisably a worksheet (marker word in title, URL or snippet) and
 *   2. every keyword of the query appears in title, URL or snippet.
 *
 * Matching is deliberately simple and dependency free: lower case, umlauts
 * folded (ä -> ae, ß -> ss), a light German suffix stemmer and a second
 * comparison without separators so that "Hände waschen" also matches
 * "Händewaschen".
 */

/** Word stems that mark a document as a worksheet (already folded, see fold()). */
const WORKSHEET_MARKERS = [
  'arbeitsbl', // Arbeitsblatt, Arbeitsblätter
  'arbeitsbogen',
  'uebungsbl', // Übungsblatt, Übungsblätter
  'ubungsbl', // "Ubungsblatt" in URLs without umlaut
  'aufgabenbl', // Aufgabenblatt
  'kopiervorlage',
  'worksheet',
]

/** Search term added to the engine query when the user did not type a marker word. */
export const WORKSHEET_QUERY_TERM = 'Arbeitsblatt'

/** Filler words that must not be required in every hit. */
const STOP_WORDS = new Set([
  'und', 'oder', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einer', 'eines',
  'fuer', 'mit', 'ohne', 'zu', 'zum', 'zur', 'im', 'in', 'am', 'an', 'auf', 'aus', 'bei', 'von', 'vom',
  'ueber', 'unter', 'nach', 'vor', 'wie', 'was', 'ist', 'sind', 'als', 'auch', 'nicht',
  'the', 'and', 'for', 'with', 'of', 'to',
])

/** Search operators that are not keywords (filetype:pdf, site:…, OR, AND). */
const OPERATOR_PATTERN = /^(filetype|site|intitle|inurl|ext|lang):/i
const BOOLEAN_WORDS = new Set(['or', 'and', 'not'])

/** Inflection endings, longest first. Only one ending is removed. */
const SUFFIXES = ['ungen', 'ung', 'ern', 'en', 'er', 'es', 'em', 'e', 'n', 's']
const MIN_STEM_LENGTH = 4

/** Lower case with umlauts and ß folded to ASCII. */
export function fold(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Removes one inflection ending as long as a stem of at least four letters remains. */
export function stem(word) {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= MIN_STEM_LENGTH) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

function isWorksheetWord(word) {
  return WORKSHEET_MARKERS.some((marker) => word.includes(marker))
}

/** True if the query already names a worksheet type (then no extra term is added). */
export function queryNamesWorksheet(query) {
  return isWorksheetWord(fold(query))
}

/**
 * Keyword stems of a query: without operators, excluded words (-wort),
 * boolean words, stop words, very short words and worksheet marker words
 * (those are checked separately).
 */
export function keywordStems(query) {
  const stems = []
  for (const raw of String(query ?? '').split(/\s+/)) {
    if (!raw || raw.startsWith('-') || OPERATOR_PATTERN.test(raw)) continue
    for (const part of fold(raw).split(/[^a-z0-9]+/)) {
      if (part.length < 2 || BOOLEAN_WORDS.has(part) || STOP_WORDS.has(part)) continue
      if (isWorksheetWord(part)) continue
      const s = stem(part)
      if (!stems.includes(s)) stems.push(s)
    }
  }
  return stems
}

/** Searchable text of a hit: title, decoded URL and snippet, folded. */
function haystackOf(result) {
  let url = String(result.url ?? '')
  try {
    url = decodeURIComponent(url)
  } catch {
    // keep the raw URL
  }
  const text = fold(`${result.title ?? ''} ${url} ${result.snippet ?? ''}`)
  // Words separated by spaces, hyphens, underscores …
  const spaced = text.replace(/[^a-z0-9]+/g, ' ')
  // … and the same text without separators for compound words
  const joined = spaced.replace(/ /g, '')
  return { spaced, joined }
}

/** True if the hit is a worksheet and contains every keyword of the query. */
export function isMatchingWorksheet(result, stems) {
  const { spaced, joined } = haystackOf(result)
  if (!WORKSHEET_MARKERS.some((marker) => joined.includes(marker))) return false
  return stems.every((s) => spaced.includes(s) || joined.includes(s))
}
