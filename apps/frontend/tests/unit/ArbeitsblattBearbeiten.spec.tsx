import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_USER, STAFF_USERS } from '@/data/users'
import type { Arbeitsblatt, GespeichertesArbeitsblatt } from '@/lib/api'
import { bereinige, formatZeitpunkt, istGeaendert, pruefeEntwurf, statusAktionen, uebernehmeGespeichertes } from '@/lib/arbeitsblattBearbeiten'
import { worksheetAusGespeichertem } from '@/lib/gespeicherteArbeitsblaetter'
import { ArbeitsblaetterPage } from '@/pages/arbeitsblaetter/ArbeitsblaetterPage'
import type { StaffUser } from '@/types'

/**
 * FE-10: edit, release and archive saved worksheets, history as a diary for substitutes.
 * fetch is mocked with a tiny in-memory backend that follows
 * apps/backend/src/routes/arbeitsblaetter.js (PATCH writes a new version).
 */

const ID = '11111111-1111-4111-8111-111111111111'

const INHALT: Arbeitsblatt = {
  titel: 'Lieferschein prüfen',
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  stufe: 'A',
  format: 'text',
  sprache: 'Leichte Sprache',
  lernziel: 'Güter entladen',
  einleitung: 'Ein Lieferschein zeigt, was geliefert wird.',
  aufgaben: [
    { nr: 1, typ: 'offen', anweisung: 'Lies den Lieferschein.' },
    { nr: 2, typ: 'ankreuzen', anweisung: 'Kreuze an.', optionen: ['Ja', 'Nein'], loesung: 'Ja' },
  ],
  woerterbuch: [{ wort: 'Lie-fer-schein', erklaerung: 'Ein Zettel zur Lieferung.' }],
  hinweisAnleiter: '10 Minuten.',
  baustein: 1,
  ausbildungsbaustein: 'Wareneingang',
}

function liste(teil: Partial<GespeichertesArbeitsblatt> = {}): GespeichertesArbeitsblatt {
  return {
    id: ID,
    titel: INHALT.titel,
    berufsfeld: INHALT.berufsfeld,
    baustein: 1,
    ausbildungsbaustein: 'Wareneingang',
    lernziel: INHALT.lernziel,
    stufe: 'A',
    format: 'text',
    sprache: 'Leichte Sprache',
    status: 'entwurf',
    kiGeneriert: true,
    favorit: false,
    elternId: null,
    version: 2,
    erstelltVon: 'C. Hager',
    erstelltAm: '2026-10-28T09:00:00.000Z',
    geaendertAm: '2026-11-02T09:00:00.000Z',
    ...teil,
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** In-memory backend for one worksheet; returns the fetch mock and the recorded PATCH bodies */
function backend({ patchFehler = false }: { patchFehler?: boolean } = {}) {
  const state = { ...liste(), inhalt: JSON.parse(JSON.stringify(INHALT)) as Arbeitsblatt }
  const patches: Record<string, unknown>[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url)
    if (u.endsWith('/verlauf')) {
      return json({ eintraege: [{ version: state.version, aktion: 'bearbeitet', autor: 'T. Neumann', notiz: 'Einleitung gekürzt', kiMeta: null, erstelltAm: state.geaendertAm }] })
    }
    if (u.endsWith(`/api/arbeitsblaetter/${ID}`)) {
      if (init?.method === 'PATCH') {
        if (patchFehler) return json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503)
        const body = JSON.parse(String(init.body)) as { worksheet?: Arbeitsblatt; status?: GespeichertesArbeitsblatt['status'] }
        patches.push(body)
        state.version += 1
        state.geaendertAm = '2026-11-03T09:15:00.000Z'
        if (body.worksheet) Object.assign(state, { inhalt: body.worksheet, titel: body.worksheet.titel })
        if (body.status) state.status = body.status
      }
      return json({ arbeitsblatt: state })
    }
    const { inhalt: _inhalt, ...eintrag } = state
    return json({ eintraege: state.status === 'archiviert' ? [] : [eintrag], seite: 1, proSeite: 100, gesamt: 1, seiten: 1 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, patches }
}

function renderPage(user: StaffUser = CURRENT_USER) {
  render(<ArbeitsblaetterPage user={user} savedDocs={[]} onSavedDocsChange={() => {}} favoriteIds={[]} onFavoriteIdsChange={() => {}} />)
}

async function oeffneBearbeiten() {
  const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })
  fireEvent.click(within(card).getByRole('button', { name: /Bearbeiten/ }))
  const dialog = screen.getByRole('dialog')
  await within(dialog).findByLabelText('Titel')
  return dialog
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Hilfsfunktionen zum Bearbeiten', () => {
  it('prüft Pflichtfelder und Längen wie das Backend', () => {
    expect(pruefeEntwurf(INHALT)).toEqual([])
    const fehler = pruefeEntwurf({ ...INHALT, titel: '  ', aufgaben: [{ nr: 1, typ: 'offen', anweisung: '' }] }, 'x'.repeat(501))
    expect(fehler).toEqual(['Titel darf nicht leer sein.', 'Anweisung von Aufgabe 1 darf nicht leer sein.', 'Notiz ist zu lang (höchstens 500 Zeichen).'])
    expect(pruefeEntwurf({ ...INHALT, aufgaben: [] })).toContain('Das Arbeitsblatt braucht mindestens eine Aufgabe.')
  })

  it('bereinigt Leerzeichen, nummeriert Aufgaben neu und entfernt leere Lösungen', () => {
    const sauber = bereinige({ ...INHALT, titel: ' Neu ', aufgaben: [{ ...INHALT.aufgaben[1], nr: 5, loesung: '  ' }] })
    expect(sauber.titel).toBe('Neu')
    expect(sauber.aufgaben[0].nr).toBe(1)
    expect(sauber.aufgaben[0]).not.toHaveProperty('loesung')
  })

  it('erkennt echte Änderungen, aber keine reinen Leerzeichen', () => {
    expect(istGeaendert(INHALT, { ...INHALT, titel: `${INHALT.titel} ` })).toBe(false)
    expect(istGeaendert(INHALT, { ...INHALT, titel: 'Anders' })).toBe(true)
  })

  it('bietet Status-Aktionen nur Dozierenden und Admins an', () => {
    expect(statusAktionen('entwurf', 'admin').map((a) => a.ziel)).toEqual(['freigegeben', 'archiviert'])
    expect(statusAktionen('freigegeben', 'dozent').map((a) => a.ziel)).toEqual(['entwurf', 'archiviert'])
    expect(statusAktionen('archiviert', 'dozent').map((a) => a.ziel)).toEqual(['entwurf'])
    expect(statusAktionen('entwurf', 'assistent')).toEqual([])
  })

  it('formatiert Zeitpunkte mit Datum und Uhrzeit', () => {
    expect(formatZeitpunkt('2026-11-03T09:15:00.000Z')).toMatch(/^03\.11\.2026, \d{2}:15$/)
    expect(formatZeitpunkt('kein Datum')).toBe('kein Datum')
  })

  it('übernimmt gespeicherte Änderungen in die Liste und entfernt archivierte Blätter', () => {
    const karten = [worksheetAusGespeichertem(liste(), 1)]
    expect(uebernehmeGespeichertes(karten, liste({ titel: 'Neu', version: 3 }))[0]).toMatchObject({ id: 1, title: 'Neu', backend: { version: 3 } })
    expect(uebernehmeGespeichertes(karten, liste({ status: 'archiviert' }))).toEqual([])
  })
})

describe('Arbeitsblatt bearbeiten (FE-10)', () => {
  it('speichert geänderten Inhalt mit Autor und Notiz als neue Version', async () => {
    const { patches } = backend()
    renderPage()
    const dialog = await oeffneBearbeiten()

    const speichern = within(dialog).getByRole('button', { name: 'Änderungen speichern' })
    expect(speichern).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText('Titel'), { target: { value: 'Lieferschein genau prüfen ' } })
    fireEvent.change(within(dialog).getByLabelText('Anweisung Aufgabe 1'), { target: { value: 'Lies den Lieferschein laut vor.' } })
    fireEvent.change(within(dialog).getByLabelText(/Was hast du geändert/), { target: { value: 'Titel angepasst' } })
    fireEvent.click(speichern)

    expect(await within(dialog).findByText('✓ Gespeichert als Version 3')).toBeInTheDocument()
    expect(patches).toHaveLength(1)
    expect(patches[0]).toMatchObject({ autor: CURRENT_USER.name, notiz: 'Titel angepasst', worksheet: { titel: 'Lieferschein genau prüfen' } })
    expect((patches[0].worksheet as Arbeitsblatt).aufgaben[0].anweisung).toBe('Lies den Lieferschein laut vor.')
    // List and panel header show the new version
    expect(await screen.findByRole('article', { name: 'Lieferschein genau prüfen' })).toBeInTheDocument()
    expect(within(dialog).getByText(/Version 3 · zuletzt geändert/)).toBeInTheDocument()
  })

  it('zeigt Prüffehler und sendet nichts, wenn der Titel leer ist', async () => {
    const { patches } = backend()
    renderPage()
    const dialog = await oeffneBearbeiten()

    fireEvent.change(within(dialog).getByLabelText('Titel'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Änderungen speichern' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Titel darf nicht leer sein.')
    expect(patches).toHaveLength(0)
  })

  it('meldet einen Fehler des Backends und behält den Entwurf', async () => {
    backend({ patchFehler: true })
    renderPage()
    const dialog = await oeffneBearbeiten()

    fireEvent.change(within(dialog).getByLabelText('Titel'), { target: { value: 'Neu' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Änderungen speichern' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Speichern fehlgeschlagen: Die Datenbank ist nicht verfügbar.')
    expect(within(dialog).getByLabelText('Titel')).toHaveValue('Neu')
  })

  it('fragt vor dem Schließen nach, wenn es ungespeicherte Änderungen gibt', async () => {
    backend()
    renderPage()
    const dialog = await oeffneBearbeiten()

    fireEvent.change(within(dialog).getByLabelText('Einleitung'), { target: { value: 'Neu.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schließen' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('ungespeicherte Änderungen')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Verwerfen und schließen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Freigeben und Archivieren (FE-10)', () => {
  it('gibt ein Blatt mit Notiz frei und lädt den Verlauf neu', async () => {
    const { patches, fetchMock } = backend()
    renderPage()
    const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })
    fireEvent.click(within(card).getByRole('button', { name: /Verlauf/ }))
    const dialog = screen.getByRole('dialog')
    await within(dialog).findByText('T. Neumann')

    fireEvent.click(within(dialog).getByRole('button', { name: '✓ Freigeben' }))
    fireEvent.change(within(dialog).getByLabelText('Notiz für den Verlauf (optional)'), { target: { value: 'Mit Gruppe 2 erprobt' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bestätigen' }))

    expect(await within(dialog).findByRole('button', { name: '↩ Zurück auf Entwurf' })).toBeInTheDocument()
    expect(patches).toEqual([{ status: 'freigegeben', autor: CURRENT_USER.name, notiz: 'Mit Gruppe 2 erprobt' }])
    expect(within(screen.getByRole('article', { name: 'Lieferschein prüfen' })).getByText('Freigegeben')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/verlauf'))).toHaveLength(2))
  })

  it('archiviert nach Bestätigung, schließt das Panel und entfernt die Karte', async () => {
    const { patches } = backend()
    renderPage()
    const dialog = await oeffneBearbeiten()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Archivieren' }))
    expect(within(dialog).getByText(/verschwindet aus der Liste/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bestätigen' }))

    expect(await screen.findByText(/wurde archiviert/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Lieferschein prüfen' })).not.toBeInTheDocument()
    expect(patches).toEqual([{ status: 'archiviert', autor: CURRENT_USER.name }])
  })

  it('zeigt Assistenzen keine Status-Aktionen, Bearbeiten bleibt möglich', async () => {
    backend()
    const assistenz = STAFF_USERS.find((u) => u.role === 'assistent')!
    renderPage(assistenz)
    const dialog = await oeffneBearbeiten()

    expect(within(dialog).queryByRole('button', { name: '✓ Freigeben' })).not.toBeInTheDocument()
    expect(within(dialog).getByText('Freigeben und Archivieren dürfen nur Dozierende und Admins.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Titel')).toBeEnabled()
  })
})
