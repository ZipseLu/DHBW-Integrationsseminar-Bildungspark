/**
 * Minimaler Migrations-Runner.
 *
 * Begriff: Eine "Migration" ist eine nummerierte SQL-Datei, die das
 * Datenbankschema von einem Stand zum nächsten bringt. Jede Datei läuft genau
 * einmal; welche schon gelaufen sind, steht in der Tabelle `schema_migrations`.
 *
 *   apps/backend/db/migrations/001_arbeitsblaetter.sql
 *   apps/backend/db/migrations/002_...sql   (nächste Änderung – nie 001 ändern!)
 *
 * Aufruf: `npm run db:migrate` (scripts/migrate.js) oder automatisch beim
 * Backend-Start (src/index.js), sobald die Datenbank erreichbar ist.
 *
 * Bewusst ohne Framework (Knex, Prisma): ~80 Zeilen, keine Abhängigkeit,
 * jeder im Team kann es lesen. Rollbacks gibt es nicht – im Zweifel eine
 * neue Migration schreiben, die den Fehler korrigiert.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withConnection } from '../db.js'

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations/', import.meta.url))

const LOCK_NAME = 'bildungspark_migrate'
const LOCK_TIMEOUT_S = 30

/**
 * Zerlegt eine SQL-Datei in einzelne Anweisungen.
 * mysql2 führt mit `query()` standardmäßig nur EINE Anweisung aus – das ist
 * sicherer als `multipleStatements` und reicht für unsere DDL-Dateien.
 * Kommentarzeilen (`-- …`) werden entfernt; Semikolons innerhalb von
 * Zeichenketten kommen in unseren Migrationen nicht vor.
 */
export function splitStatements(sql) {
  const ohneKommentare = sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
  return ohneKommentare
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
}

/** Alle Migrationsdateien, sortiert nach Dateiname (001_, 002_, …). */
export async function listMigrationFiles(dir = MIGRATIONS_DIR) {
  const entries = await readdir(dir)
  return entries.filter((name) => /^\d{3}_.+\.sql$/.test(name)).sort()
}

/**
 * Führt alle noch nicht angewendeten Migrationen aus.
 * @returns {Promise<{ applied: string[], skipped: string[] }>}
 */
export async function runMigrations({ dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  const files = await listMigrationFiles(dir)

  return withConnection(async (connection) => {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name       VARCHAR(120) NOT NULL,
         applied_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
         PRIMARY KEY (name)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    )

    // Sperre, damit Backend-Start und Testlauf nicht gleichzeitig migrieren
    const [[lock]] = await connection.query('SELECT GET_LOCK(?, ?) AS ok', [LOCK_NAME, LOCK_TIMEOUT_S])
    if (lock.ok !== 1) throw new Error('Migrationssperre nicht erhalten – läuft gerade eine andere Migration?')

    try {
      const [rows] = await connection.query('SELECT name FROM schema_migrations')
      const done = new Set(rows.map((row) => row.name))
      const applied = []
      const skipped = []

      for (const name of files) {
        if (done.has(name)) {
          skipped.push(name)
          continue
        }
        const sql = await readFile(join(dir, name), 'utf8')
        log(`[migrate] wende an: ${name}`)
        // DDL in MySQL beendet Transaktionen implizit – deshalb keine Transaktion,
        // sondern Anweisung für Anweisung; alle Dateien sind so geschrieben,
        // dass ein erneuter Lauf nach einem Abbruch unschädlich ist (IF NOT EXISTS).
        for (const statement of splitStatements(sql)) {
          await connection.query(statement)
        }
        await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [name])
        applied.push(name)
      }

      return { applied, skipped }
    } finally {
      await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME])
    }
  })
}
