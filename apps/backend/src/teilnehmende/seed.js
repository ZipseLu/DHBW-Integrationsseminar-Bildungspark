/**
 * Beispiel-Teilnehmende für `npm run db:seed` (BE-02).
 *
 * Dieselben fünf pseudonymen Profile wie im Frontend (apps/frontend/src/data/participants.ts),
 * damit Prototyp und Datenbank zusammenpassen. Keine Namen, keine Diagnosen (§ 60 SGB IX).
 */
import * as repo from './repository.js'

const LAGER = 'Lagerlogistik, Handel & Versand'
const GASTRO = 'Gastronomie & Hauswirtschaft'
const METALL = 'Metalltechnik & Montage'
const GALA = 'Garten- und Landschaftsbau'

const st = (berufsfeld, stufe, format, status, fortschritt, startDatum, endDatum, blaetterErledigt) => ({
  berufsfeld, stufe, format, status, fortschritt, startDatum, endDatum, blaetterErledigt,
})

export const BEISPIEL_TEILNEHMENDE = [
  {
    kennung: 'IW3-4421', stufe: 'A',
    stationen: [
      st(GALA, 'T', 'piktogramm', 'abgeschlossen', 100, '2026-06-01', '2026-07-12', 8),
      st(LAGER, 'A', 'text', 'aktiv', 68, '2026-07-13', null, 3),
      st(METALL, 'A', 'mathefrei', 'ausstehend', 0, null, null, 0),
    ],
  },
  {
    kennung: 'IW3-4388', stufe: 'F',
    stationen: [
      st(GASTRO, 'T', 'text', 'abgeschlossen', 100, '2026-05-15', '2026-06-30', 5),
      st(METALL, 'A', 'piktogramm', 'abgeschlossen', 100, '2026-07-01', '2026-08-28', 3),
      st(LAGER, 'F', 'piktogramm-mathefrei', 'aktiv', 82, '2026-08-29', null, 3),
    ],
  },
  {
    kennung: 'IW3-4412', stufe: 'T',
    stationen: [
      st(GASTRO, 'T', 'piktogramm-mathefrei', 'aktiv', 34, '2026-09-01', null, 2),
      st(GALA, 'T', 'piktogramm', 'ausstehend', 0, null, null, 0),
    ],
  },
  {
    kennung: 'IW3-4399', stufe: 'A',
    stationen: [
      st(GALA, 'T', 'mathefrei', 'abgeschlossen', 100, '2026-06-10', '2026-07-20', 8),
      st(GASTRO, 'A', 'text', 'aktiv', 57, '2026-07-21', null, 3),
    ],
  },
  {
    kennung: 'IW3-4401', stufe: 'T',
    stationen: [
      st(METALL, 'T', 'text', 'aktiv', 21, '2026-09-08', null, 1),
      st(LAGER, 'T', 'piktogramm', 'ausstehend', 0, null, null, 0),
      st(GASTRO, 'T', 'mathefrei', 'ausstehend', 0, null, null, 0),
    ],
  },
]

/**
 * Legt die Beispiel-Teilnehmenden an – nur in eine leere Tabelle, mit `reset` vorher alles löschen.
 * @returns {Promise<{angelegt: number, uebersprungen: boolean}>}
 */
export async function seedTeilnehmende({ reset = false, log = () => {} } = {}) {
  if (!reset && (await repo.count()) > 0) {
    log('[seed] Es gibt schon Teilnehmende – nichts zu tun.')
    return { angelegt: 0, uebersprungen: true }
  }
  if (reset) {
    await repo.deleteAll()
    log('[seed] Alle vorhandenen Teilnehmenden gelöscht (--reset).')
  }
  for (const profil of BEISPIEL_TEILNEHMENDE) await repo.create(profil)
  log(`[seed] ${BEISPIEL_TEILNEHMENDE.length} Beispiel-Teilnehmende angelegt.`)
  return { angelegt: BEISPIEL_TEILNEHMENDE.length, uebersprungen: false }
}
