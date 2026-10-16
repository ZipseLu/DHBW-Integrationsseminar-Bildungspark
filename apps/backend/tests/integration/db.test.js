import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { query, closePool } from '../../src/db.js'

/**
 * Integrationstests gegen eine echte MySQL.
 *
 * laeuft ausschliesslich mit gesetzter DB_HOST – also nur im Docker-Compose
 * (`docker compose --profile test run --rm backend-test`).
 * Ohne Datenbank werden die Tests uebersprungen statt rot.
 */
const hasDb = Boolean(process.env.DB_HOST)

describe.skipIf(!hasDb)('MySQL-Verbindung', () => {
  afterAll(async () => {
    await closePool()
  })

  it('verbindet sich zur Testdatenbank', async () => {
    const rows = await query('SELECT DATABASE() AS db')
    expect(rows[0].db).toBe(process.env.DB_NAME)
  })

  it('kann eine einfache Query ausfuehren', async () => {
    const rows = await query('SELECT 1 + 1 AS summe')
    expect(Number(rows[0].summe)).toBe(2)
  })

  it('routet auf die Testdatenbank, nicht auf Produktivdaten', async () => {
    const rows = await query('SELECT DATABASE() AS db')
    expect(rows[0].db).toContain('test')
  })

  it('speichert und liest deutsche Umlaute + Emoji korrekt (utf8mb4)', async () => {
    // Das ist der wichtigste Test: Arbeitsblaetter enthalten "äöüß"
    // UND Piktogramm-Emoji. Mit falschem Charset zerfallen beide.
    const value = 'Gefahrgut: ä ö ü ß – 🏗️ 📦'
    await query('SELECT ? AS wert', [value])
    const rows = await query('SELECT ? AS wert', [value])
    expect(rows[0].wert).toBe(value)
  })
})

describe.skipIf(hasDb)('MySQL-Verbindung (uebersprungen)', () => {
  it('laeuft nicht ohne DB_HOST – setze DB_HOST oder starte ueber Compose', () => {
    expect(hasDb).toBe(false)
  })
})
