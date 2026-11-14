import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WORKSHEETS } from '@/data/worksheets'
import type { Arbeitsblatt, ArbeitsblattResult } from '@/lib/api'
import { arbeitsblattDruckHtml, druckeArbeitsblatt, druckeGespeichertesArbeitsblatt } from '@/lib/druck'
import { WorksheetCard } from '@/pages/arbeitsblaetter/WorksheetCard'
import { GeneratedWorksheetCard } from '@/pages/ki-erstellung/GeneratedWorksheetCard'

/**
 * FE-04: PDF via the browser's print dialog. jsdom cannot print, so the tests
 * check the print page and that print() of the hidden iframe is called.
 */

const BLATT: Arbeitsblatt = {
  titel: 'Der LKW ist da',
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  stufe: 'T',
  format: 'piktogramm',
  sprache: 'Leichte Sprache',
  lernziel: 'Güter entladen',
  einleitung: 'Ein LKW bringt Ware.\nAchtung: Bleib hinter der gelben Linie.',
  aufgaben: [
    { nr: 1, typ: 'ankreuzen', anweisung: 'Kreuze an.', optionen: ['Ich sage Bescheid.', 'Ich gehe weg.'], piktogramm: 'ankreuzen' },
    { nr: 2, typ: 'zuordnen', anweisung: 'Verbinde.', optionen: ['LKW | Bringt Ware', 'Anleiter | Hilft dir'] },
    { nr: 3, typ: 'malen', anweisung: 'Male einen LKW.' },
    { nr: 4, typ: 'praxis', anweisung: 'Frage deinen Anleiter: War das richtig?' },
    { nr: 5, typ: 'offen', anweisung: 'Warum ist das wichtig?' },
  ],
  woerterbuch: [{ wort: 'Ent-laden', erklaerung: 'Die Ware aus dem LKW holen.' }],
  hinweisAnleiter: 'Zeit: 20 Minuten.',
  baustein: 1,
  ausbildungsbaustein: 'Wareneingang',
}

const druckFrame = () => document.querySelector<HTMLIFrameElement>('iframe[title="Druckansicht"]')

/** Replaces print() and focus() of the hidden iframe before the delayed call happens (jsdom has neither) */
function druckAbfangen() {
  const frame = druckFrame()
  expect(frame).not.toBeNull()
  const print = vi.fn()
  Object.defineProperty(frame!.contentWindow!, 'print', { value: print, configurable: true })
  Object.defineProperty(frame!.contentWindow!, 'focus', { value: vi.fn(), configurable: true })
  return { frame: frame!, print }
}

afterEach(() => {
  vi.unstubAllGlobals()
  // Ends pending print views, including their safety timers
  document.querySelectorAll<HTMLIFrameElement>('iframe[title="Druckansicht"]').forEach((frame) => {
    const FrameEvent = (frame.contentWindow as unknown as typeof window | null)?.Event
    if (FrameEvent) frame.contentWindow!.dispatchEvent(new FrameEvent('afterprint'))
    frame.remove()
  })
})

describe('Druckansicht (FE-04)', () => {
  it('enthält alle Teile wie der Word-Export', () => {
    const html = arbeitsblattDruckHtml(BLATT, new Date('2026-11-12T10:00:00'))
    expect(html).toContain('<title>Der LKW ist da</title>')
    expect(html).toContain('Lagerlogistik, Handel &amp; Versand · Baustein 1 · Wareneingang')
    expect(html).toContain('Stufe T')
    expect(html).toContain('Mit Piktogrammen · Leichte Sprache')
    expect(html).toContain('<p class="achtung">Achtung: Bleib hinter der gelben Linie.</p>')
    expect(html).toContain('☑️&nbsp;&nbsp;Aufgabe 1: Ankreuzen')
    expect(html).toContain('☐&nbsp;&nbsp;Ich sage Bescheid.')
    expect(html).toContain('<div class="malrahmen"></div>')
    expect(html).toContain('Aufgabe 4: Praxis-Übung')
    expect(html).toContain('<div class="linie"></div>')
    expect(html).toContain('<strong>Ent-laden:</strong> Die Ware aus dem LKW holen.')
    expect(html).toContain('Hinweis für die Lehrkraft')
    // Footer with date and page numbers
    expect(html).toContain('12.11.2026')
    expect(html).toContain('counter(page)')
  })

  it('versetzt die rechte Spalte beim Zuordnen, damit kein Paar nebeneinander steht', () => {
    const html = arbeitsblattDruckHtml(BLATT)
    expect(html).toContain('<td class="links">LKW</td><td>☐&nbsp;&nbsp;Hilft dir</td>')
    expect(html).toContain('<td class="links">Anleiter</td><td>☐&nbsp;&nbsp;Bringt Ware</td>')
  })

  it('maskiert Text aus der KI-Antwort', () => {
    const html = arbeitsblattDruckHtml({ ...BLATT, titel: '<script>alert(1)</script>', sprache: 'Leichte "Sprache"' as Arbeitsblatt['sprache'] })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    // Quotes would end the CSS string of the footer
    expect(html).toMatch(/content: "Stufe T · Mit Piktogrammen · Leichte Sprache · /)
  })

  it('öffnet den Druckdialog in einem unsichtbaren Rahmen und räumt danach auf', async () => {
    druckeArbeitsblatt(BLATT)
    const { frame, print } = druckAbfangen()
    expect(frame).toHaveAttribute('aria-hidden', 'true')
    expect(frame.contentDocument?.title).toBe('Der LKW ist da')

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    // The event must come from the iframe's own window (jsdom checks the realm)
    const FrameEvent = (frame.contentWindow as unknown as typeof window).Event
    frame.contentWindow!.dispatchEvent(new FrameEvent('afterprint'))
    await waitFor(() => expect(druckFrame()).toBeNull())
  })

  it('lädt ein gespeichertes Blatt und druckt dessen Inhalt', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify({ arbeitsblatt: { id: 'abc', titel: BLATT.titel, inhalt: BLATT } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await druckeGespeichertesArbeitsblatt('abc')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/arbeitsblaetter/abc')
    const { frame, print } = druckAbfangen()
    expect(frame.contentDocument?.body.textContent).toContain('Bleib hinter der gelben Linie.')
    await waitFor(() => expect(print).toHaveBeenCalled())
  })
})

describe('PDF-Knöpfe', () => {
  const RESULT: ArbeitsblattResult = {
    worksheet: BLATT,
    meta: { provider: 'gemini', model: 'mock', mocked: true, durationMs: 12, promptVersion: '1.0.2', attempts: 1, usage: null, validation: { ok: true, hinweise: [] } },
  }

  it('KI-Erstellung: „PDF“ öffnet die Druckansicht der Variante', async () => {
    render(<GeneratedWorksheetCard result={RESULT} onVorschau={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '🖨 PDF' }))
    const { frame, print } = druckAbfangen()
    expect(frame.contentDocument?.body.textContent).toContain('Der LKW ist da')
    await waitFor(() => expect(print).toHaveBeenCalled())
  })

  const karte = (worksheet = WORKSHEETS[0], onPdf = vi.fn()) => {
    render(
      <WorksheetCard
        worksheet={worksheet}
        expanded={false}
        isFavorite={false}
        onToggleFavorite={() => {}}
        onToggleExpand={() => {}}
        onPreview={() => {}}
        onHistory={() => {}}
        onDownload={() => {}}
        onPdf={onPdf}
        onAdapt={() => {}}
      />,
    )
    return onPdf
  }

  it('Arbeitsblätter: „PDF“ gibt es nur für gespeicherte Blätter', () => {
    karte()
    expect(screen.queryByRole('button', { name: '🖨 PDF' })).not.toBeInTheDocument()
  })

  it('Arbeitsblätter: „PDF“ bei einem gespeicherten Blatt', () => {
    const gespeichert = { ...WORKSHEETS[0], backend: { id: 'abc', status: 'entwurf' as const, version: 1, favorit: false, geaendertAm: '2026-11-12T10:00:00.000Z' } }
    const onPdf = karte(gespeichert)
    fireEvent.click(screen.getByRole('button', { name: '🖨 PDF' }))
    expect(onPdf).toHaveBeenCalledTimes(1)
  })
})
