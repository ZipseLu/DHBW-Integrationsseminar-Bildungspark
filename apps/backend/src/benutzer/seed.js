/**
 * Beispielkonten für `npm run db:seed` (BE-03).
 *
 * Dieselben vier Konten wie im Frontend (apps/frontend/src/data/users.ts), Adressen auf der
 * reservierten Domain .example – keine echten Konten. Alle bekommen dasselbe Startpasswort
 * aus SEED_PASSWORT (Standard: bildungspark-demo). NUR für die lokale Entwicklung und Demos.
 */
import * as repo from './repository.js'

export const STANDARD_SEED_PASSWORT = 'bildungspark-demo'

export const BEISPIEL_KONTEN = [
  { name: 'Celine Hager', email: 'c.hager@bildungspark.example', rolle: 'admin' },
  { name: 'A. Mustajbegovic', email: 'a.mustajbegovic@bildungspark.example', rolle: 'dozent' },
  { name: 'T. Neumann', email: 't.neumann@bildungspark.example', rolle: 'dozent' },
  { name: 'S. Oturucu', email: 's.oturucu@bildungspark.example', rolle: 'assistent' },
]

/**
 * Legt die Beispielkonten an – nur in eine leere Tabelle, mit `reset` vorher alles löschen.
 * @returns {Promise<{angelegt: number, uebersprungen: boolean}>}
 */
export async function seedBenutzer({ reset = false, passwort = process.env.SEED_PASSWORT || STANDARD_SEED_PASSWORT, log = () => {} } = {}) {
  if (!reset && (await repo.count()) > 0) {
    log('[seed] Es gibt schon Mitarbeiterkonten – nichts zu tun.')
    return { angelegt: 0, uebersprungen: true }
  }
  if (reset) {
    await repo.deleteAll()
    log('[seed] Alle vorhandenen Mitarbeiterkonten gelöscht (--reset).')
  }
  for (const konto of BEISPIEL_KONTEN) await repo.create({ ...konto, passwort })
  log(`[seed] ${BEISPIEL_KONTEN.length} Beispielkonten angelegt (Startpasswort aus SEED_PASSWORT bzw. „${STANDARD_SEED_PASSWORT}“).`)
  return { angelegt: BEISPIEL_KONTEN.length, uebersprungen: false }
}
