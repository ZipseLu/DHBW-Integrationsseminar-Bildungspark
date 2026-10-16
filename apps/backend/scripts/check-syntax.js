/**
 * Syntaxpruefung fuer alle Quelldateien.
 *
 * Das Backend ist reines JavaScript ohne Build-Schritt. Damit trotzdem ein
 * Syntaxfehler den PR blockiert (statt erst zur Laufzeit aufzufallen),
 * laeuft `node --check` ueber jede Datei in src/ und scripts/.
 *
 * Bewusst kein ESLint: haelt die Toolchain fuer den Prototyp klein.
 * Sollte das Projekt groesser werden, ist `npm i -D eslint` der naechste Schritt.
 *
 * Aufruf:  npm run check
 */
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const roots = ['src', 'scripts']

function collect(dir) {
  const files = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    // Verzeichnis existiert nicht -> ueberspringen
    return files
  }

  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collect(full))
    } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
      files.push(full)
    }
  }
  return files
}

const files = roots.flatMap((root) => collect(join(projectRoot, root)))

if (files.length === 0) {
  console.error('[check] Keine Quelldateien gefunden – Pfade pruefen.')
  process.exit(1)
}

const failures = []

for (const file of files) {
  const display = relative(projectRoot, file).replaceAll('\\', '/')
  try {
    // --check parst die Datei, ohne sie auszufuehren
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    console.log(`  ok  ${display}`)
  } catch (error) {
    failures.push(display)
    console.error(`  FEHLER  ${display}`)
    console.error(String(error.stderr ?? error.message))
  }
}

console.log(`\n[check] ${files.length - failures.length}/${files.length} Dateien syntaktisch korrekt.`)

if (failures.length > 0) {
  console.error(`[check] Fehlgeschlagen: ${failures.join(', ')}`)
  process.exit(1)
}
