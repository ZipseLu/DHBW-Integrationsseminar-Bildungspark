/**
 * Sample assignments for `npm run db:seed` (BE-04).
 *
 * For every participant with an active station: up to three saved sheets of that
 * Berufsfeld (matching level first), the first one ticked off – so the learning
 * status shows done, open and "next" right after seeding. Only into an empty table;
 * `--reset` of worksheets or participants removes the assignments anyway (CASCADE).
 */
import { query } from '../db.js'
import * as teilnehmendeRepo from '../teilnehmende/repository.js'
import * as repo from './repository.js'

export const BLAETTER_JE_TEILNEHMER = 3

export async function seedZuordnungen({ log = () => {} } = {}) {
  if ((await repo.count()) > 0) {
    log('[seed] Es gibt schon Zuordnungen – nichts zu tun.')
    return { angelegt: 0, uebersprungen: true }
  }

  const teilnehmende = await teilnehmendeRepo.list()
  const blaetter = await query("SELECT id, berufsfeld, stufe FROM arbeitsblaetter WHERE status <> 'archiviert' ORDER BY baustein, titel, stufe")

  let angelegt = 0
  for (const teilnehmer of teilnehmende) {
    const aktiv = teilnehmer.stationen.find((station) => station.status === 'aktiv')
    if (!aktiv) continue
    const passend = blaetter
      .filter((blatt) => blatt.berufsfeld === aktiv.berufsfeld)
      .sort((a, b) => Number(b.stufe === aktiv.stufe) - Number(a.stufe === aktiv.stufe))
      .slice(0, BLAETTER_JE_TEILNEHMER)
    for (const [index, blatt] of passend.entries()) {
      const zuordnung = await repo.create(teilnehmer.kennung, { arbeitsblattId: blatt.id, zugeordnetVon: 'C. Hager' })
      if (index === 0) await repo.updateStatus(teilnehmer.kennung, zuordnung.id, 'erledigt')
      angelegt += 1
    }
  }

  log(`[seed] ${angelegt} Beispiel-Zuordnungen angelegt (je aktivem Berufsfeld bis zu ${BLAETTER_JE_TEILNEHMER} Blätter, das erste erledigt).`)
  return { angelegt, uebersprungen: false }
}
