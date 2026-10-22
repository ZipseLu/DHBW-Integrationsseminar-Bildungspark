/**
 * Word-Export (serverseitig) mit dem npm-Paket `docx`.
 *
 * Gleiche Bibliothek, Schrift (Calibri) und Farben wie der clientseitige
 * Export in apps/frontend/src/lib/docx.ts – die Werte muessen dort und hier
 * uebereinstimmen (LEVEL_STYLES in apps/frontend/src/data/constants.ts).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  HeightRule,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
  convertMillimetersToTwip,
} from 'docx'
import { AUFGABEN_TYP_LABEL, FORMAT_LABEL, PIKTOGRAMME } from './schema.js'

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const FONT = 'Calibri'
const COLOR_PRIMARY = '1E3A5F'
const COLOR_TEXT = '1A1714'
const COLOR_MUTED = '6B6354'
const COLOR_BORDER = 'D5CEBB'
const COLOR_PAPER = 'FFFEF9'
const COLOR_WARN_BG = 'FFF3CD'
const COLOR_WARN_TEXT = '7A5C00'

/** Farben je Stufe – Kopie von LEVEL_STYLES im Frontend (ohne '#') */
export const LEVEL_COLORS = {
  T: { fill: 'D4EDDA', text: '1A5C32' },
  A: { fill: 'D0E4F7', text: '1A3A5C' },
  F: { fill: 'FFF3CD', text: '7A5C00' },
  B: { fill: 'FAD9C8', text: '7A2E00' },
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
const run = (text, options = {}) => new TextRun({ text, font: FONT, size: 22, color: COLOR_TEXT, ...options })
const para = (children, options = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], ...options })

function textParagraphs(text, options = {}) {
  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const warn = /^achtung:/i.test(line)
      return para(run(line, warn ? { bold: true, color: COLOR_WARN_TEXT } : {}), {
        spacing: { after: 120, line: 320 },
        ...(warn ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR_WARN_BG } } : {}),
        ...options,
      })
    })
}

function sectionHeading(text) {
  return para(run(text, { size: 18, bold: true, color: COLOR_PRIMARY, allCaps: true }), { spacing: { before: 240, after: 80 } })
}

function writingLines(count = 3) {
  return Array.from({ length: count }, () =>
    para(run(''), { border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER, space: 1 } }, spacing: { before: 200, after: 40 } }),
  )
}

function checkboxLines(options) {
  return options.map((option) => para([run('☐  ', { size: 26 }), run(option)], { spacing: { after: 100 }, indent: { left: convertInchesToTwip(0.2) } }))
}

/** Zwei Spalten: links die Begriffe in Originalreihenfolge, rechts die Zuordnungen um eins versetzt (damit nichts nebeneinander steht) */
function matchingTable(options) {
  const pairs = options.map((option) => {
    const [left, right = ''] = option.split('|').map((s) => s.trim())
    return { left, right }
  })
  const rights = pairs.map((p) => p.right)
  const rotated = rights.length > 1 ? [...rights.slice(1), rights[0]] : rights

  const cell = (text, align) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [para([run(align === 'right' ? '☐  ' : '', { size: 26 }), run(text)], { alignment: align === 'right' ? AlignmentType.LEFT : AlignmentType.RIGHT })],
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: pairs.map((pair, index) => new TableRow({ children: [cell(pair.left, 'left'), cell(rotated[index] ?? '', 'right')] })),
  })
}

function drawingBox() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: convertMillimetersToTwip(55), rule: HeightRule.EXACT },
        children: [
          new TableCell({
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFFFFF' },
            children: [para(run(''))],
          }),
        ],
      }),
    ],
  })
}

function aufgabeBlock(aufgabe, colors) {
  const label = AUFGABEN_TYP_LABEL[aufgabe.typ] ?? aufgabe.typ
  const symbol = aufgabe.piktogramm ? `${PIKTOGRAMME[aufgabe.piktogramm]?.symbol ?? ''}  ` : ''

  const blocks = [
    para([run(`${symbol}Aufgabe ${aufgabe.nr}: ${label}`, { bold: true, size: 24, color: colors.text })], {
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: colors.fill },
      spacing: { before: 280, after: 120 },
      keepNext: true,
    }),
    ...textParagraphs(aufgabe.anweisung, { keepNext: true }),
  ]

  const optionen = aufgabe.optionen ?? []
  switch (aufgabe.typ) {
    case 'reihenfolge':
    case 'ankreuzen':
      blocks.push(...checkboxLines(optionen))
      break
    case 'zuordnen':
      blocks.push(matchingTable(optionen))
      break
    case 'malen':
      blocks.push(drawingBox())
      break
    case 'praxis':
      blocks.push(para(run('(  ) Ja        (  ) Nein', { size: 24 }), { spacing: { before: 120, after: 120 }, indent: { left: convertInchesToTwip(0.2) } }))
      break
    default:
      blocks.push(...writingLines(3))
  }
  return blocks
}

/** Erzeugt das Word-Dokument eines KI-generierten Arbeitsblatts */
export function buildArbeitsblattDocument(w) {
  const colors = LEVEL_COLORS[w.stufe] ?? LEVEL_COLORS.T
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const formatLabel = FORMAT_LABEL[w.format] ?? w.format
  const bausteinInfo = [w.berufsfeld, w.baustein !== undefined ? `Baustein ${w.baustein}` : null, w.ausbildungsbaustein]
    .filter(Boolean)
    .join('  ·  ')

  const children = [
    para(run('BILDUNGSPARK HEILBRONN-FRANKEN', { size: 16, color: COLOR_PRIMARY, bold: true })),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [run(w.titel, { size: 36, bold: true })],
      spacing: { before: 120, after: 60 },
    }),
    para(run(bausteinInfo, { size: 20, color: COLOR_MUTED }), { spacing: { after: 80 } }),
    para(
      [
        run(`  Stufe ${w.stufe}  `, { size: 20, bold: true, color: colors.text, shading: { type: ShadingType.CLEAR, color: 'auto', fill: colors.fill } }),
        run(`   ${formatLabel}  ·  ${w.sprache}`, { size: 20, color: COLOR_MUTED }),
      ],
      { spacing: { after: 200 } },
    ),
    para(run('Name: ____________________________        Datum: ______________', { size: 20, color: COLOR_MUTED }), { spacing: { after: 240 } }),

    sectionHeading('Lernziel'),
    para(run(w.lernziel), { spacing: { after: 160 } }),

    sectionHeading('Darum geht es'),
    ...textParagraphs(w.einleitung),

    ...w.aufgaben.flatMap((aufgabe) => aufgabeBlock(aufgabe, colors)),
  ]

  if (w.woerterbuch?.length) {
    children.push(sectionHeading('Kleines Wörter-Buch'))
    for (const eintrag of w.woerterbuch) {
      children.push(para([run(`${eintrag.wort}: `, { bold: true }), run(eintrag.erklaerung)], { spacing: { after: 80 }, indent: { left: convertInchesToTwip(0.2) } }))
    }
  }

  if (w.hinweisAnleiter) {
    children.push(sectionHeading('Hinweis für die Lehrkraft'))
    children.push(
      para(run(w.hinweisAnleiter, { size: 20, color: COLOR_MUTED, italics: true }), {
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR_PAPER },
        border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        spacing: { after: 240 },
      }),
    )
  }

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          run(`Stufe ${w.stufe}  ·  ${formatLabel}  ·  ${w.sprache}  ·  ${datum}  ·  KI-generiert – fachliche Freigabe ausstehend  ·  Seite `, { size: 14, color: COLOR_MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: COLOR_MUTED }),
          run(' von ', { size: 14, color: COLOR_MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: COLOR_MUTED }),
        ],
      }),
    ],
  })

  const margin = convertInchesToTwip(1)
  return new Document({
    creator: 'Bildungspark Heilbronn-Franken – Arbeitsblattverwaltung',
    title: w.titel,
    description: `KI-generiertes Arbeitsblatt, Stufe ${w.stufe}, ${formatLabel}, ${w.sprache}`,
    sections: [
      {
        properties: { page: { margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        footers: { default: footer },
        children,
      },
    ],
  })
}

/** Word-Datei als Buffer (fuer res.send) */
export async function buildArbeitsblattDocx(worksheet) {
  return Packer.toBuffer(buildArbeitsblattDocument(worksheet))
}

/** Dateiname wie im Frontend (worksheetFileName), ergaenzt um Stufe und Format: Berufsfeld_BS1_Titel_T-text.docx */
export function arbeitsblattFileName(w) {
  const safe = (value) =>
    String(value ?? '')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/&/g, 'und')
      .replace(/\s+/g, '_')
  const titel = safe(w.titel).slice(0, 60)
  const baustein = w.baustein !== undefined ? `_BS${w.baustein}` : ''
  return `${safe(w.berufsfeld)}${baustein}_${titel}_${w.stufe}-${w.format}.docx`
}
