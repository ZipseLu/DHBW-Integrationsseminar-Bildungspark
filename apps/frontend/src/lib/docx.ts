import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from 'docx'
import { saveAs } from 'file-saver'
import { LEVELS, LEVEL_STYLES } from '@/data/constants'
import type { Level, Worksheet } from '@/types'

const FONT = 'Calibri'
const COLOR_PRIMARY = '1E3A5F'
const COLOR_TEXT = '1A1714'
const COLOR_MUTED = '6B6354'
const COLOR_BORDER = 'D5CEBB'
const COLOR_PAPER = 'FFFEF9'

/** '#D4EDDA' -> 'D4EDDA' (docx erwartet Hex ohne #) */
const hex = (color: string) => color.replace('#', '')

const levelColors = (level: Level) => ({
  fill: hex(LEVEL_STYLES[level].bg),
  text: hex(LEVEL_STYLES[level].text),
})

/** Erzeugt das Word-Dokument eines Arbeitsblatts mit der Niveau-Tabelle T/A/F/B */
export function buildWorksheetDocument(w: Worksheet): Document {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

  const header = [
    new Paragraph({
      children: [new TextRun({ text: 'BILDUNGSPARK HEILBRONN-FRANKEN', size: 16, color: COLOR_PRIMARY, bold: true, font: FONT })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: w.title, size: 36, bold: true, color: COLOR_TEXT, font: FONT })],
      spacing: { before: 120, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${w.berufsbild}  ·  Baustein ${w.baustein}  ·  ${w.ausbildungsbaustein}`,
          size: 20,
          color: COLOR_MUTED,
          font: FONT,
        }),
      ],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Abschnitt', size: 18, bold: true, color: COLOR_PRIMARY, font: FONT, allCaps: true })],
      spacing: { before: 120, after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: w.abschnitt.titel, size: 22, color: COLOR_TEXT, font: FONT })],
      spacing: { after: 360 },
    }),
  ]

  const headerRow = new TableRow({
    tableHeader: true,
    children: LEVELS.map((level) => {
      const c = levelColors(level)
      return new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: c.fill },
        borders: {
          top: noBorder,
          bottom: { style: BorderStyle.SINGLE, size: 2, color: c.text },
          left: noBorder,
          right: noBorder,
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: level, bold: true, size: 28, color: c.text, font: FONT }),
              new TextRun({ text: LEVEL_STYLES[level].label, size: 16, color: c.text, font: FONT, break: 1 }),
            ],
            spacing: { before: 80, after: 80 },
          }),
        ],
      })
    }),
  })

  const contentRow = new TableRow({
    children: LEVELS.map((level) => {
      const c = levelColors(level)
      const row = w.abschnitt.niveaus[level]
      return new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR_PAPER },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
          left: noBorder,
          right: noBorder,
        },
        margins: {
          top: convertInchesToTwip(0.08),
          bottom: convertInchesToTwip(0.08),
          left: convertInchesToTwip(0.1),
          right: convertInchesToTwip(0.1),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Kompetenz', size: 14, color: COLOR_MUTED, bold: true, font: FONT, allCaps: true })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: row.kompetenz, size: 18, color: COLOR_TEXT, font: FONT })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Aufgabe / Beispiel', size: 14, color: c.text, bold: true, font: FONT, allCaps: true })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: c.fill },
            children: [new TextRun({ text: row.beispiel, size: 18, color: c.text, italics: true, font: FONT })],
            spacing: { before: 40, after: 40 },
            indent: { left: convertInchesToTwip(0.08) },
          }),
        ],
      })
    }),
  })

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, contentRow],
  })

  const footer = [
    new Paragraph({ spacing: { before: 480 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Erstellt von: ${w.createdBy}  ·  Datum: ${w.date}  ·  ${w.aiGenerated ? 'KI-generiert' : 'Manuell erstellt'}`,
          size: 16,
          color: COLOR_MUTED,
          font: FONT,
        }),
      ],
    }),
  ]

  const margin = convertInchesToTwip(1.2)

  return new Document({
    creator: 'Bildungspark Heilbronn-Franken – Arbeitsblattverwaltung',
    title: w.title,
    sections: [
      {
        properties: { page: { margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        children: [...header, table, ...footer],
      },
    ],
  })
}

/** Dateiname ohne Zeichen, die unter Windows nicht erlaubt sind */
export function worksheetFileName(w: Worksheet): string {
  const safe = (value: string) =>
    value
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/&/g, 'und')
      .replace(/\s+/g, '_')
  return `${safe(w.berufsbild)}_BS${w.baustein}_${safe(w.title)}.docx`
}

export async function downloadWorksheetDocx(w: Worksheet): Promise<void> {
  const blob = await Packer.toBlob(buildWorksheetDocument(w))
  saveAs(blob, worksheetFileName(w))
}
