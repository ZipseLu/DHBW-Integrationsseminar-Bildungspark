/**
 * Parser fuer die binnendifferenzierten Lehrplaene des Bildungsparks (DOCX).
 *
 * Eine DOCX-Datei ist ein ZIP-Archiv; der Text liegt in word/document.xml.
 * Die Lehrplaene sind Tabellen mit den Spalten
 *   (Abschnitt) | Stufe | Binnendifferenzierung | Beispiel
 * Ein Lernziel ist eine verbundene Zeile mit dem Lernzieltext, darunter die
 * vier Zeilen T / A / F / B.
 *
 * Bekannte Datenqualitaet (docs/fachliche-grundlagen.md, Abschnitt 3):
 * - Die Kopfzeile "Berufsanschlussfaehige Teilqualifizierung Baustein N" ist
 *   in 10 von 14 Dateien falsch -> die Nummer kommt aus der Zeile
 *   "Ausbildungs-baustein N".
 * - Einzelne Beispielzellen sind leer, Titel wiederholen sich in verbundenen Zellen.
 *
 * Keine externen Abhaengigkeiten: ZIP wird mit node:zlib gelesen, das XML
 * mit regulaeren Ausdruecken ausgewertet (die Struktur ist flach genug).
 */
import { inflateRawSync } from 'node:zlib'

// ---------------------------------------------------------------------------
// ZIP: genau einen Eintrag lesen (reicht fuer word/document.xml)
// ---------------------------------------------------------------------------

export function readZipEntry(buffer, entryName) {
  const EOCD = 0x06054b50
  let eocd = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65_535); i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Keine ZIP-Datei (End of Central Directory fehlt)')

  const entries = buffer.readUInt16LE(eocd + 10)
  let p = buffer.readUInt32LE(eocd + 16)

  for (let n = 0; n < entries; n += 1) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP-Verzeichnis beschädigt')
    const method = buffer.readUInt16LE(p + 10)
    const compressedSize = buffer.readUInt32LE(p + 20)
    const nameLength = buffer.readUInt16LE(p + 28)
    const extraLength = buffer.readUInt16LE(p + 30)
    const commentLength = buffer.readUInt16LE(p + 32)
    const localOffset = buffer.readUInt32LE(p + 42)
    const name = buffer.toString('utf8', p + 46, p + 46 + nameLength)

    if (name === entryName) {
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('ZIP-Eintrag beschädigt')
      const localNameLength = buffer.readUInt16LE(localOffset + 26)
      const localExtraLength = buffer.readUInt16LE(localOffset + 28)
      const start = localOffset + 30 + localNameLength + localExtraLength
      const data = buffer.subarray(start, start + compressedSize)
      if (method === 0) return data
      if (method === 8) return inflateRawSync(data)
      throw new Error(`ZIP-Komprimierung ${method} nicht unterstützt`)
    }
    p += 46 + nameLength + extraLength + commentLength
  }
  throw new Error(`${entryName} nicht im ZIP enthalten`)
}

// ---------------------------------------------------------------------------
// XML-Hilfen
// ---------------------------------------------------------------------------

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }

function decodeEntities(text) {
  return text
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m])
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
}

/** Text eines XML-Fragments: <w:t>-Inhalte, Tabs und Umbrueche als Leerzeichen, Whitespace normalisiert */
export function textOf(fragment) {
  const withBreaks = fragment.replace(/<w:(?:tab|br|cr)\s*\/>/g, ' ')
  const parts = [...withBreaks.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/gs)].map((m) => decodeEntities(m[1]))
  return parts.join('').replace(/\s+/g, ' ').trim()
}

/**
 * Zerlegt ein Fragment in Kind-Elemente eines Typs (z. B. w:tr) auf oberster
 * Ebene – verschachtelte Tabellen werden NICHT als eigene Zeilen gezaehlt.
 */
export function topLevelElements(fragment, tag) {
  const open = new RegExp(`<${tag}(?=[\\s>/])`, 'g')
  const re = new RegExp(`<${tag}(?=[\\s>/])|</${tag}>`, 'g')
  const result = []
  let depth = 0
  let start = -1
  for (const match of fragment.matchAll(re)) {
    if (match[0].startsWith('</')) {
      depth -= 1
      if (depth === 0 && start >= 0) {
        result.push(fragment.slice(start, match.index + match[0].length))
        start = -1
      }
    } else {
      if (depth === 0) start = match.index
      depth += 1
    }
  }
  open.lastIndex = 0
  return result
}

/** Zellen einer Zeile (oberste Ebene) als Texte; jede Zelle = Absaetze mit Leerzeichen verbunden */
function cellTexts(row) {
  return topLevelElements(row, 'w:tc').map((cell) =>
    topLevelElements(cell, 'w:p')
      .map((p) => textOf(p))
      .filter(Boolean)
      .join(' ')
      .trim(),
  )
}

// ---------------------------------------------------------------------------
// Lehrplan-Struktur
// ---------------------------------------------------------------------------

export const STUFEN = ['T', 'A', 'F', 'B']

const HEADER_PATTERNS = [/^Stufe$/i, /^Binnendifferenzierung$/i, /^Beispiel$/i, /Teilqualifizierung/i, /^Berufsanschluss/i]

const isHeader = (text) => HEADER_PATTERNS.some((re) => re.test(text))

/**
 * @param {string} xml  Inhalt von word/document.xml
 * @returns {{ tq: string|null, baustein: number|null, ausbildungsbaustein: string|null,
 *            abschnitt: number|null, lernziele: Array<{ abschnitt: number|null, titel: string, niveaus: object }> }}
 */
export function parseLehrplanXml(xml) {
  const result = { tq: null, baustein: null, ausbildungsbaustein: null, abschnitt: null, lernziele: [] }
  let current = null
  let abschnitt = null

  const rows = topLevelElements(xml, 'w:tbl').flatMap((table) => topLevelElements(table, 'w:tr'))

  for (const row of rows) {
    const cells = cellTexts(row)
    const texts = cells.filter(Boolean)
    if (texts.length === 0) continue

    // Kopf: "Teilqualifizierung für die Ausbildungsberufe ..."
    if (!result.tq && texts.length === 1 && /Teilqualifizierung/i.test(texts[0]) && !/^Berufsanschluss/i.test(texts[0])) {
      result.tq = texts[0].replace(/^Teilqualifizierung\s*/i, '').trim()
      continue
    }

    // "Ausbildungs-baustein N | Titel" – verlaesslich (anders als die Kopfzeile)
    const bausteinCell = texts.find((t) => /^Ausbildungs-?\s?baustein\s*\d+/i.test(t))
    if (bausteinCell) {
      result.baustein = Number.parseInt(/(\d+)/.exec(bausteinCell)[1], 10)
      const titel = texts.filter((t) => t !== bausteinCell).at(-1)
      if (titel) result.ausbildungsbaustein = titel
      continue
    }

    // "Abschnitt N" steht in einer eigenen (oft verbundenen) Zelle
    const abschnittCell = texts.find((t) => /^Abschnitt\s*\d+/i.test(t))
    if (abschnittCell) {
      abschnitt = Number.parseInt(/(\d+)/.exec(abschnittCell)[1], 10)
      if (result.abschnitt === null) result.abschnitt = abschnitt
    }

    // Niveauzeile: Zelle mit genau T / A / F / B, danach Kompetenz und Beispiel
    const stufeIndex = cells.findIndex((t) => STUFEN.includes(t))
    if (stufeIndex >= 0) {
      if (!current) continue // Niveauzeile ohne Lernziel – Datenfehler, ueberspringen
      const stufe = cells[stufeIndex]
      current.niveaus[stufe] = {
        kompetenz: cells[stufeIndex + 1] ?? '',
        beispiel: cells[stufeIndex + 2] ?? '',
      }
      continue
    }

    // Lernzieltitel: genau ein Text ausser "Abschnitt N", kein Tabellenkopf
    const content = texts.filter((t) => t !== abschnittCell && !isHeader(t))
    if (content.length !== 1) continue
    const titel = content[0]

    if (current && Object.keys(current.niveaus).length === 0) {
      // verbundene Zelle wiederholt den Titel oder setzt ihn fort
      if (current.titel !== titel) current.titel = `${current.titel} ${titel}`.replace(/\s+/g, ' ').trim()
      continue
    }
    current = { abschnitt, titel, niveaus: {} }
    result.lernziele.push(current)
  }

  // Lernziele ohne einzige Niveauzeile sind keine Lernziele (z. B. Ueberschriften)
  result.lernziele = result.lernziele.filter((l) => Object.keys(l.niveaus).length > 0)
  return result
}

/** Berufsfeld laut Infoblatt des Bildungsparks aus dem Dateinamen */
export function berufsfeldFromFileName(fileName) {
  if (/TQ\s*Lager/i.test(fileName)) return 'Lagerlogistik, Handel & Versand'
  if (/TQ\s*Metall/i.test(fileName)) return 'Metalltechnik & Montage'
  if (/TQ\s*Gastro/i.test(fileName)) return 'Gastronomie & Hauswirtschaft'
  return null
}

/** DOCX-Puffer -> geparster Lehrplan */
export function parseLehrplanDocx(buffer) {
  const xml = readZipEntry(buffer, 'word/document.xml').toString('utf8')
  return parseLehrplanXml(xml)
}
