/**
 * FE-05: hand an uploaded worksheet over to the KI-Erstellung.
 *
 * The generate endpoint has no field for a source text, so the template goes into
 * "Erwartungen" (free-text wishes that end up in the prompt). The backend accepts at
 * most 2000 characters there (apps/backend/src/arbeitsblatt/schema.js), so longer
 * texts are cut and the page says so.
 */

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
