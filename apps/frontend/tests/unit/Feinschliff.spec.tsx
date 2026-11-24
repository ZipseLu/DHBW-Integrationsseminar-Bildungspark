import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { Fussleiste } from '@/layout/Fussleiste'

/**
 * FE-32 (website review of 15.11.): texts and readability – level explanation in the
 * KI-Erstellung, labels in normal spelling, no English terms, no "Prototyp" badge,
 * footer with the legal links of the Bildungspark.
 */
beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ anzahl: 0, lernziele: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function openPage(label: string) {
  render(<App />)
  const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
  fireEvent.click(within(nav).getByRole('button', { name: new RegExp(label) }))
}

describe('Feinschliff (FE-32)', () => {
  it('zeigt kein Abzeichen „Prototyp“ mehr', () => {
    render(<App />)
    expect(screen.queryByText('Prototyp')).not.toBeInTheDocument()
  })

  it('erklärt unter den Stufen-Kacheln der KI-Erstellung, was T, A, F und B bedeuten', () => {
    openPage('KI-Erstellung')
    const stufen = screen.getByRole('group', { name: 'Niveaustufen' })
    const hinweis = stufen.nextElementSibling
    expect(hinweis).toHaveTextContent('T ein Arbeitsschritt · A einige Arbeitsschritte · F bekannte Situationen · B neue Situationen')
  })

  it('beschriftet Felder in normaler Schreibweise', () => {
    openPage('KI-Erstellung')
    expect(screen.getByLabelText('Berufsbild')).toBeInTheDocument()
    expect(screen.getByLabelText('Lernziel aus dem Lehrplan')).toBeInTheDocument()
    expect(screen.queryByText('BERUFSBILD')).not.toBeInTheDocument()
  })

  it('nennt die Lehrpläne „Lehrplan-Übersicht“ statt „Curriculum-Bibliothek“', () => {
    openPage('Lehrpläne')
    expect(screen.getByRole('region', { name: 'Lehrplan-Übersicht' })).toBeInTheDocument()
    expect(screen.queryByText(/Curriculum/)).not.toBeInTheDocument()
  })

  it('hat auf jeder Seite eine Fußleiste', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Bildungspark Heilbronn-Franken · Arbeitsblattverwaltung')
  })
})

describe('Fussleiste', () => {
  it('verlinkt Impressum und Datenschutz in einem neuen Tab', () => {
    render(<Fussleiste links={[{ label: 'Impressum', url: 'https://example.org/impressum' }, { label: 'Datenschutz', url: 'https://example.org/datenschutz' }]} />)
    const links = within(screen.getByRole('navigation', { name: 'Rechtliches' })).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href'), l.getAttribute('target'), l.getAttribute('rel')])).toEqual([
      ['Impressum', 'https://example.org/impressum', '_blank', 'noopener noreferrer'],
      ['Datenschutz', 'https://example.org/datenschutz', '_blank', 'noopener noreferrer'],
    ])
  })

  it('zeigt keinen Link ohne Adresse', () => {
    render(<Fussleiste links={[{ label: 'Impressum', url: '' }, { label: 'Datenschutz' }]} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Rechtliches' })).not.toBeInTheDocument()
  })
})
