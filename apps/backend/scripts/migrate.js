/**
 * `npm run db:migrate` – Schema auf den neuesten Stand bringen.
 * Verbindungsdaten kommen aus der .env (DB_* bzw. MYSQL_*), siehe src/config.js.
 */
import { config, describeConfig } from '../src/config.js'
import { closePool } from '../src/db.js'
import { runMigrations } from '../src/db/migrate.js'

try {
  console.log(`[migrate] Datenbank: ${describeConfig().db}`)
  const { applied, skipped } = await runMigrations({ log: console.log })
  console.log(`[migrate] fertig – ${applied.length} neu, ${skipped.length} bereits vorhanden.`)
} catch (error) {
  console.error('[migrate] FEHLER:', error.message)
  if (error.code === 'ECONNREFUSED') {
    console.error(`[migrate] Keine MySQL unter ${config.db.host}:${config.db.port}. Docker: \`docker compose up -d db\` (Port 3307).`)
  }
  process.exitCode = 1
} finally {
  await closePool()
}
