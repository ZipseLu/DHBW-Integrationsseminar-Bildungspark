import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { PARTICIPANTS } from '@/data/participants'
import { STAFF_USERS, initialsOf } from '@/data/users'
import { buildStations, moveItem, nextParticipantId } from '@/lib/participants'
import { DEFAULT_SETTINGS, applyTheme, loadSettings, saveSettings } from '@/lib/settings'
import { shortName } from '@/pages/teilnehmende/ParticipantCard'

/**
 * Tests fuer Dashboard, Teilnehmende, Berichte, Benutzerverwaltung und Einstellungen.
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
  it('zeigt Kennzahlen und die Personas einer Niveaustufe', () => {
    openPage('Dashboard')
    expect(screen.getByText('Aktive Teilnehmende')).toBeInTheDocument()
    expect(screen.getByText(String(PARTICIPANTS.length))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Arbeitsplatz/ }))
    expect(screen.getByText('Persona E')).toBeInTheDocument()
    expect(screen.getByText('Persona H')).toBeInTheDocument()
  })

  it('"Alle Teilnehmenden" wechselt zur Seite Teilnehmende', () => {
    openPage('Dashboard')
    fireEvent.click(screen.getByRole('button', { name: 'Alle Teilnehmenden →' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Teilnehmende' })).toBeInTheDocument()
  })
})

describe('Teilnehmende', () => {
  it('listet alle anonymisierten Profile', () => {
    openPage('Teilnehmende')
    expect(screen.getAllByRole('article')).toHaveLength(PARTICIPANTS.length)
  })

  it('legt eine neue Person an und lehnt doppelte Kennungen ab', () => {
    openPage('Teilnehmende')
    fireEvent.click(screen.getByRole('button', { name: '+ Teilnehmer hinzufügen' }))
    let dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/ANONYME KENNUNG/), { target: { value: 'IW3-9999' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))
    expect(screen.getByRole('article', { name: 'Teilnehmer IW3-9999' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Teilnehmer hinzufügen' }))
    dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/ANONYME KENNUNG/), { target: { value: 'IW3-9999' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Teilnehmer anlegen' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Die Kennung IW3-9999 gibt es bereits.')
  })

  it('loescht erst nach Bestaetigung', () => {
    openPage('Teilnehmende')
    const card = screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })
    fireEvent.click(within(card).getByRole('button', { name: 'Details' }))
    fireEvent.click(within(card).getByRole('button', { name: '✕ Löschen' }))
    expect(screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Ja, löschen' }))
    expect(screen.queryByRole('article', { name: 'Teilnehmer IW3-4421' })).not.toBeInTheDocument()
  })

  it('weist ein Arbeitsblatt des aktiven Berufsfelds zu', () => {
    openPage('Teilnehmende')
    const card = screen.getByRole('article', { name: 'Teilnehmer IW3-4421' })
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

describe('Berichte', () => {
  it('zeigt den Platzhalter aus dem Mockup', () => {
    openPage('Berichte')
    expect(screen.getByRole('heading', { name: 'Berichte & Auswertungen' })).toBeInTheDocument()
  })
})

describe('Benutzerverwaltung', () => {
  it('prueft das Formular und legt ein Konto an', () => {
    openPage('Benutzerverwaltung')
    fireEvent.click(screen.getByRole('button', { name: '+ Mitarbeiter anlegen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('NAME *'), { target: { value: 'Max Beispiel' } })
    fireEvent.change(within(dialog).getByLabelText('E-MAIL-ADRESSE *'), { target: { value: 'm.beispiel@bildungspark.example' } })
    fireEvent.change(within(dialog).getByLabelText('PASSWORT *'), { target: { value: 'kurz' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konto anlegen' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('mindestens 8 Zeichen')

    fireEvent.change(within(dialog).getByLabelText('PASSWORT *'), { target: { value: 'langespasswort' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konto anlegen' }))
    expect(screen.getByText('Max Beispiel')).toBeInTheDocument()
    expect(screen.getByText(`${STAFF_USERS.length + 1} Konten · nur für Administratoren sichtbar`)).toBeInTheDocument()
  })

  it('erlaubt nicht, das eigene Konto zu loeschen', () => {
    openPage('Benutzerverwaltung')
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
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#1A1714')
    expect(loadSettings()).toMatchObject({ darkMode: true, sidebarCompact: true })
    // Kompakt: Beschriftung nur noch als aria-label/title
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('title', 'Dashboard')
  })

  it('prueft die Eingaben beim Passwort aendern', () => {
    openPage('Einstellungen')
    fireEvent.change(screen.getByLabelText('AKTUELLES PASSWORT'), { target: { value: 'alt' } })
    fireEvent.change(screen.getByLabelText('NEUES PASSWORT'), { target: { value: 'abcdefgh' } })
    fireEvent.change(screen.getByLabelText('PASSWORT WIEDERHOLEN'), { target: { value: 'abcdefgx' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    expect(screen.getByRole('alert')).toHaveTextContent('stimmen nicht überein')
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

  it('vergibt freie Kennungen und verschiebt Eintraege', () => {
    expect(nextParticipantId([])).toBe('TN-001')
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
    expect(within(dialog).getByText('ONLINE-VORSCHAU · LEHRPLAN')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Binnendifferenzierung').length).toBeGreaterThan(0)
  })

  it('"Arbeitsblatt daraus erstellen" waehlt das Lernziel in der KI-Erstellung vor', async () => {
    openPage('Lehrpläne')
    fireEvent.click(screen.getByRole('button', { name: /Gastronomie & Hauswirtschaft/ }))
    const card = screen.getAllByRole('article')[0]
    fireEvent.click(within(card).getByRole('button', { name: '✦ Arbeitsblatt daraus erstellen' }))

    expect(screen.getByRole('heading', { level: 1, name: 'KI-Erstellung' })).toBeInTheDocument()
    expect(screen.getByLabelText('BERUFSBILD')).toHaveValue('Gastronomie & Hauswirtschaft')
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
