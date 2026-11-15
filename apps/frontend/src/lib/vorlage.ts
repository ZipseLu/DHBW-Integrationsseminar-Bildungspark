/**
 * FE-05: hand an uploaded worksheet over to the KI-Erstellung.
 *
 * The generate endpoint has no field for a source text, so the template goes into
 * "Erwartungen" (free-text wishes that end up in the prompt). The backend accepts at
 * most 2000 characters there (apps/backend/src/arbeitsblatt/schema.js), so longer
 * texts are cut and the page says so.
 */

import { AUFGABEN_TYP_LABEL } from '@/data/aufgaben'
import type { Arbeitsblatt } from '@/lib/api'

/** Limit of `erwartungen` in the backend schema */
export const MAX_ERWARTUNGEN = 2000

/** Template text as "Erwartungen" for the KI, cut to the backend limit */
export function erwartungenAusVorlage(name: string, text: string): { erwartungen: string; gekuerzt: boolean } {
  const kopf = `Vorhandenes Arbeitsblatt „${name}“ als Vorlage verwenden: Inhalt übernehmen und an Niveaustufe und Format anpassen.\n\nVorlage:\n`
  const platz = MAX_ERWARTUNGEN - kopf.length
  const sauber = text.trim()
  const gekuerzt = sauber.length > platz
  return { erwartungen: kopf + (gekuerzt ? `${sauber.slice(0, platz - 1).trimEnd()}…` : sauber), gekuerzt }
}

/** Topic suggestion from a file name: "Gabelstapler_Sicherheit.docx" -> "Gabelstapler Sicherheit" */
export function themaAusDateiname(dateiname: string): string {
  return dateiname
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "1,2 MB" / "350 KB" */
export function formatGroesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(kb)} KB`
}

/**
 * FE-23: plain text of a saved worksheet, used as template when it is adapted
 * with the KI ("✦ Anpassen"). Compact, because it has to fit into 2000 characters.
 */
export function vorlageText(w: Arbeitsblatt): string {
  const teile = [w.titel, w.einleitung.trim()]
  for (const a of w.aufgaben) {
    const zeilen = [`Aufgabe ${a.nr} (${AUFGABEN_TYP_LABEL[a.typ] ?? a.typ}): ${a.anweisung}`]
    for (const o of a.optionen ?? []) zeilen.push(`- ${o}`)
    teile.push(zeilen.join('\n'))
  }
  if (w.woerterbuch.length) teile.push(`Wörter-Buch: ${w.woerterbuch.map((e) => `${e.wort}: ${e.erklaerung}`).join('; ')}`)
  return teile.join('\n\n')
}
