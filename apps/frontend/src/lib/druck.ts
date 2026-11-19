import { AUFGABEN_TYP_LABEL, PIKTOGRAMM_SYMBOL } from '@/data/aufgaben'
import { LEVEL_STYLES, formatOption } from '@/data/constants'
import { BRIEFKOPF_PNG } from '@/assets/briefkopf'
import { fetchArbeitsblatt, type Arbeitsblatt, type Aufgabe } from '@/lib/api'

/**
 * FE-04: PDF of a worksheet via the browser's print dialog ("Als PDF speichern"
 * in Edge and Chrome). No extra library and no server-side converter: the
 * worksheet is rendered as a print page with the same structure as the Word
 * export (apps/backend/src/arbeitsblatt/docx.js) and printed from a hidden iframe.
 */

/**
 * FE-21: corporate design of the Bildungspark worksheets ("Waren sicher ver-packen"):
 * letterhead in Bildungspark blue, tasks in light blue boxes, the small dictionary in
 * a green box, Calibri, page number "1/5" at the bottom right.
 */
export const CD = {
  blau: '#00487A',
  aufgabe: '#DCEAF7',
  woerterbuch: '#C2F1C8',
  text: '#1F1F1F',
  grau: '#5F5F5F',
  linie: '#595959',
} as const

const COLOR_PRIMARY = CD.blau
const COLOR_MUTED = CD.grau
const COLOR_BORDER = CD.linie
const COLOR_PAPER = '#FFFFFF'

/** Letterhead as on the paper worksheets: the original graphic with name, claim and logo */
export const BRIEFKOPF_HTML = `<img class="briefkopf" src="${BRIEFKOPF_PNG}" alt="Bildungspark Heilbronn-Franken gGmbH – Bildung · Arbeit · Zukunft">`

const escape = (text: string) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string)

/** Paragraphs of a text; lines starting with "Achtung:" are highlighted like in the Word file */
function absaetze(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/^achtung:/i.test(line) ? `<p class="achtung">${escape(line)}</p>` : `<p>${escape(line)}</p>`))
    .join('')
}

/**
 * Rows of a matching task "links | rechts": the right column is shifted by one,
 * so no pair stands side by side (as in docx.js). Shared with the preview (FE-22).
 */
export function versetztePaare(optionen: readonly string[]): [string, string][] {
  const paare = optionen.map((option) => {
    const [links, rechts = ''] = option.split('|').map((s) => s.trim())
    return { links, rechts }
  })
  const rechts = paare.map((p) => p.rechts)
  const versetzt = rechts.length > 1 ? [...rechts.slice(1), rechts[0]] : rechts
  return paare.map((p, i) => [p.links, versetzt[i] ?? ''])
}

/** One row of a matching task: numbered term on the left, lettered partner on the right */
export type ZuordnenZeile = { nr: number; links: string; buchstabe: string; rechts: string }

const BUCHSTABEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * FE-37: layout of a matching task – left 1, 2, 3 …, right A, B, C … (shifted, see
 * versetztePaare) – plus the solution as "1 → C". The same layout is used for the
 * preview, the print view and the Word file (backend).
 */
export function zuordnenAufbau(optionen: readonly string[]): { zeilen: ZuordnenZeile[]; loesung: ZuordnenZeile[] } {
  const zeilen = versetztePaare(optionen).map(([links, rechts], i) => ({ nr: i + 1, links, buchstabe: BUCHSTABEN[i] ?? String(i + 1), rechts }))
  const vergeben = new Set<number>()
  const loesung = optionen.map((option, i) => {
    const [links, rechts = ''] = option.split('|').map((s) => s.trim())
    const ziel = zeilen.findIndex((z, j) => !vergeben.has(j) && z.rechts === rechts)
    if (ziel >= 0) vergeben.add(ziel)
    return { nr: i + 1, links, buchstabe: ziel >= 0 ? zeilen[ziel].buchstabe : '?', rechts }
  })
  return { zeilen, loesung }
}

/** "Oder schreib den Buchstaben dazu: 1 = ___  2 = ___" for those who cannot draw lines */
export function eintragZeile(anzahl: number): string {
  return Array.from({ length: anzahl }, (_, i) => `${i + 1} = ____`).join('     ')
}

function zuordnenTabelle(optionen: string[]): string {
  const { zeilen } = zuordnenAufbau(optionen)
  const html = zeilen
    .map(
      (z) =>
        `<tr><td class="karte"><span class="marke">${z.nr}</span>${escape(z.links)}</td><td class="punkt">●</td><td class="frei"></td>` +
        `<td class="punkt">●</td><td class="karte"><span class="marke">${z.buchstabe}</span>${escape(z.rechts)}</td></tr>`,
    )
    .join('')
  return `<table class="zuordnen">${html}</table><p class="eintragen">Oder schreib den Buchstaben dazu:&nbsp;&nbsp; ${escape(eintragZeile(zeilen.length)).replace(/ {5}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}</p>`
}

function aufgabeHtml(aufgabe: Aufgabe): string {
  const symbol = aufgabe.piktogramm ? `${PIKTOGRAMM_SYMBOL[aufgabe.piktogramm] ?? ''}&nbsp;&nbsp;` : ''
  const optionen = aufgabe.optionen ?? []
  let inhalt: string
  switch (aufgabe.typ) {
    case 'reihenfolge':
    case 'ankreuzen':
      inhalt = optionen.map((o) => `<p class="option">☐&nbsp;&nbsp;${escape(o)}</p>`).join('')
      break
    case 'zuordnen':
      inhalt = zuordnenTabelle(optionen)
      break
    case 'malen':
      inhalt = '<div class="malrahmen"></div>'
      break
    case 'praxis':
      inhalt = '<p class="option">(&nbsp;&nbsp;) Ja&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(&nbsp;&nbsp;) Nein</p>'
      break
    default:
      inhalt = '<div class="linie"></div><div class="linie"></div><div class="linie"></div>'
  }
  return `<section class="aufgabe">
<h3>${symbol}Aufgabe ${aufgabe.nr}: ${escape(AUFGABEN_TYP_LABEL[aufgabe.typ] ?? aufgabe.typ)}</h3>
${absaetze(aufgabe.anweisung)}
${inhalt}
</section>`
}

/** Print options: `mitLoesungen` adds a solution part for the teacher at the end (FE-25) */
export type DruckOptionen = { mitLoesungen?: boolean }

/** Solution of one task: the AI's `loesung`; for matching tasks also the correct pairs */
function loesungHtml(aufgabe: Aufgabe): string {
  const typ = escape(AUFGABEN_TYP_LABEL[aufgabe.typ] ?? aufgabe.typ)
  const teile: string[] = []
  if (aufgabe.loesung?.trim()) teile.push(absaetze(aufgabe.loesung))
  // The worksheet shows the right column shifted; the original options are the correct pairs
  if (aufgabe.typ === 'zuordnen' && aufgabe.optionen?.length) {
    const paare = zuordnenAufbau(aufgabe.optionen).loesung.map(
      (z) => `<li><b>${z.nr} → ${z.buchstabe}</b>&nbsp;&nbsp;${escape(z.links)} → ${escape(z.rechts)}</li>`,
    )
    teile.push(`<ul class="paare">${paare.join('')}</ul>`)
  }
  if (teile.length === 0) teile.push('<p class="ohne">Keine Lösung angegeben – bitte selbst prüfen.</p>')
  return `<section class="loesung"><h4>Aufgabe ${aufgabe.nr}: ${typ}</h4>${teile.join('')}</section>`
}

/** Solution part on its own page, clearly marked as not for participants */
function loesungsteilHtml(w: Arbeitsblatt): string {
  return `<div class="loesungsteil">
<div class="kopf">NUR FÜR DIE LEHRKRAFT – NICHT AN TEILNEHMENDE AUSGEBEN</div>
<h1>Lösungen: ${escape(w.titel)}</h1>
<p class="info">Stufe ${escape(w.stufe)} · Lösungen aus der KI-Erstellung, fachlich prüfen.</p>
${w.aufgaben.map(loesungHtml).join('\n')}
</div>`
}

/** Complete print page of a worksheet (exported for tests) */
export function arbeitsblattDruckHtml(w: Arbeitsblatt, datum = new Date(), optionen: DruckOptionen = {}): string {
  const farbe = LEVEL_STYLES[w.stufe] ?? LEVEL_STYLES.T
  const formatLabel = formatOption(w.format)?.label ?? w.format
  const bausteinInfo = [w.berufsfeld, w.baustein !== undefined ? `Baustein ${w.baustein}` : null, w.ausbildungsbaustein].filter(Boolean).join(' · ')
  const datumText = datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  // Footer text goes into a CSS string, so quotes and backslashes must not end it
  const fusszeile = `Stufe ${w.stufe} · ${formatLabel} · ${w.sprache} · ${datumText} · KI-generiert – fachliche Freigabe ausstehend`.replace(/["\\]/g, '')

  const woerterbuch = w.woerterbuch?.length
    ? `<section class="woerterbuch"><h2>Kleines Wörter-Buch</h2>${w.woerterbuch.map((e) => `<p class="wort"><strong>${escape(e.wort)}:</strong> ${escape(e.erklaerung)}</p>`).join('')}</section>`
    : ''
  const hinweis = w.hinweisAnleiter ? `<h2>Hinweis für die Lehrkraft</h2><p class="hinweis">${escape(w.hinweisAnleiter)}</p>` : ''

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escape(w.titel)}${optionen.mitLoesungen ? ' – mit Lösungen' : ''}</title>
<style>
  /* Margins in their own rule: browsers without page margin boxes drop only the footer rule below, not the margins */
  @page { size: A4; margin: 1.6cm 2.2cm 2.5cm; }
  @page {
    @bottom-left { content: "${fusszeile}"; font: 7pt Calibri, 'Segoe UI', Arial, sans-serif; color: ${COLOR_MUTED}; }
    @bottom-right { content: counter(page) "/" counter(pages); font: 9pt Calibri, 'Segoe UI', Arial, sans-serif; color: ${CD.text}; }
  }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: ${CD.text}; margin: 0; }
  /* The letterhead sits in a table header: browsers repeat it on every printed page, like on the paper worksheets */
  table.seite { width: 100%; border-collapse: collapse; }
  table.seite > thead > tr > td, table.seite > tbody > tr > td { padding: 0; }
  .briefkopf { display: block; width: 100%; height: auto; margin: 0 0 20pt; }
  .kopf { font-size: 8pt; font-weight: 700; color: ${COLOR_PRIMARY}; letter-spacing: 0.08em; }
  h1 { font-size: 14pt; margin: 0 0 4pt; line-height: 1.25; }
  .info { font-size: 9.5pt; color: ${COLOR_MUTED}; margin: 0 0 3pt; }
  .stufe { display: inline-block; font-weight: 700; padding: 1pt 6pt; background: ${farbe.bg}; color: ${farbe.text}; }
  .name { font-size: 10pt; color: ${COLOR_MUTED}; margin: 10pt 0 12pt; }
  h2 { font-size: 11pt; font-weight: 700; margin: 12pt 0 4pt; break-after: avoid; }
  p { margin: 0 0 6pt; }
  .achtung { background: #FFF3CD; color: #7A5C00; font-weight: 700; padding: 3pt 6pt; }
  .aufgabe { break-inside: avoid; background: ${CD.aufgabe}; padding: 6pt 8pt 4pt; margin: 12pt 0; }
  h3 { font-size: 11pt; font-weight: 700; margin: 0 0 6pt; break-after: avoid; }
  .option { margin: 0 0 5pt 12pt; }
  table.zuordnen { width: 100%; border-collapse: separate; border-spacing: 0 6pt; margin: 2pt 0 2pt; }
  table.zuordnen td.karte { width: 36%; background: #FFFFFF; border: 1px solid #BFBFBF; border-radius: 4pt; padding: 5pt 8pt; }
  table.zuordnen td.punkt { width: 3%; text-align: center; color: ${CD.blau}; font-size: 13pt; padding: 0 3pt; }
  table.zuordnen td.frei { width: 22%; }
  table.zuordnen .marke { display: inline-block; min-width: 14pt; font-weight: 700; color: ${CD.blau}; }
  .eintragen { margin: 2pt 0 4pt; font-size: 10.5pt; color: ${COLOR_MUTED}; }
  .malrahmen { height: 55mm; border: 1.5px solid ${CD.text}; background: #FFFFFF; margin: 4pt 0 8pt; }
  .linie { border-bottom: 1px solid ${COLOR_BORDER}; height: 22pt; }
  .woerterbuch { break-inside: avoid; background: ${CD.woerterbuch}; padding: 6pt 8pt 4pt; margin: 14pt 0; }
  .woerterbuch h2 { margin-top: 0; }
  .wort { margin: 0 0 4pt 12pt; }
  .hinweis { font-size: 10pt; color: ${COLOR_MUTED}; font-style: italic; background: ${COLOR_PAPER}; border: 1px solid #BFBFBF; padding: 6pt 8pt; }
  .loesungsteil { break-before: page; }
  .loesungsteil .kopf { color: #7A2E00; }
  .loesung { break-inside: avoid; margin: 0 0 8pt; }
  h4 { font-size: 11pt; margin: 10pt 0 3pt; color: ${COLOR_PRIMARY}; }
  ul.paare { margin: 0 0 6pt; padding-left: 18pt; }
  .ohne { color: ${COLOR_MUTED}; font-style: italic; }
</style>
</head>
<body>
<table class="seite"><thead><tr><td>${BRIEFKOPF_HTML}</td></tr></thead><tbody><tr><td>
<h1>Arbeitsblatt: ${escape(w.titel)}</h1>
<p class="info">${escape(bausteinInfo)}</p>
<p class="info"><span class="stufe">Stufe ${escape(w.stufe)}</span>&nbsp;&nbsp; ${escape(formatLabel)} · ${escape(w.sprache)}</p>
<p class="name">Name: ____________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Datum: ______________</p>
<h2>Lernziel</h2>
<p>${escape(w.lernziel)}</p>
<h2>Darum geht es</h2>
${absaetze(w.einleitung)}
${w.aufgaben.map(aufgabeHtml).join('\n')}
${woerterbuch}
${hinweis}
${optionen.mitLoesungen ? loesungsteilHtml(w) : ''}
</td></tr></tbody></table>
</body>
</html>`
}

/**
 * Opens the print dialog for a worksheet. The user picks "Als PDF speichern";
 * the page title becomes the suggested file name.
 */
export function druckeArbeitsblatt(w: Arbeitsblatt, optionen: DruckOptionen = {}): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('tabindex', '-1')
  frame.title = 'Druckansicht'
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(frame)

  const fenster = frame.contentWindow
  const dokument = frame.contentDocument
  if (!fenster || !dokument) {
    frame.remove()
    throw new Error('Die Druckansicht konnte nicht geöffnet werden.')
  }
  dokument.open()
  dokument.write(arbeitsblattDruckHtml(w, new Date(), optionen))
  dokument.close()

  let entfernt = false
  // Safety net in case a browser never fires "afterprint"
  const notfall = setTimeout(() => aufraeumen(), 10 * 60 * 1000)
  const aufraeumen = () => {
    if (entfernt) return
    entfernt = true
    clearTimeout(notfall)
    frame.remove()
  }
  fenster.addEventListener('afterprint', () => setTimeout(aufraeumen, 500), { once: true })

  // Give the iframe a moment for layout and fonts before printing
  setTimeout(() => {
    fenster.focus()
    fenster.print()
  }, 150)
}

/** PDF of a saved worksheet: loads its content (GET /api/arbeitsblaetter/:id) and opens the print dialog */
export async function druckeGespeichertesArbeitsblatt(id: string, optionen: DruckOptionen = {}): Promise<void> {
  const blatt = await fetchArbeitsblatt(id)
  druckeArbeitsblatt(blatt.inhalt, optionen)
}
