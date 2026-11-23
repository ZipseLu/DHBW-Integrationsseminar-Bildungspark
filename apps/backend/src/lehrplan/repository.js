/**
 * Datenzugriff für die Lehrpläne (Migration 005: lehrplaene, lernziele, lernziel_niveaus).
 *
 * Nach außen dieselbe Form wie die frühere JSON-Datei (GET /api/lehrplaene, Frontend-Typ
 * LehrplanLernziel): { id, berufsfeld, tq, baustein, ausbildungsbaustein, abschnitt,
 * titel, niveaus: { T, A, F, B }, quelle } – das Frontend merkt den Wechsel nicht.
 */
import { query, queryOne, withConnection } from '../db.js'
import { STUFEN } from './parser.js'
import { LehrplanImportSchema } from './schema.js'

const zahlOderNull = (value) => (value === null || value === undefined ? null : Number(value))

/** Alle Lernziele mit ihren vier Stufen, in Import-Reihenfolge – zwei Abfragen insgesamt */
export async function listLernziele() {
  const rows = await query(
    `SELECT z.id, z.abschnitt, z.titel, p.berufsfeld, p.tq, p.baustein, p.ausbildungsbaustein, p.quelle
       FROM lernziele z
       JOIN lehrplaene p ON p.id = z.lehrplan_id
      ORDER BY z.id`,
  )
  const niveauRows = await query('SELECT lernziel_id, stufe, kompetenz, beispiel FROM lernziel_niveaus')
  const niveaus = new Map()
  for (const row of niveauRows) {
    const id = Number(row.lernziel_id)
    if (!niveaus.has(id)) niveaus.set(id, {})
    niveaus.get(id)[row.stufe] = { kompetenz: row.kompetenz, beispiel: row.beispiel }
  }
  return rows.map((row) => {
    const id = Number(row.id)
    return {
      id,
      berufsfeld: row.berufsfeld,
      tq: row.tq ?? null,
      baustein: zahlOderNull(row.baustein),
      ausbildungsbaustein: row.ausbildungsbaustein ?? null,
      abschnitt: zahlOderNull(row.abschnitt),
      titel: row.titel,
      niveaus: Object.fromEntries(STUFEN.map((stufe) => [stufe, niveaus.get(id)?.[stufe] ?? { kompetenz: '', beispiel: '' }])),
      quelle: row.quelle,
    }
  })
}

/**
 * UTC-DATETIME aus MySQL ('2026-11-03 23:30:00.000') als Datum in Europe/Berlin.
 * Zwischen 0 und 1 Uhr (Winterzeit) liegt der UTC-Tag sonst einen Tag zurück.
 */
export function berlinerDatum(wert) {
  const datum = new Date(`${String(wert).replace(' ', 'T')}Z`)
  if (Number.isNaN(datum.getTime())) return null
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(datum)
}

/** Datum des letzten Imports (JJJJ-MM-TT, Europe/Berlin) oder null, wenn noch nichts importiert ist */
export async function stand() {
  const row = await queryOne('SELECT MAX(importiert_am) AS stand FROM lehrplaene')
  return row?.stand ? berlinerDatum(row.stand) : null
}

export async function count() {
  const row = await queryOne('SELECT COUNT(*) AS anzahl FROM lernziele')
  return Number(row?.anzahl ?? 0)
}

/** Ungültige Lehrplandaten (z. B. kaputte JSON-Datei) – nichts wurde geschrieben */
export class LehrplanDatenError extends Error {
  constructor(message) {
    super(message)
    this.name = 'LehrplanDatenError'
  }
}

/**
 * Ersetzt alle Lehrpläne durch `lernziele` (Format der JSON-Datei bzw. des Imports).
 * In einer Transaktion: Danach steht entweder der neue Stand vollständig in der
 * Datenbank oder weiterhin der alte.
 * @returns {Promise<{lehrplaene: number, lernziele: number}>}
 */
export async function ersetzeAlle(lernziele) {
  const parsed = LehrplanImportSchema.safeParse(lernziele)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new LehrplanDatenError(`Lehrplandaten ungültig bei ${issue.path.join('.') || 'Liste'}: ${issue.message}`)
  }

  return withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      // CASCADE entfernt Lernziele und Stufen mit
      await connection.query('DELETE FROM lehrplaene')
      const jetzt = new Date()
      const lehrplanIds = new Map()
      for (const ziel of parsed.data) {
        let lehrplanId = lehrplanIds.get(ziel.quelle)
        if (lehrplanId === undefined) {
          const [result] = await connection.execute(
            'INSERT INTO lehrplaene (berufsfeld, baustein, ausbildungsbaustein, tq, quelle, importiert_am) VALUES (?, ?, ?, ?, ?, ?)',
            [ziel.berufsfeld, ziel.baustein, ziel.ausbildungsbaustein, ziel.tq, ziel.quelle, jetzt],
          )
          lehrplanId = result.insertId
          lehrplanIds.set(ziel.quelle, lehrplanId)
        }
        await connection.execute('INSERT INTO lernziele (id, lehrplan_id, abschnitt, titel) VALUES (?, ?, ?, ?)', [ziel.id, lehrplanId, ziel.abschnitt, ziel.titel])
        await connection.execute(
          `INSERT INTO lernziel_niveaus (lernziel_id, stufe, kompetenz, beispiel) VALUES ${STUFEN.map(() => '(?, ?, ?, ?)').join(', ')}`,
          STUFEN.flatMap((stufe) => [ziel.id, stufe, ziel.niveaus[stufe].kompetenz, ziel.niveaus[stufe].beispiel]),
        )
      }
      await connection.commit()
      return { lehrplaene: lehrplanIds.size, lernziele: parsed.data.length }
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

/** FE-34: true if a curriculum with this file name is already stored (it would be replaced) */
export async function quelleVorhanden(quelle) {
  const row = await queryOne('SELECT id FROM lehrplaene WHERE quelle = ?', [quelle])
  return Boolean(row)
}

/**
 * FE-34: adds one curriculum (result of leseLehrplanDatei) in one transaction.
 * A curriculum with the same file name is replaced (new version); its learning
 * goals are removed by ON DELETE CASCADE. New learning goals get the next free
 * ids, so the ids of all other learning goals stay the same.
 *
 * @returns {Promise<{ lernziele: number, ersetzt: boolean }>}
 */
export async function fuegeLehrplanHinzu(lehrplan) {
  return withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      const [geloescht] = await connection.execute('DELETE FROM lehrplaene WHERE quelle = ?', [lehrplan.quelle])
      const [result] = await connection.execute(
        'INSERT INTO lehrplaene (berufsfeld, baustein, ausbildungsbaustein, tq, quelle, importiert_am) VALUES (?, ?, ?, ?, ?, ?)',
        [lehrplan.berufsfeld, lehrplan.baustein, lehrplan.ausbildungsbaustein, lehrplan.tq, lehrplan.quelle, new Date()],
      )
      const lehrplanId = result.insertId
      // Lock the id range so two uploads at the same time cannot pick the same ids
      const [[{ naechste }]] = await connection.query('SELECT COALESCE(MAX(id), 0) + 1 AS naechste FROM lernziele FOR UPDATE')
      let id = Number(naechste)
      for (const ziel of lehrplan.lernziele) {
        await connection.execute('INSERT INTO lernziele (id, lehrplan_id, abschnitt, titel) VALUES (?, ?, ?, ?)', [id, lehrplanId, ziel.abschnitt, ziel.titel])
        await connection.execute(
          `INSERT INTO lernziel_niveaus (lernziel_id, stufe, kompetenz, beispiel) VALUES ${STUFEN.map(() => '(?, ?, ?, ?)').join(', ')}`,
          STUFEN.flatMap((stufe) => [id, stufe, ziel.niveaus[stufe].kompetenz, ziel.niveaus[stufe].beispiel]),
        )
        id += 1
      }
      await connection.commit()
      return { lernziele: lehrplan.lernziele.length, ersetzt: geloescht.affectedRows > 0 }
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

/** Nur für Tests */
export async function deleteAll() {
  await query('DELETE FROM lehrplaene')
}
