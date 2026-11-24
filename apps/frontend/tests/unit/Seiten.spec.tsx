import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { PARTICIPANTS } from '@/data/participants'
import { STAFF_USERS, initialsOf } from '@/data/users'
import { buildStations, moveItem, pruefeKennung } from '@/lib/participants'
import { DEFAULT_SETTINGS, applyTheme, loadSettings, saveSettings } from '@/lib/settings'
import { shortName } from '@/pages/teilnehmende/ParticipantCard'

/**
 * Tests fuer Dashboard, Teilnehmende, Benutzerverwaltung und Einstellungen.
 */

beforeEach(() => {
  window.localStorage.clear()
  // Die KI-Erstellung fragt beim Oeffnen GET /api/lehrplaene ab
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ anzahl: 0, lernziele: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('style')
})

function openPage(label: string) {
  render(<App />)
  const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
  fireEvent.click(within(nav).getByRole('button', { name: new RegExp(label) }))
}

describe('Dashboard', () => {
  it('zeigt Kennzahlen und den Lernstand der Teilnehmenden ohne Personas (FE-30)', async () => {
    openPage('Dashboard')
    expect(screen.getByText('Aktive Teilnehmende')).toBeInTheDocument()
    // The fetch mock has no participant list, so the sample data are used (FE-12)
    expect(await screen.findByText(String(PARTICIPANTS.length))).toBeInTheDocument()

    const bereich = screen.getByRole('region', { name: 'Lernstand der Teilnehmenden' })
    expect(within(bereich).getAllByRole('listitem')).toHaveLength(Math.min(PARTICIPANTS.length, 8))
    expect(within(bereich).getByRole('listitem', { name: `Lernstand ${PARTICIPANTS[0].id}` })).toBeInTheDocument()
    expect(screen.queryByText(/Persona/)).not.toBeInTheDocument()
  })

  it('"Alle Teilnehmenden" wechselt zur Seite Teilnehmende', () => {
    openPage('Dashboard')
    fireEvent.click(screen.getByRole('button', { name: 'Alle Teilnehmenden →' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Teilnehmende' })).toBeInTheDocument()
  })
})

describe('Teilnehmende', () => {
  // Without a participant list from the backend the sample data are shown and changes stay local (FE-12)
  it('listet alle anonymisierten Profile', async () => {
    openPage('Teilnehmende')
    expect(await screen.findAllByRole('article')).toHaveLength(PARTICIPANTS.length)
  })

  it('legt eine neue Person an und lehnt doppelte Kennungen ab', async () => {
    openPage('Teilnehmende')
    await screen.findByRole('article', { name: 'Teilnehmer IW3-4421' })
    fireEvent.click(screen.getByRole('button', { name: '+ Teilnehmer hinzufügen' }))
    let dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Anonyme Kennung/), { target: { value: 'IW3-9999' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))
    expect(await screen.findByRole('article', { name: 'Teilnehmer IW3-9999' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Teilnehmer hinzufügen' }))
    dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Anonyme Kennung/), { target: { value: 'IW3-9999' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Die Kennung IW3-9999 gibt es bereits.')
  })

  it('verlangt die IW3-Nummer und lehnt Namen ab (FE-28)', async () => {
    openPage('Teilnehmende')
    await screen.findByRole('article', { name: 'Teilnehmer IW3-4421' })
    const anzahl = screen.getAllByRole('article').length
    fireEvent.click(screen.getByRole('button', { name: '+ Teilnehmer hinzufügen' }))
    const dialog = screen.getByRole('dialog')
    const feld = within(dialog).getByLabelText(/Anonyme Kennung/)
    expect(feld).toBeRequired()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Bitte die IW3-Nummer der Person eintragen')
    expect(feld).toHaveAttribute('aria-invalid', 'true')

    fireEvent.change(feld, { target: { value: 'Max Müller' } })
    expect(feld).not.toHaveAttribute('aria-invalid')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('keine Namen')
    expect(screen.getAllByRole('article')).toHaveLength(anzahl)
  })

  it('loescht erst nach Bestaetigung', async () => {
    openPage('Teilnehmende')
    const card = await screen.findByRole('article', { name: 'Teilnehmer IW3-4421' })
    fireEvent.click(within(card).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(card).getByRole('button', { name: '✕ Löschen' }))
    expect(screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Ja, löschen' }))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Teilnehmer IW3-4421' })).not.toBeInTheDocument())
  })

  it('weist ein Arbeitsblatt des aktiven Berufsfelds zu', async () => {
    openPage('Teilnehmende')
    const card = await screen.findByRole('article', { name: 'Teilnehmer IW3-4421' })
    fireEvent.click(within(card).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(card).getByRole('button', { name: '✦ Arbeitsblatt zuweisen' }))

    const dialog = screen.getByRole('dialog')
    const zuweisen = within(dialog).getByRole('button', { name: 'Zuweisen' })
    expect(zuweisen).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('option', { name: /Begleitpapiere prüfen/ }))
    fireEvent.click(zuweisen)

    expect(screen.getByRole('status')).toHaveTextContent('Arbeitsblatt „Begleitpapiere prüfen“ wurde IW3-4421 zugewiesen.')
  })
})

describe('Benutzerverwaltung', () => {
  // The fetch mock has no account list, so the sample accounts are used locally (FE-09)
  it('prueft das Formular und legt ein Konto an', async () => {
    openPage('Benutzerverwaltung')
    await screen.findByText(`${STAFF_USERS.length} Konten · nur für Administratoren sichtbar`)
    fireEvent.click(screen.getByRole('button', { name: '+ Mitarbeiter anlegen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name *'), { target: { value: 'Max Beispiel' } })
    fireEvent.change(within(dialog).getByLabelText('E-Mail-Adresse *'), { target: { value: 'm.beispiel@bildungspark.example' } })
    fireEvent.change(within(dialog).getByLabelText('Passwort *'), { target: { value: 'kurz' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konto anlegen' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('mindestens 8 Zeichen')

    fireEvent.change(within(dialog).getByLabelText('Passwort *'), { target: { value: 'langespasswort' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konto anlegen' }))
    expect(await screen.findByText('Max Beispiel')).toBeInTheDocument()
    expect(screen.getByText(`${STAFF_USERS.length + 1} Konten · nur für Administratoren sichtbar`)).toBeInTheDocument()
  })

  it('erlaubt nicht, das eigene Konto zu loeschen', async () => {
    openPage('Benutzerverwaltung')
    await screen.findByRole('button', { name: 'Konto von T. Neumann löschen' })
    expect(screen.queryByRole('button', { name: 'Konto von Celine Hager löschen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Konto von T. Neumann löschen' })).toBeInTheDocument()
  })
})

describe('Einstellungen', () => {
  it('speichert und wendet Dunkelmodus und kompakte Seitenleiste an', () => {
    openPage('Einstellungen')
    fireEvent.click(screen.getByRole('switch', { name: 'Dunkelmodus' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Kompakte Seitenleiste' }))
    fireEvent.click(screen.getByRole('button', { name: 'Einstellungen speichern' }))

    expect(screen.getByText('✓ Gespeichert')).toBeInTheDocument()
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#0E1924')
    expect(loadSettings()).toMatchObject({ darkMode: true, sidebarCompact: true })
    // Kompakt: Beschriftung nur noch als aria-label/title
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('title', 'Dashboard')
  })

  it('zeigt nur Einstellungen, die auch wirken (FE-29)', () => {
    openPage('Einstellungen')
    for (const ohneWirkung of ['Sprache der Oberfläche', 'Datumsformat', 'E-Mail-Benachrichtigungen', 'Automatisch speichern', 'Persona-Badges anzeigen']) {
      expect(screen.queryByText(ohneWirkung)).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Passwort ändern' })).not.toBeInTheDocument()
    expect(screen.getByText(/Ein neues Passwort vergibt/)).toBeInTheDocument()
  })
})

describe('Hilfsfunktionen', () => {
  it('baut den Lernweg und behaelt den Fortschritt bestehender Stationen', () => {
    const existing = PARTICIPANTS[0].berufsbilder
    const stations = buildStations(
      [
        { berufsbild: existing[1].berufsbild, level: 'F', format: 'text' },
        { berufsbild: 'Pflege & unterstützende Tätigkeiten', level: 'T', format: 'piktogramm' },
      ],
      existing,
      '2026-10-28',
    )
    expect(stations[0]).toMatchObject({ level: 'F', status: existing[1].status, worksheetsDone: existing[1].worksheetsDone })
    expect(stations[1]).toMatchObject({ status: 'ausstehend', progress: 0, startDate: '' })
  })

  it('erste neue Station startet aktiv mit heutigem Datum', () => {
    const [first] = buildStations([{ berufsbild: 'Garten- und Landschaftsbau', level: 'T', format: 'text' }], [], '2026-10-28')
    expect(first).toMatchObject({ status: 'aktiv', startDate: '2026-10-28' })
  })

  it('prueft die Kennung (FE-28) und verschiebt Eintraege', () => {
    expect(pruefeKennung('IW3-4421')).toBeNull()
    expect(pruefeKennung(' iw3-4421 ')).toBeNull()
    expect(pruefeKennung('')).toContain('IW3-Nummer')
    expect(pruefeKennung('Max Müller')).toContain('keine Namen')
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })

  it('kuerzt Berufsfeldnamen und Namen', () => {
    expect(shortName('Garten- und Landschaftsbau')).toBe('Garten')
    expect(shortName('Lagerlogistik, Handel & Versand')).toBe('Lagerlogistik')
    expect(initialsOf('Max Beispiel')).toBe('MB')
  })

  it('liest und schreibt Einstellungen und setzt CSS-Variablen', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    saveSettings({ ...DEFAULT_SETTINGS, accentColor: '#2A6B4B' })
    expect(loadSettings().accentColor).toBe('#2A6B4B')

    const el = document.createElement('div')
    applyTheme({ ...DEFAULT_SETTINGS, primaryColor: '#1A5C32' }, el)
    expect(el.style.getPropertyValue('--primary')).toBe('#1A5C32')
  })
})

describe('Lehrpläne', () => {
  it('zeigt die Lehrpläne als Karten und filtert nach Berufsfeld und Suche', () => {
    openPage('Lehrpläne')
    expect(screen.getByRole('heading', { name: 'Binnendifferenzierte Lehrpläne' })).toBeInTheDocument()
    const alle = screen.getAllByRole('article').length
    expect(alle).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Metalltechnik & Montage/ }))
    const metall = screen.getAllByRole('article')
    expect(metall.length).toBeLessThan(alle)
    metall.forEach((card) => expect(card).toHaveTextContent('Metalltechnik & Montage'))

    fireEvent.change(screen.getByLabelText('Lehrplan durchsuchen'), { target: { value: 'gibt es nicht' } })
    expect(screen.getByText('Kein Lehrplan gefunden')).toBeInTheDocument()
  })

  it('oeffnet die Online-Vorschau mit den Stufen T, A, F, B', () => {
    openPage('Lehrpläne')
    const card = screen.getAllByRole('article')[0]
    fireEvent.click(within(card).getByRole('button', { name: 'Online ansehen' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Online-Vorschau · Lehrplan')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Binnendifferenzierung').length).toBeGreaterThan(0)
  })

  it('"Arbeitsblatt daraus erstellen" waehlt das Lernziel in der KI-Erstellung vor', async () => {
    openPage('Lehrpläne')
    fireEvent.click(screen.getByRole('button', { name: /Gastronomie & Hauswirtschaft/ }))
    const card = screen.getAllByRole('article')[0]
    fireEvent.click(within(card).getByRole('button', { name: '✦ Arbeitsblatt daraus erstellen' }))

    expect(screen.getByRole('heading', { level: 1, name: 'KI-Erstellung' })).toBeInTheDocument()
    expect(screen.getByLabelText('Berufsbild')).toHaveValue('Gastronomie & Hauswirtschaft')
  })
})

describe('Lehrplan-Hilfsfunktionen', () => {
  it('gruppiert Lernziele zu Dokumenten und sortiert nach Berufsfeld und Baustein', async () => {
    const { groupLehrplaene, beispielLernziele, bausteinLabel } = await import('@/lib/lehrplaene')
    const docs = groupLehrplaene(beispielLernziele())
    expect(docs.reduce((n, d) => n + d.lernziele.length, 0)).toBe(beispielLernziele().length)
    expect(docs[0].berufsfeld).toBe('Lagerlogistik, Handel & Versand')
    expect(bausteinLabel({ ...docs[0], abschnitt: 3 })).toBe(`Baustein ${docs[0].baustein} · Abschnitt 3`)
  })

  it('erzeugt einen Word-Lehrplan mit gueltigem Dateinamen', async () => {
    const { groupLehrplaene, beispielLernziele } = await import('@/lib/lehrplaene')
    const { buildLehrplanDocument, lehrplanFileName } = await import('@/lib/lehrplanDocx')
    const doc = groupLehrplaene(beispielLernziele())[0]
    expect(buildLehrplanDocument(doc)).toBeTruthy()
    expect(lehrplanFileName(doc)).toMatch(/^Lehrplan_Lagerlogistik,_Handel_und_Versand_BS\d+_.+\.docx$/)
  })
})
