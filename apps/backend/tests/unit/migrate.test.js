import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MIGRATIONS_DIR, listMigrationFiles, splitStatements } from '../../src/db/migrate.js'

describe('splitStatements', () => {
  it('trennt an Semikolons und entfernt Kommentarzeilen', () => {
    const sql = `-- Kommentar; mit Semikolon\nCREATE TABLE a (id INT);\n\n  -- noch einer\nINSERT INTO a VALUES (1);\n`
    expect(splitStatements(sql)).toEqual(['CREATE TABLE a (id INT)', 'INSERT INTO a VALUES (1)'])
  })

  it('liefert fuer leere Dateien keine Anweisungen', () => {
    expect(splitStatements('-- nur Kommentar\n\n')).toEqual([])
  })
})

describe('Migrationsdateien', () => {
  it('sind fortlaufend nummeriert (001_, 002_, …)', async () => {
    const files = await listMigrationFiles(MIGRATIONS_DIR)
    expect(files.length).toBeGreaterThan(0)
    files.forEach((name, index) => expect(name.startsWith(String(index + 1).padStart(3, '0') + '_')).toBe(true))
  })

  it('001 entfernt die nie befuellten Beispieltabellen vom 16.10.', async () => {
    const statements = splitStatements(await readFile(join(MIGRATIONS_DIR, '001_arbeitsblaetter.sql'), 'utf8'))
    for (const tabelle of ['level_contents', 'history_entries', 'stored_documents', 'worksheets']) {
      expect(statements).toContain(`DROP TABLE IF EXISTS \`${tabelle}\``)
    }
    expect(statements.some((s) => /CREATE TABLE IF NOT EXISTS `users`/.test(s))).toBe(true)
  })

  it('bestehen nur aus wiederholbaren Anweisungen (IF NOT EXISTS / IF EXISTS)', async () => {
    for (const name of await listMigrationFiles(MIGRATIONS_DIR)) {
      const statements = splitStatements(await readFile(join(MIGRATIONS_DIR, name), 'utf8'))
      for (const statement of statements) {
        if (/^CREATE TABLE/i.test(statement)) expect(statement).toMatch(/CREATE TABLE IF NOT EXISTS/i)
        if (/^DROP TABLE/i.test(statement)) expect(statement).toMatch(/DROP TABLE IF EXISTS/i)
      }
    }
  })
})
