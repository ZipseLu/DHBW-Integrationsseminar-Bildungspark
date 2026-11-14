import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_USER } from '@/data/users'
import { WORKSHEETS } from '@/data/worksheets'
import type { Arbeitsblatt, GespeichertesArbeitsblatt } from '@/lib/api'
import { versetztePaare } from '@/lib/druck'
import { worksheetAusGespeichertem } from '@/lib/gespeicherteArbeitsblaetter'
import { WorksheetDetailPanel } from '@/pages/arbeitsblaetter/WorksheetDetailPanel'
import type { Worksheet } from '@/types'

/**
 * FE-22: the preview of a saved worksheet shows its real content
 * (GET /api/arbeitsblaetter/:id), sample data keep the curriculum view.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const INHALT: Arbeitsblatt = {
  titel: 'Güter richtig aus-zeichnen',
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  stufe: 'A',
  format: 'piktogramm',
  sprache: 'Leichte Sprache',
  lernziel: 'Güter auszeichnen und sortieren',
  einleitung: 'Neue Waren kommen an.\nAchtung: Sicherheits-messer benutzen.',
  aufgaben: [
    { nr: 1, typ: 'ankreuzen', anweisung: 'Was gehört auf ein Etikett?', optionen: ['Der Name', 'Ein Wunsch-zettel'], piktogramm: 'ankreuzen' },
    { nr: 2, typ: 'zuordnen', anweisung: 'Verbinde.', optionen: ['Etikett | Aufkleber', 'Regal | Lagerplatz'] },
    { nr: 3, typ: 'malen', anweisung: 'Male ein Etikett.' },
    { nr: 4, typ: 'praxis', anweisung: 'Klebe ein Etikett auf. Frage deinen Anleiter: Passt das?' },
    { nr: 5, typ: 'offen', anweisung: 'Warum sortieren wir?' },
  ],
  woerterbuch: [{ wort: 'Etikett', erklaerung: 'Ein Aufkleber mit Infos.' }],
  hinweisAnleiter: 'Zeit: 30 Minuten.',
  baustein: 3,
  ausbildungsbaustein: 'Lagerung von Gütern',
}

const BLATT: GespeichertesArbeitsblatt = {
  id: 'abc-1',
  titel: INHALT.titel,
  berufsfeld: INHALT.berufsfeld,
  baustein: 3,
  ausbildungsbaustein: 'Lagerung von Gütern',
  lernziel: INHALT.lernziel,
  stufe: 'A',
  format: 'piktogramm',
  sprache: 'Leichte Sprache',
  status: 'entwurf',
  kiGeneriert: true,
  favorit: false,
  elternId: null,
  version: 1,
  erstelltVon: 'C. Hager',
  erstelltAm: '2026-11-12T09:00:00.000Z',
  geaendertAm: '2026-11-12T09:00:00.000Z',
}

function panel(worksheet: Worksheet) {
  return render(
    <WorksheetDetailPanel worksheet={worksheet} tab="vorschau" user={CURRENT_USER} onTabChange={() => {}} onClose={() => {}} onAdapt={() => {}} onDownload={() => {}} />,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Vorschau gespeicherter Arbeitsblätter (FE-22)', () => {
  it('zeigt den echten Inhalt mit allen Aufgaben', async () => {
    const fetchMock = vi.fn(async (_url: string) => json({ arbeitsblatt: { ...BLATT, inhalt: INHALT } }))
    vi.stubGlobal('fetch', fetchMock)
    panel(worksheetAusGespeichertem(BLATT, 1))

    expect(screen.getByRole('status')).toHaveTextContent('Vorschau wird geladen')
    const seite = await screen.findByRole('article', { name: 'Vorschau Güter richtig aus-zeichnen' })
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/arbeitsblaetter/abc-1')

    expect(within(seite).getByText('Achtung: Sicherheits-messer benutzen.')).toBeInTheDocument()
    expect(within(seite).getByText(/Aufgabe 1: Ankreuzen/)).toBeInTheDocument()
    expect(within(seite).getByText('☐ Der Name')).toBeInTheDocument()
    // Matching: right column shifted by one
    expect(within(seite).getByText('☐ Lagerplatz')).toBeInTheDocument()
    expect(within(seite).getByLabelText('Malrahmen')).toBeInTheDocument()
    expect(within(seite).getByText(/\( \) Ja/)).toBeInTheDocument()
    expect(within(seite).getByLabelText('Schreiblinien')).toBeInTheDocument()
    expect(within(seite).getByText('Ein Aufkleber mit Infos.')).toBeInTheDocument()
    expect(within(seite).getByText('Zeit: 30 Minuten.')).toBeInTheDocument()
    // The curriculum table of the sample view is gone
    expect(screen.queryByText(/Binnendifferenzierung nach Niveaustufen/i)).not.toBeInTheDocument()
  })

  it('lädt nach einer neuen Version neu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ arbeitsblatt: { ...BLATT, inhalt: INHALT } }))
      .mockResolvedValueOnce(json({ arbeitsblatt: { ...BLATT, version: 2, inhalt: { ...INHALT, titel: 'Neuer Titel' } } }))
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = panel(worksheetAusGespeichertem(BLATT, 1))
    await screen.findByRole('article', { name: 'Vorschau Güter richtig aus-zeichnen' })

    rerender(
      <WorksheetDetailPanel
        worksheet={worksheetAusGespeichertem({ ...BLATT, version: 2 }, 1)}
        tab="vorschau"
        user={CURRENT_USER}
        onTabChange={() => {}}
        onClose={() => {}}
        onAdapt={() => {}}
        onDownload={() => {}}
      />,
    )
    expect(await screen.findByRole('article', { name: 'Vorschau Neuer Titel' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('meldet einen Ladefehler und lädt auf Knopfdruck neu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
      .mockResolvedValueOnce(json({ arbeitsblatt: { ...BLATT, inhalt: INHALT } }))
    vi.stubGlobal('fetch', fetchMock)
    panel(worksheetAusGespeichertem(BLATT, 1))

    expect(await screen.findByRole('alert')).toHaveTextContent('Die Vorschau konnte nicht geladen werden: Die Datenbank ist nicht verfügbar.')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }))
    expect(await screen.findByRole('article', { name: 'Vorschau Güter richtig aus-zeichnen' })).toBeInTheDocument()
  })

  it('zeigt bei Beispieldaten weiter die Lehrplan-Ansicht ohne Backend-Aufruf', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    panel(WORKSHEETS[0])
    expect(screen.getByText(/Binnendifferenzierung nach Niveaustufen/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /PDF/ })).not.toBeInTheDocument()
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })

  it('bietet bei gespeicherten Blättern im Panel „PDF“ an', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ arbeitsblatt: { ...BLATT, inhalt: INHALT } })))
    panel(worksheetAusGespeichertem(BLATT, 1))
    await screen.findByRole('article', { name: 'Vorschau Güter richtig aus-zeichnen' })
    expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument()
  })
})

describe('versetztePaare', () => {
  it('versetzt die rechte Spalte um eins', () => {
    expect(versetztePaare(['A | 1', 'B | 2', 'C | 3'])).toEqual([
      ['A', '2'],
      ['B', '3'],
      ['C', '1'],
    ])
    expect(versetztePaare(['A | 1'])).toEqual([['A', '1']])
    expect(versetztePaare(['ohne Strich'])).toEqual([['ohne Strich', '']])
  })
})
