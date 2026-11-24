import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx'

/**
 * Builds a small curriculum in the layout of the Bildungspark files (FE-34 tests):
 * header rows, "Ausbildungs-baustein N | title", then per learning goal one row
 * with the title and four rows T/A/F/B with competence and example.
 *
 * @param {{ baustein?: number|null, titel?: string, lernziele?: Array<{ titel: string, stufen?: string[] }> }} [aufbau]
 */
export async function lehrplanDocx({ baustein = 1, titel = 'Wareneingang', lernziele = [{ titel: 'Güter entladen' }, { titel: 'Begleitpapiere prüfen' }] } = {}) {
  const zeile = (...texte) => new TableRow({ children: texte.map((text) => new TableCell({ children: [new Paragraph(text)] })) })
  const rows = [
    zeile('Teilqualifizierung für die Ausbildungsberufe als Fachlagerist (IHK)'),
    zeile('', 'Stufe', 'Binnendifferenzierung', 'Beispiel'),
  ]
  if (baustein !== null) rows.push(zeile(`Ausbildungs-baustein ${baustein}`, '', titel))
  for (const ziel of lernziele) {
    rows.push(zeile(ziel.titel))
    for (const stufe of ziel.stufen ?? ['T', 'A', 'F', 'B']) rows.push(zeile('', stufe, `Kompetenz ${stufe}`, `Beispiel ${stufe}`))
  }
  const doc = new Document({ sections: [{ children: [new Table({ rows })] }] })
  return Packer.toBuffer(doc)
}

/** A Word file without a curriculum table */
export async function briefDocx() {
  return Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('Sehr geehrte Damen und Herren')] }] }))
}
