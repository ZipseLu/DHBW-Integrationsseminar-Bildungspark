import { BorderStyle, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, convertInchesToTwip } from 'docx'
import { saveAs } from 'file-saver'
import { LEVELS, LEVEL_STYLES } from '@/data/constants'
import { bausteinLabel, type LehrplanDokument } from '@/lib/lehrplaene'

const FONT = 'Calibri'
const hex = (color: string) => color.replace('#', '')
const border = { style: BorderStyle.SINGLE, size: 1, color: 'D5CEBB' }
const borders = { top: border, bottom: border, left: border, right: border }

function cell(text: string, options: { bold?: boolean; color?: string; fill?: string; width: number; italics?: boolean }) {
  return new TableCell({
    width: { size: options.width, type: WidthType.PERCENTAGE },
    borders,
    shading: options.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: options.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: options.bold, italics: options.italics, color: options.color, size: 18, font: FONT })] })],
  })
}

/**
 * Word-Fassung eines Lehrplans: je Lernziel eine Tabelle
 * Stufe | Binnendifferenzierung | Beispiel – wie in den Original-Lehrplänen.
 */
export function buildLehrplanDocument(doc: LehrplanDokument): Document {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: 'BILDUNGSPARK HEILBRONN-FRANKEN', size: 16, bold: true, color: '1E3A5F', font: FONT })] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: `Binnendifferenzierter Lehrplan – ${doc.ausbildungsbaustein}`, size: 32, bold: true, font: FONT })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: `${doc.berufsfeld} · ${doc.tq} · ${bausteinLabel(doc)}`, size: 20, color: '6B6354', font: FONT })],
    }),
  ]

  doc.lernziele.forEach((ziel, index) => {
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: `${index + 1}. ${ziel.titel}`, size: 22, bold: true, font: FONT })],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell('Stufe', { bold: true, width: 10, fill: 'EBE5D6' }),
              cell('Binnendifferenzierung', { bold: true, width: 50, fill: 'EBE5D6' }),
              cell('Beispiel', { bold: true, width: 40, fill: 'EBE5D6' }),
            ],
          }),
          ...LEVELS.map((level) => {
            const s = LEVEL_STYLES[level]
            const row = ziel.niveaus[level]
            return new TableRow({
              children: [
                cell(level, { bold: true, color: hex(s.text), fill: hex(s.bg), width: 10 }),
                cell(row?.kompetenz ?? '', { width: 50 }),
                cell(row?.beispiel ?? '', { width: 40, italics: true }),
              ],
            })
          }),
        ],
      }),
    )
  })

  const margin = convertInchesToTwip(1)
  return new Document({
    creator: 'Bildungspark Heilbronn-Franken – Arbeitsblattverwaltung',
    title: `Lehrplan ${doc.ausbildungsbaustein}`,
    sections: [{ properties: { page: { margin: { top: margin, bottom: margin, left: margin, right: margin } } }, children }],
  })
}

export function lehrplanFileName(doc: LehrplanDokument): string {
  const safe = (value: string) => value.replace(/[\\/:*?"<>|]/g, '').replace(/&/g, 'und').replace(/\s+/g, '_')
  const abschnitt = doc.abschnitt ? `_Abschnitt${doc.abschnitt}` : ''
  return `Lehrplan_${safe(doc.berufsfeld)}_BS${doc.baustein}${abschnitt}_${safe(doc.ausbildungsbaustein)}.docx`
}

export async function downloadLehrplanDocx(doc: LehrplanDokument): Promise<void> {
  const blob = await Packer.toBlob(buildLehrplanDocument(doc))
  saveAs(blob, lehrplanFileName(doc))
}
