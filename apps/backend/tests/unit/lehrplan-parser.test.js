import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { berufsfeldFromFileName, parseLehrplanDocx, parseLehrplanXml, textOf, topLevelElements } from '../../src/lehrplan/parser.js'

/** Baut eine Mini-Tabelle im Word-XML-Format */
const cell = (text, extra = '') => `<w:tc><w:tcPr>${extra}</w:tcPr><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`
const row = (...cells) => `<w:tr>${cells.join('')}</w:tr>`
const table = (...rows) => `<w:tbl>${rows.join('')}</w:tbl>`

const XML = `<w:document><w:body>${table(
  row(cell('Teilqualifizierung für die Ausbildungsberufe als Fachlagerist (IHK)', '<w:gridSpan w:val="4"/>')),
  row(cell('Berufsanschlussfähige Teilqualifizierung Baustein 7', '<w:gridSpan w:val="4"/>')),
  row(cell(''), cell('Stufe'), cell('Binnendifferenzierung'), cell('Beispiel')),
  row(cell('Ausbildungs-baustein 1'), cell(''), cell('Wareneingang', '<w:gridSpan w:val="2"/>')),
  row(cell('Abschnitt 1', '<w:vMerge w:val="restart"/>'), cell(''), cell('Begleitpapiere prüfen', '<w:gridSpan w:val="2"/>')),
)}${table(
  row(cell('Begleitpapiere prüfen')),
  row(cell('', '<w:vMerge/>'), cell('T'), cell('Beherrscht einen Schritt'), cell('Papier &amp; Stift holen')),
  row(cell('', '<w:vMerge/>'), cell('A'), cell('Beherrscht einige Schritte'), cell('')),
  row(cell('', '<w:vMerge/>'), cell('F'), cell('Wendet an'), cell('Beispiel F')),
  row(cell('', '<w:vMerge/>'), cell('B'), cell('Wendet neu an'), cell('Beispiel B')),
  row(cell('', '<w:vMerge/>'), cell(''), cell('Güter entladen'), cell('')),
  row(cell('', '<w:vMerge/>'), cell('T'), cell('Schritt'), cell('LKW melden')),
  row(cell('', '<w:vMerge/>'), cell('A'), cell('Schritte'), cell('Hubwagen')),
  row(cell('', '<w:vMerge/>'), cell('F'), cell('Bekannt'), cell('Lieferschein')),
  row(cell('', '<w:vMerge/>'), cell('B'), cell('Neu'), cell('Transportmittel wählen')),
)}</w:body></w:document>`

describe('XML-Hilfen', () => {
  it('liest Text mit Entities, Tabs und Umbruechen', () => {
    expect(textOf('<w:p><w:r><w:t>A &amp; B</w:t></w:r><w:r><w:tab/><w:t xml:space="preserve"> C</w:t></w:r></w:p>')).toBe('A & B C')
  })

  it('zaehlt verschachtelte Tabellen nicht als eigene Zeilen', () => {
    const nested = `<w:tr><w:tc><w:tbl><w:tr><w:tc><w:p><w:r><w:t>innen</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:tc></w:tr><w:tr><w:tc></w:tc></w:tr>`
    expect(topLevelElements(nested, 'w:tr')).toHaveLength(2)
  })
})

describe('parseLehrplanXml', () => {
  const parsed = parseLehrplanXml(XML)

  it('nimmt die Baustein-Nummer aus "Ausbildungs-baustein N", nicht aus der Kopfzeile', () => {
    expect(parsed.baustein).toBe(1)
    expect(parsed.ausbildungsbaustein).toBe('Wareneingang')
    expect(parsed.tq).toBe('für die Ausbildungsberufe als Fachlagerist (IHK)')
  })

  it('findet beide Lernziele mit je vier Stufen, Titelwiederholung in verbundenen Zellen wird ignoriert', () => {
    expect(parsed.lernziele.map((l) => l.titel)).toEqual(['Begleitpapiere prüfen', 'Güter entladen'])
    expect(parsed.lernziele[0].abschnitt).toBe(1)
    expect(parsed.lernziele[0].niveaus.T).toEqual({ kompetenz: 'Beherrscht einen Schritt', beispiel: 'Papier & Stift holen' })
    expect(parsed.lernziele[0].niveaus.A.beispiel).toBe('')
    expect(Object.keys(parsed.lernziele[1].niveaus)).toEqual(['T', 'A', 'F', 'B'])
  })
})

describe('berufsfeldFromFileName', () => {
  it('ordnet die Dateinamen den Berufsfeldern des Bildungsparks zu', () => {
    expect(berufsfeldFromFileName('Binnendifferenzierter Lehrplan TQ Lager Ausbildungsbaustein 1.docx')).toBe('Lagerlogistik, Handel & Versand')
    expect(berufsfeldFromFileName('Binnendifferenzierter Lehrplan TQGastro Ausbildungsbaustein5_Hygiene_Ja.docx')).toBe('Gastronomie & Hauswirtschaft')
    expect(berufsfeldFromFileName('Binnendifferenzierter Lehrplan TQ Metall Ausbildungsbaustein 2_Abschnitt 1.docx')).toBe('Metalltechnik & Montage')
    expect(berufsfeldFromFileName('irgendwas.docx')).toBeNull()
  })
})

// Die echten Lehrplaene liegen ausserhalb des Repos (Dokumente des Bildungsparks).
// Dieser Test laeuft nur, wenn der Ordner lokal vorhanden ist – in CI wird er uebersprungen.
const contextDir = resolve(fileURLToPath(new URL('../../../..', import.meta.url)), '../context/WG__Unterlagen_BIldungspark')
describe.skipIf(!existsSync(contextDir))('Echte Lehrplaene des Bildungsparks', () => {
  it('ergibt 96 Lernziele (Lager 16, Metall 19, Gastro 61) mit je vier Stufen', () => {
    const files = readdirSync(contextDir).filter((n) => /^Binnendifferenzierter Lehrplan.*\.docx$/.test(n))
    const counts = {}
    let total = 0
    for (const name of files) {
      const parsed = parseLehrplanDocx(readFileSync(join(contextDir, name)))
      const berufsfeld = berufsfeldFromFileName(name)
      counts[berufsfeld] = (counts[berufsfeld] ?? 0) + parsed.lernziele.length
      total += parsed.lernziele.length
      expect(parsed.baustein, name).not.toBeNull()
      for (const ziel of parsed.lernziele) expect(Object.keys(ziel.niveaus).sort(), `${name}: ${ziel.titel}`).toEqual(['A', 'B', 'F', 'T'])
    }
    expect(files).toHaveLength(14)
    expect(total).toBe(96)
    expect(counts).toEqual({ 'Lagerlogistik, Handel & Versand': 16, 'Metalltechnik & Montage': 19, 'Gastronomie & Hauswirtschaft': 61 })
  })
})
