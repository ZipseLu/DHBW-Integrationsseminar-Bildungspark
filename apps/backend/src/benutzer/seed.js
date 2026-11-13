/**
 * Sample accounts for `npm run db:seed` (BE-03).
 *
 * The same four accounts as in the frontend (apps/frontend/src/data/users.ts), addresses on the
 * reserved .example domain – no real accounts. All get the same initial password from
 * SEED_PASSWORT; if unset, a random one is generated and logged once. ONLY for local development and demos.
 */
import { randomBytes } from 'node:crypto'
import * as repo from './repository.js'

export const BEISPIEL_KONTEN = [
  { name: 'Celine Hager', email: 'c.hager@bildungspark.example', rolle: 'admin' },
  { name: 'A. Mustajbegovic', email: 'a.mustajbegovic@bildungspark.example', rolle: 'dozent' },
  { name: 'T. Neumann', email: 't.neumann@bildungspark.example', rolle: 'dozent' },
  { name: 'S. Oturucu', email: 's.oturucu@bildungspark.example', rolle: 'assistent' },
]

/**
 * Creates the sample accounts – only into an empty table; with `reset`, deletes everything first.
 * @returns {Promise<{angelegt: number, uebersprungen: boolean}>}
 */
export async function seedBenutzer({ reset = false, passwort = process.env.SEED_PASSWORT || randomBytes(9).toString('base64url'), log = () => {} } = {}) {
  if (!reset && (await repo.count()) > 0) {
    log('[seed] Es gibt schon Mitarbeiterkonten – nichts zu tun.')
    return { angelegt: 0, uebersprungen: true }
  }
  if (reset) {
    await repo.deleteAll()
    log('[seed] Alle vorhandenen Mitarbeiterkonten gelöscht (--reset).')
  }
  for (const konto of BEISPIEL_KONTEN) await repo.create({ ...konto, passwort })
  log(`[seed] ${BEISPIEL_KONTEN.length} Beispielkonten angelegt (Startpasswort: ${process.env.SEED_PASSWORT ? 'aus SEED_PASSWORT' : passwort}).`)
  return { angelegt: BEISPIEL_KONTEN.length, uebersprungen: false }
}
