/**
 * `npm run db:seed`            Beispiel-Arbeitsblätter anlegen (nur in eine leere Tabelle)
 * `npm run db:seed -- --reset` vorher alle Arbeitsblätter löschen
 * `npm run db:seed -- --lernziele=10`  Anzahl Lernziele (je vier Stufen)
 *
 * Legt außerdem die fünf Beispiel-Teilnehmenden (BE-02) und die vier Beispiel-Mitarbeiterkonten
 * (BE-03, Startpasswort aus SEED_PASSWORT, sonst zufällig und einmalig im Log) aus dem Frontend an.
 */
import { describeConfig } from '../src/config.js'
import { closePool } from '../src/db.js'
import { runMigrations } from '../src/db/migrate.js'
import { seedArbeitsblaetter } from '../src/arbeitsblaetter/seed.js'
import { seedTeilnehmende } from '../src/teilnehmende/seed.js'
import { seedBenutzer } from '../src/benutzer/seed.js'

const args = process.argv.slice(2)
const reset = args.includes('--reset')
const lernziele = Number.parseInt(args.find((a) => a.startsWith('--lernziele='))?.split('=')[1] ?? '6', 10)
if (!Number.isInteger(lernziele) || lernziele < 1) {
  console.error('[seed] --lernziele muss eine ganze Zahl ≥ 1 sein.')
  process.exit(1)
}

try {
  console.log(`[seed] Datenbank: ${describeConfig().db}`)
  await runMigrations({ log: console.log })
  await seedArbeitsblaetter({ reset, lernziele, log: console.log })
  await seedTeilnehmende({ reset, log: console.log })
  await seedBenutzer({ reset, log: console.log })
} catch (error) {
  console.error('[seed] FEHLER:', error.message)
  process.exitCode = 1
} finally {
  await closePool()
}
