/**
 * Kennzahlen und letzte Arbeitsblatt-Aktivitäten für das Dashboard.
 * Die Kennzahlen werden mit Aggregaten gelesen, die Aktivitätsliste ist auf
 * fünf Einträge begrenzt. Teilnehmende bleiben dabei vollständig anonym.
 */
import { query } from '../db.js'
import { toIso } from '../arbeitsblaetter/repository.js'

/** Dashboard-Kennzahlen und zuletzt geänderte Arbeitsblätter. */
export async function kennzahlen() {
  const [arbeitsblattRows, teilnehmendeRows, aktivitaetsRows] = await Promise.all([
    query(`
      SELECT
        COUNT(*) AS gesamtInklusiveArchiviert,
        SUM(status <> 'archiviert') AS gesamt,
        SUM(status = 'entwurf') AS entwurf,
        SUM(status = 'freigegeben') AS freigegeben,
        SUM(status = 'archiviert') AS archiviert,
        SUM(status <> 'archiviert' AND ki_generiert = 1) AS ki_generiert,
        COUNT(DISTINCT CASE WHEN status <> 'archiviert' THEN berufsfeld END) AS berufsfelder,
        SUM(status <> 'archiviert' AND stufe = 'T') AS stufe_t,
        SUM(status <> 'archiviert' AND stufe = 'A') AS stufe_a,
        SUM(status <> 'archiviert' AND stufe = 'F') AS stufe_f,
        SUM(status <> 'archiviert' AND stufe = 'B') AS stufe_b
      FROM arbeitsblaetter`),
    query(`
      SELECT COUNT(DISTINCT kennung) AS anzahl
        FROM teilnehmende_stationen
       WHERE status = 'aktiv'`),
    query(`
      SELECT a.id, a.titel, a.berufsfeld, a.baustein, a.ausbildungsbaustein, a.stufe,
             a.status, a.ki_generiert, a.geaendert_am, v.aktion, v.autor
        FROM arbeitsblaetter a
        LEFT JOIN arbeitsblatt_versionen v
          ON v.arbeitsblatt_id = a.id AND v.version = a.version
       ORDER BY a.geaendert_am DESC, a.id DESC
       LIMIT 5`),
  ])

  const arbeitsblaetter = arbeitsblattRows[0]
  const aktiveTeilnehmende = teilnehmendeRows[0]

  return {
    arbeitsblaetter: {
      // Wie GET /api/arbeitsblaetter ohne Statusfilter: archivierte Blätter
      // gehören zu den Statuszahlen, aber nicht zu den aktiven Kennzahlen.
      gesamt: Number(arbeitsblaetter.gesamt ?? 0),
      gesamtInklusiveArchiviert: Number(arbeitsblaetter.gesamtInklusiveArchiviert ?? 0),
      proStatus: {
        entwurf: Number(arbeitsblaetter.entwurf ?? 0),
        freigegeben: Number(arbeitsblaetter.freigegeben ?? 0),
        archiviert: Number(arbeitsblaetter.archiviert ?? 0),
      },
      kiGeneriert: Number(arbeitsblaetter.ki_generiert ?? 0),
      berufsfelder: Number(arbeitsblaetter.berufsfelder ?? 0),
      proStufe: {
        T: Number(arbeitsblaetter.stufe_t ?? 0),
        A: Number(arbeitsblaetter.stufe_a ?? 0),
        F: Number(arbeitsblaetter.stufe_f ?? 0),
        B: Number(arbeitsblaetter.stufe_b ?? 0),
      },
    },
    aktiveTeilnehmende: Number(aktiveTeilnehmende.anzahl ?? 0),
    letzteAktivitaeten: aktivitaetsRows.map((row) => ({
      id: row.id,
      titel: row.titel,
      berufsfeld: row.berufsfeld,
      baustein: row.baustein === null ? null : Number(row.baustein),
      ausbildungsbaustein: row.ausbildungsbaustein ?? null,
      stufe: row.stufe,
      status: row.status,
      kiGeneriert: Boolean(row.ki_generiert),
      aktion: row.aktion ?? null,
      autor: row.autor ?? null,
      geaendertAm: toIso(row.geaendert_am),
    })),
  }
}
