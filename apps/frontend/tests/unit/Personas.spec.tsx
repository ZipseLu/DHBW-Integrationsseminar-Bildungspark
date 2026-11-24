import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERSONA_MAP } from '@/data/constants'
import { teilnehmendeJePersona } from '@/lib/participants'
import { PersonaUebersicht } from '@/pages/dashboard/PersonaUebersicht'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import type { BerufStation, Format, Level, Participant } from '@/types'

/**
 * FE-43: persona overview on the dashboard – which persona A–P means which level and
 * accessibility format, and how many participants currently work like that.
 */
function station(level: Level, format: Format, status: BerufStation['status'] = 'aktiv'): BerufStation {
  return { berufsbild: 'Lagerlogistik, Handel & Versand', level, format, status, progress: 0, worksheetsDone: 0, startDate: '' }
}

function person(id: string, ...stationen: BerufStation[]): Participant {
  return { id, berufsbilder: stationen } as Participant
}

const PERSONEN = [
  person('IW3-0001', station('A', 'piktogramm')),
  person('IW3-0002', station('T', 'text', 'abgeschlossen'), station('A', 'piktogramm')),
  person('IW3-0003', station('T', 'text')),
  person('IW3-0004', station('B', 'mathefrei', 'ausstehend')), // no active area – not counted
]

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
})
afterEach(() => vi.unstubAllGlobals())

describe('Personas (FE-43)', () => {
  it('ordnet jeder Stufe und jedem Format genau eine Persona A–P zu', () => {
    const alle = Object.values(PERSONA_MAP).flatMap((formate) => Object.values(formate))
    expect(alle.join('')).toBe('ABCDEFGHIJKLMNOP')
  })

  it('zählt Teilnehmende nach Stufe und Format des aktiven Bereichs', () => {
    expect(teilnehmendeJePersona(PERSONEN)).toEqual({ F: 2, A: 1 })
  })

  it('zeigt je Stufe die Personas mit Bedarf und Anzahl', () => {
    render(<PersonaUebersicht participants={PERSONEN} />)
    const bereich = screen.getByRole('region', { name: 'Personas' })

    const stufeA = within(bereich).getByRole('button', { name: /Arbeitsplatz.*Personas E–H · 2 Teilnehmende/ })
    expect(stufeA).toHaveAttribute('aria-expanded', 'false')
    expect(within(bereich).getByRole('button', { name: /Berufsbild.*Personas M–P · 0 Teilnehmende/ })).toBeInTheDocument()

    fireEvent.click(stufeA)
    expect(stufeA).toHaveAttribute('aria-expanded', 'true')
    const liste = within(bereich).getByRole('list', { name: 'Personas der Stufe A' })
    expect(within(liste).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['Persona E', 'Persona F', 'Persona G', 'Persona H'])

    const f = within(liste).getByRole('listitem', { name: 'Persona F' })
    expect(f).toHaveTextContent('A – Arbeitsplatz · ◉ Mit Piktogrammen')
    expect(f).toHaveTextContent('2 Teilnehmende')
    expect(f).toHaveTextContent('Versteht Aufgaben besser durch Bilder und Symbole')
    expect(within(liste).getByRole('listitem', { name: 'Persona G' })).toHaveTextContent('niemand')

    fireEvent.click(stufeA)
    expect(within(bereich).queryByRole('list', { name: 'Personas der Stufe A' })).not.toBeInTheDocument()
  })

  it('zeigt im Lernstand die Persona jeder Person', async () => {
    render(<DashboardPage participants={PERSONEN} onNavigate={() => {}} />)
    const zeile = screen.getByRole('listitem', { name: 'Lernstand IW3-0003' })
    expect(within(zeile).getByText('Persona A')).toHaveAttribute('title', 'Persona A: T · Standard-Text')
    expect(within(screen.getByRole('listitem', { name: 'Lernstand IW3-0004' })).queryByText(/Persona/)).not.toBeInTheDocument()
  })
})
