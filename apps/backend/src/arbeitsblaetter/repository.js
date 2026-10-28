/**
 * Datenzugriff für gespeicherte Arbeitsblätter (MySQL, mysql2/promise).
 *
 * Begriff: Ein "Repository" bündelt alle SQL-Zugriffe auf eine Tabelle, damit
 * Routen und Skripte keine SQL-Zeichenketten enthalten. Alle Werte gehen als
 * Parameter (`?`) an den Treiber – nie per Zeichenkettenverkettung, das
 * verhindert SQL-Injection. Nur geprüfte Ganzzahlen (Seite, Limit) stehen
 * direkt in der SQL, weil MySQL für LIMIT keine Platzhalter im Prepared
 * Statement zuverlässig akzeptiert.
 *
 * Zeitstempel werden in Node erzeugt (UTC) und als ISO-8601 zurückgegeben.
 */
import { randomUUID } from 'node:crypto'
import { getPool, query, queryOne, withConnection } from '../db.js'

const SPALTEN = `a.id, a.titel, a.berufsfeld, a.baustein, a.ausbildungsbaustein, a.lernziel, a.stufe, a.format,
  a.sprache, a.status, a.ki_generiert, a.favorit, a.eltern_id, a.version, a.erstellt_von, a.erstellt_am, a.geaendert_am`

// --- Hilfsfunktionen --------------------------------------------------------

/** MySQL DATETIME(3) als String (UTC, siehe Pool-Option timezone 'Z') -> ISO-8601 */
export function toIso(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(`${String(value).replace(' ', 'T')}Z`).toISOString()
}

/** JSON-Spalten liefert mysql2 meist schon geparst; Strings zur Sicherheit parsen */
const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value ?? null)

/** `%` und `_` in LIKE-Suchbegriffen entschärfen */
export const escapeLike = (text) => text.replace(/[\\%_]/g, (zeichen) => `\\${zeichen}`)

/** Datenbankzeile -> API-Objekt (camelCase, Booleans, ISO-Zeiten) */
export function toApi(row, inhalt) {
  const api = {
    id: row.id,
    titel: row.titel,
    berufsfeld: row.berufsfeld,
    baustein: row.baustein ?? null,
    ausbildungsbaustein: row.ausbildungsbaustein ?? null,
    lernziel: row.lernziel,
    stufe: row.stufe,
    format: row.format,
    sprache: row.sprache,
    status: row.status,
    kiGeneriert: Boolean(row.ki_generiert),
    favorit: Boolean(row.favorit),
    elternId: row.eltern_id ?? null,
    version: Number(row.version),
    erstelltVon: row.erstellt_von ?? null,
    erstelltAm: toIso(row.erstellt_am),
    geaendertAm: toIso(row.geaendert_am),
  }
  if (inhalt !== undefined) api.inhalt = parseJson(inhalt)
  return api
}

function versionToApi(row, mitInhalt) {
  const api = {
    version: Number(row.version),
    aktion: row.aktion,
    autor: row.autor ?? null,
    notiz: row.notiz ?? null,
    kiMeta: parseJson(row.ki_meta),
    erstelltAm: toIso(row.erstellt_am),
  }
  if (mitInhalt) api.inhalt = parseJson(row.inhalt)
  return api
}

async function insertVersion(connection, { arbeitsblattId, version, aktion, inhalt, kiMeta, autor, notiz, zeitpunkt }) {
  await connection.execute(
    `INSERT INTO arbeitsblatt_versionen (id, arbeitsblatt_id, version, aktion, inhalt, ki_meta, autor, notiz, erstellt_am)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), arbeitsblattId, version, aktion, JSON.stringify(inhalt), kiMeta ? JSON.stringify(kiMeta) : null, autor ?? null, notiz ?? null, zeitpunkt],
  )
}

// --- Lesen -------------------------------------------------------------------

/** Ein Arbeitsblatt mit dem Inhalt seiner aktuellen Version; null, wenn unbekannt */
export async function findById(id) {
  const row = await queryOne(
    `SELECT ${SPALTEN}, v.inhalt
       FROM arbeitsblaetter a
       JOIN arbeitsblatt_versionen v ON v.arbeitsblatt_id = a.id AND v.version = a.version
      WHERE a.id = ?`,
    [id],
  )
  return row ? toApi(row, row.inhalt) : null
}

/** Verlauf (alle Versionen, neueste zuerst); leeres Array, wenn das Blatt fehlt */
export async function findVersionen(id, { mitInhalt = false } = {}) {
  const rows = await query(
    `SELECT version, aktion, autor, notiz, ki_meta, erstellt_am${mitInhalt ? ', inhalt' : ''}
       FROM arbeitsblatt_versionen WHERE arbeitsblatt_id = ? ORDER BY version DESC`,
    [id],
  )
  return rows.map((row) => versionToApi(row, mitInhalt))
}

export async function findVersion(id, version) {
  const row = await queryOne(
    'SELECT version, aktion, autor, notiz, ki_meta, erstellt_am, inhalt FROM arbeitsblatt_versionen WHERE arbeitsblatt_id = ? AND version = ?',
    [id, version],
  )
  return row ? versionToApi(row, true) : null
}

/**
 * Seite einer gefilterten Liste (ohne Inhalt – der kommt per GET /:id).
 * @param {object} filter  Geprüfte Query (ListQuerySchema)
 */
export async function list(filter) {
  const where = []
  const params = []

  if (filter.status === undefined) where.push("a.status <> 'archiviert'")
  else if (filter.status !== 'alle') {
    where.push('a.status = ?')
    params.push(filter.status)
  }
  if (filter.berufsfeld) {
    where.push('a.berufsfeld = ?')
    params.push(filter.berufsfeld)
  }
  if (filter.baustein !== undefined) {
    where.push('a.baustein = ?')
    params.push(filter.baustein)
  }
  if (filter.ausbildungsbaustein) {
    where.push('a.ausbildungsbaustein = ?')
    params.push(filter.ausbildungsbaustein)
  }
  for (const feld of ['stufe', 'format', 'sprache']) {
    const werte = filter[feld]
    if (werte?.length) {
      where.push(`a.${feld} IN (${werte.map(() => '?').join(', ')})`)
      params.push(...werte)
    }
  }
  if (filter.favorit !== undefined) {
    where.push('a.favorit = ?')
    params.push(filter.favorit ? 1 : 0)
  }
  if (filter.kiGeneriert !== undefined) {
    where.push('a.ki_generiert = ?')
    params.push(filter.kiGeneriert ? 1 : 0)
  }
  if (filter.elternId) {
    where.push('a.eltern_id = ?')
    params.push(filter.elternId)
  }
  if (filter.q) {
    const muster = `%${escapeLike(filter.q)}%`
    where.push('(a.titel LIKE ? OR a.lernziel LIKE ? OR a.ausbildungsbaustein LIKE ? OR a.berufsfeld LIKE ?)')
    params.push(muster, muster, muster, muster)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderSql = { neueste: 'a.geaendert_am DESC, a.id', aelteste: 'a.geaendert_am ASC, a.id', titel: 'a.titel ASC, a.id' }[filter.sortierung]

  const seite = Number(filter.seite)
  const proSeite = Number(filter.proSeite)
  const offset = (seite - 1) * proSeite

  const [{ gesamt }] = await query(`SELECT COUNT(*) AS gesamt FROM arbeitsblaetter a ${whereSql}`, params)
  const rows = await query(`SELECT ${SPALTEN} FROM arbeitsblaetter a ${whereSql} ORDER BY ${orderSql} LIMIT ${proSeite} OFFSET ${offset}`, params)

  return {
    eintraege: rows.map((row) => toApi(row)),
    seite,
    proSeite,
    gesamt: Number(gesamt),
    seiten: Math.max(1, Math.ceil(Number(gesamt) / proSeite)),
  }
}

/** Werte für die Filter-Dropdowns (nur nicht archivierte Blätter) */
export async function filterOptionen() {
  const rows = await query(
    `SELECT berufsfeld, baustein, ausbildungsbaustein, COUNT(*) AS anzahl
       FROM arbeitsblaetter WHERE status <> 'archiviert'
      GROUP BY berufsfeld, baustein, ausbildungsbaustein
      ORDER BY berufsfeld, baustein, ausbildungsbaustein`,
  )
  return {
    berufsfelder: [...new Set(rows.map((row) => row.berufsfeld))],
    bausteine: rows.map((row) => ({
      berufsfeld: row.berufsfeld,
      baustein: row.baustein ?? null,
      ausbildungsbaustein: row.ausbildungsbaustein ?? null,
      anzahl: Number(row.anzahl),
    })),
  }
}

// --- Schreiben ---------------------------------------------------------------

/**
 * Legt ein Arbeitsblatt mit Version 1 ("erstellt") an.
 * @param {object} input  Geprüfter Body (CreateSchema)
 */
export async function create(input) {
  const id = randomUUID()
  const jetzt = new Date()
  const w = input.worksheet

  await withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      await connection.execute(
        `INSERT INTO arbeitsblaetter
           (id, titel, berufsfeld, baustein, ausbildungsbaustein, lernziel, stufe, format, sprache, status,
            ki_generiert, favorit, eltern_id, version, erstellt_von, erstellt_am, geaendert_am)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          id, w.titel, w.berufsfeld, w.baustein ?? null, w.ausbildungsbaustein ?? null, w.lernziel, w.stufe, w.format, w.sprache,
          input.status, input.meta ? 1 : 0, input.favorit ? 1 : 0, input.elternId ?? null, input.erstelltVon ?? null, jetzt, jetzt,
        ],
      )
      await insertVersion(connection, {
        arbeitsblattId: id, version: 1, aktion: 'erstellt', inhalt: w, kiMeta: input.meta ?? null,
        autor: input.erstelltVon, notiz: input.notiz, zeitpunkt: jetzt,
      })
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })

  return findById(id)
}

/**
 * Ändert Inhalt, Status und/oder Favorit.
 *  - neuer `worksheet`            -> neue Version mit Aktion 'bearbeitet' (oder 'KI-angepasst')
 *  - neuer `status`               -> neue Version mit Aktion 'freigegeben' | 'archiviert' | 'bearbeitet'
 *  - nur `favorit`                -> keine neue Version (reine Markierung)
 *
 * Lesen und Schreiben laufen in EINER Transaktion mit Zeilensperre (SELECT … FOR UPDATE):
 * zwei gleichzeitige Änderungen am selben Blatt werden nacheinander ausgeführt, die zweite
 * sieht den Stand der ersten. Ohne Sperre könnte ein paralleler Favorit-Klick die Version
 * zurücksetzen und das Blatt dauerhaft unveränderbar machen (doppelte Versionsnummer).
 * @returns {Promise<object|null>}  Aktualisiertes Blatt oder null, wenn es fehlt
 */
export async function update(id, patch) {
  const geaendert = await withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      const [rows] = await connection.execute(
        `SELECT ${SPALTEN}, v.inhalt
           FROM arbeitsblaetter a
           JOIN arbeitsblatt_versionen v ON v.arbeitsblatt_id = a.id AND v.version = a.version
          WHERE a.id = ?
          FOR UPDATE`,
        [id],
      )
      if (rows.length === 0) {
        await connection.rollback()
        return false
      }
      const aktuell = toApi(rows[0], rows[0].inhalt)
      const jetzt = new Date()
      const inhalt = patch.worksheet ?? aktuell.inhalt
      const status = patch.status ?? aktuell.status
      const favorit = patch.favorit ?? aktuell.favorit

      let aktion = null
      if (patch.worksheet) aktion = patch.aktion ?? 'bearbeitet'
      if (patch.status && patch.status !== aktuell.status) {
        aktion = { freigegeben: 'freigegeben', archiviert: 'archiviert', entwurf: 'bearbeitet' }[patch.status]
      }

      if (!aktion) {
        // Nur Markierung: Version und Listenspalten bleiben, wie sie sind
        await connection.execute('UPDATE arbeitsblaetter SET favorit = ?, geaendert_am = ? WHERE id = ?', [favorit ? 1 : 0, jetzt, id])
      } else {
        const version = aktuell.version + 1
        const kiMeta = patch.worksheet ? (patch.meta ?? null) : null
        const kiGeneriert = aktuell.kiGeneriert || aktion === 'KI-angepasst' || Boolean(kiMeta)
        await connection.execute(
          `UPDATE arbeitsblaetter
              SET titel = ?, berufsfeld = ?, baustein = ?, ausbildungsbaustein = ?, lernziel = ?, stufe = ?, format = ?, sprache = ?,
                  status = ?, ki_generiert = ?, favorit = ?, version = ?, geaendert_am = ?
            WHERE id = ?`,
          [
            inhalt.titel, inhalt.berufsfeld, inhalt.baustein ?? null, inhalt.ausbildungsbaustein ?? null, inhalt.lernziel, inhalt.stufe,
            inhalt.format, inhalt.sprache, status, kiGeneriert ? 1 : 0, favorit ? 1 : 0, version, jetzt, id,
          ],
        )
        await insertVersion(connection, { arbeitsblattId: id, version, aktion, inhalt, kiMeta, autor: patch.autor, notiz: patch.notiz, zeitpunkt: jetzt })
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })

  return geaendert ? findById(id) : null
}

/**
 * Löscht endgültig (Versionen per ON DELETE CASCADE). true, wenn eine Zeile betroffen war.
 * Hängen Varianten an dem Blatt, wird die älteste zur neuen Wurzel der Gruppe – sonst würde
 * ON DELETE SET NULL die Gruppe in lauter einzelne Blätter zerlegen.
 */
export async function remove(id) {
  return withConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      const [[neueWurzel]] = await connection.execute(
        'SELECT id FROM arbeitsblaetter WHERE eltern_id = ? ORDER BY erstellt_am, id LIMIT 1 FOR UPDATE',
        [id],
      )
      if (neueWurzel) {
        await connection.execute('UPDATE arbeitsblaetter SET eltern_id = NULL WHERE id = ?', [neueWurzel.id])
        await connection.execute('UPDATE arbeitsblaetter SET eltern_id = ? WHERE eltern_id = ?', [neueWurzel.id, id])
      }
      const [result] = await connection.execute('DELETE FROM arbeitsblaetter WHERE id = ?', [id])
      await connection.commit()
      return result.affectedRows > 0
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

/** Löscht alle Blätter samt Verlauf (Seed --reset, Tests) */
export async function deleteAll() {
  await query('DELETE FROM arbeitsblaetter')
}

/** Anzahl aller Blätter (für Seed und Tests) */
export async function count() {
  const row = await queryOne('SELECT COUNT(*) AS anzahl FROM arbeitsblaetter')
  return Number(row.anzahl)
}
