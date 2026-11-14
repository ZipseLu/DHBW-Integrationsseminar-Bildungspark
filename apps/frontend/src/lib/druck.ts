import { AUFGABEN_TYP_LABEL, PIKTOGRAMM_SYMBOL } from '@/data/aufgaben'
import { LEVEL_STYLES, formatOption } from '@/data/constants'
import { fetchArbeitsblatt, type Arbeitsblatt, type Aufgabe } from '@/lib/api'

/**
 * FE-04: PDF of a worksheet via the browser's print dialog ("Als PDF speichern"
 * in Edge and Chrome). No extra library and no server-side converter: the
 * worksheet is rendered as a print page with the same structure as the Word
 * export (apps/backend/src/arbeitsblatt/docx.js) and printed from a hidden iframe.
 */

const COLOR_PRIMARY = '#1E3A5F'
const COLOR_MUTED = '#6B6354'
const COLOR_BORDER = '#D5CEBB'
const COLOR_PAPER = '#FFFEF9'

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

function zuordnenTabelle(optionen: string[]): string {
  const zeilen = versetztePaare(optionen)
    .map(([links, rechts]) => `<tr><td class="links">${escape(links)}</td><td>☐&nbsp;&nbsp;${escape(rechts)}</td></tr>`)
    .join('')
  return `<table class="zuordnen">${zeilen}</table>`
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

/** Complete print page of a worksheet (exported for tests) */
export function arbeitsblattDruckHtml(w: Arbeitsblatt, datum = new Date()): string {
  const farbe = LEVEL_STYLES[w.stufe] ?? LEVEL_STYLES.T
  const formatLabel = formatOption(w.format)?.label ?? w.format
  const bausteinInfo = [w.berufsfeld, w.baustein !== undefined ? `Baustein ${w.baustein}` : null, w.ausbildungsbaustein].filter(Boolean).join(' · ')
  const datumText = datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  // Footer text goes into a CSS string, so quotes and backslashes must not end it
  const fusszeile = `Stufe ${w.stufe} · ${formatLabel} · ${w.sprache} · ${datumText} · KI-generiert – fachliche Freigabe ausstehend`.replace(/["\\]/g, '')

  const woerterbuch = w.woerterbuch?.length
    ? `<h2>Kleines Wörter-Buch</h2>${w.woerterbuch.map((e) => `<p class="wort"><strong>${escape(e.wort)}:</strong> ${escape(e.erklaerung)}</p>`).join('')}`
    : ''
  const hinweis = w.hinweisAnleiter ? `<h2>Hinweis für die Lehrkraft</h2><p class="hinweis">${escape(w.hinweisAnleiter)}</p>` : ''

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escape(w.titel)}</title>
<style>
  /* Margins in their own rule: browsers without page margin boxes drop only the footer rule below, not the margins */
  @page { size: A4; margin: 2.2cm 2.2cm 2.5cm; }
  @page {
    @bottom-center { content: "${fusszeile} · Seite " counter(page) " von " counter(pages); font: 7pt Calibri, 'Segoe UI', Arial, sans-serif; color: ${COLOR_MUTED}; }
  }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #1A1714; margin: 0; }
  .kopf { font-size: 8pt; font-weight: 700; color: ${COLOR_PRIMARY}; letter-spacing: 0.08em; }
  h1 { font-size: 18pt; margin: 6pt 0 3pt; line-height: 1.2; }
  .info { font-size: 10pt; color: ${COLOR_MUTED}; margin: 0 0 4pt; }
  .stufe { display: inline-block; font-weight: 700; padding: 1pt 6pt; background: ${farbe.bg}; color: ${farbe.text}; }
  .name { font-size: 10pt; color: ${COLOR_MUTED}; margin: 12pt 0 14pt; }
  h2 { font-size: 9pt; font-weight: 700; color: ${COLOR_PRIMARY}; text-transform: uppercase; letter-spacing: 0.06em; margin: 14pt 0 4pt; }
  p { margin: 0 0 6pt; }
  .achtung { background: #FFF3CD; color: #7A5C00; font-weight: 700; padding: 3pt 6pt; }
  .aufgabe { break-inside: avoid; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; padding: 3pt 6pt; background: ${farbe.bg}; color: ${farbe.text}; break-after: avoid; }
  .option { margin: 0 0 5pt 12pt; }
  table.zuordnen { width: 100%; border-collapse: collapse; margin: 2pt 0 6pt; }
  table.zuordnen td { width: 50%; padding: 4pt 6pt; }
  table.zuordnen td.links { text-align: right; }
  .malrahmen { height: 55mm; border: 1px solid ${COLOR_BORDER}; margin: 4pt 0 8pt; }
  .linie { border-bottom: 1px solid ${COLOR_BORDER}; height: 22pt; }
  .wort { margin: 0 0 4pt 12pt; }
  .hinweis { font-size: 10pt; color: ${COLOR_MUTED}; font-style: italic; background: ${COLOR_PAPER}; border: 1px solid ${COLOR_BORDER}; padding: 6pt 8pt; }
</style>
</head>
<body>
<div class="kopf">BILDUNGSPARK HEILBRONN-FRANKEN</div>
<h1>${escape(w.titel)}</h1>
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
</body>
</html>`
}

/**
 * Opens the print dialog for a worksheet. The user picks "Als PDF speichern";
 * the page title becomes the suggested file name.
 */
export function druckeArbeitsblatt(w: Arbeitsblatt): void {
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
  dokument.write(arbeitsblattDruckHtml(w))
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
export async function druckeGespeichertesArbeitsblatt(id: string): Promise<void> {
  const blatt = await fetchArbeitsblatt(id)
  druckeArbeitsblatt(blatt.inhalt)
}
