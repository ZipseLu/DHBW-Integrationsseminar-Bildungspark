/**
 * Importiert die 14 Lehrplan-Dokumente (DOCX) des Bildungsparks nach
 * apps/backend/data/lehrplaene.json.
 *
 * Aufruf:
 *   npm run import:lehrplaene                    (Ordner: ../context/WG__Unterlagen_BIldungspark neben dem Repo)
 *   npm run import:lehrplaene -- /pfad/zum/ordner
 *   LEHRPLAN_DIR=/pfad npm run import:lehrplaene
 *
 * Die JSON-Datei steht in .gitignore: Die Lehrplaene gehoeren dem Bildungspark,
 * das Repository ist oeffentlich. Jedes Teammitglied erzeugt die Datei lokal.
 * GET /api/lehrplaene liefert den Inhalt; ohne Datei nutzt das Frontend die
 * 12 Beispiel-Lernziele aus apps/frontend/src/data/worksheets.ts.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { berufsfeldFromFileName, parseLehrplanDocx, STUFEN } from '../src/lehrplan/parser.js'

const backendRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = resolve(backendRoot, '../..')
const sourceDir = resolve(process.argv[2] ?? process.env.LEHRPLAN_DIR ?? resolve(repoRoot, '../context/WG__Unterlagen_BIldungspark'))
const targetFile = join(backendRoot, 'data', 'lehrplaene.json')

const BERUFSFELD_ORDER = ['Lagerlogistik, Handel & Versand', 'Metalltechnik & Montage', 'Gastronomie & Hauswirtschaft']

let files
try {
  files = readdirSync(sourceDir).filter((name) => /^Binnendifferenzierter Lehrplan.*\.docx$/i.test(name) && !name.startsWith('~$'))
} catch (error) {
  console.error(`[import] Ordner nicht lesbar: ${sourceDir} (${error.message})`)
  console.error('[import] Pfad als Argument oder LEHRPLAN_DIR übergeben.')
  process.exit(1)
}

if (files.length === 0) {
  console.error(`[import] Keine Lehrplan-Dateien (Binnendifferenzierter Lehrplan*.docx) in ${sourceDir}`)
  process.exit(1)
}

const lernziele = []
const probleme = []
const summary = {}

files
  .map((name) => ({ name, berufsfeld: berufsfeldFromFileName(name) }))
  .sort((a, b) => BERUFSFELD_ORDER.indexOf(a.berufsfeld) - BERUFSFELD_ORDER.indexOf(b.berufsfeld) || a.name.localeCompare(b.name, 'de'))
  .forEach(({ name, berufsfeld }) => {
    if (!berufsfeld) {
      probleme.push(`${name}: Berufsfeld nicht erkennbar – übersprungen`)
      return
    }
    const parsed = parseLehrplanDocx(readFileSync(join(sourceDir, name)))
    if (parsed.baustein === null) probleme.push(`${name}: Zeile "Ausbildungs-baustein N" nicht gefunden`)

    for (const ziel of parsed.lernziele) {
      const fehlend = STUFEN.filter((s) => !ziel.niveaus[s])
      if (fehlend.length) probleme.push(`${name}: "${ziel.titel.slice(0, 50)}" ohne Stufe ${fehlend.join(', ')}`)
      lernziele.push({
        id: lernziele.length + 1,
        berufsfeld,
        tq: parsed.tq,
        baustein: parsed.baustein,
        ausbildungsbaustein: parsed.ausbildungsbaustein,
        abschnitt: ziel.abschnitt,
        titel: ziel.titel,
        niveaus: Object.fromEntries(STUFEN.map((s) => [s, ziel.niveaus[s] ?? { kompetenz: '', beispiel: '' }])),
        quelle: name,
      })
    }
    summary[berufsfeld] = (summary[berufsfeld] ?? 0) + parsed.lernziele.length
    console.log(`  ${String(parsed.lernziele.length).padStart(2)} Lernziele  Baustein ${parsed.baustein ?? '?'}  ${name}`)
  })

mkdirSync(join(backendRoot, 'data'), { recursive: true })
writeFileSync(
  targetFile,
  JSON.stringify({ stand: new Date().toISOString().slice(0, 10), quelle: basename(sourceDir), anzahl: lernziele.length, lernziele }, null, 2),
)

console.log(`\n[import] ${lernziele.length} Lernziele aus ${files.length} Dateien -> ${targetFile}`)
for (const [berufsfeld, count] of Object.entries(summary)) console.log(`  ${count}  ${berufsfeld}`)
if (probleme.length) {
  console.log(`\n[import] ${probleme.length} Hinweise (Datenqualität der Quelldateien):`)
  for (const p of probleme) console.log(`  - ${p}`)
}
