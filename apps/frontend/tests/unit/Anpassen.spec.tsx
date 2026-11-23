import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_USER } from '@/data/users'
import type { Arbeitsblatt, GespeichertesArbeitsblatt } from '@/lib/api'
import type { KiVorauswahl } from '@/lib/lehrplaene'
import { vorlageText } from '@/lib/vorlage'
import { ArbeitsblaetterPage } from '@/pages/arbeitsblaetter/ArbeitsblaetterPage'
import { KiErstellungPage } from '@/pages/ki-erstellung/KiErstellungPage'

/**
 * FE-23: "✦ Anpassen" hands a worksheet over to the real KI-Erstellung
 * (instead of the former simulated panel). fetch is mocked.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const INHALT: Arbeitsblatt = {
  titel: 'Lieferschein prüfen',
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  stufe: 'A',
  format: 'text',
  sprache: 'Leichte Sprache',
  lernziel: 'Güter entladen',
  einleitung: 'Ein LKW bringt Ware.',
  aufgaben: [
    { nr: 1, typ: 'ankreuzen', anweisung: 'Was steht auf dem Lieferschein?', optionen: ['Die Anzahl', 'Das Wetter'] },
    { nr: 2, typ: 'praxis', anweisung: 'Prüfe einen Lieferschein.' },
  ],
  woerterbuch: [{ wort: 'Liefer-schein', erklaerung: 'Ein Zettel mit der Ware.' }],
  hinweisAnleiter: 'Nicht in die Vorlage übernehmen.',
  baustein: 1,
  ausbildungsbaustein: 'Wareneingang',
}

const BLATT: GespeichertesArbeitsblatt = {
  id: '11111111-1111-4111-8111-111111111111',
  titel: 'Lieferschein prüfen',
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  baustein: 1,
  ausbildungsbaustein: 'Wareneingang',
  lernziel: 'Güter entladen',
  stufe: 'A',
  format: 'text',
  sprache: 'Leichte Sprache',
  status: 'freigegeben',
  kiGeneriert: true,
  favorit: false,
  elternId: null,
  version: 2,
  erstelltVon: 'C. Hager',
  erstelltAm: '2026-10-28T09:00:00.000Z',
  geaendertAm: '2026-10-29T09:00:00.000Z',
}

function backend(detail: () => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.startsWith('/api/uploads')) return json({ eintraege: [], gesamt: 0 })
      if (url.startsWith(`/api/arbeitsblaetter/${BLATT.id}`)) return detail()
      return json({ eintraege: [BLATT], seite: 1, proSeite: 100, gesamt: 1, seiten: 1 })
    }),
  )
}

function renderPage() {
  const onKiAnpassen = vi.fn<(v: KiVorauswahl) => void>()
  render(<ArbeitsblaetterPage user={CURRENT_USER} onKiAnpassen={onKiAnpassen} favoriteIds={[]} onFavoriteIdsChange={() => {}} />)
  return onKiAnpassen
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('„✦ Anpassen“ (FE-23)', () => {
  it('übergibt ein gespeichertes Blatt mit Lernziel und Inhalt als Vorlage', async () => {
    backend(() => json({ arbeitsblatt: { ...BLATT, inhalt: INHALT } }))
    const onKiAnpassen = renderPage()
    const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })
    fireEvent.click(menuePunkt(card, '✦ Mit KI anpassen'))

    await waitFor(() => expect(onKiAnpassen).toHaveBeenCalledTimes(1))
    const vorauswahl = onKiAnpassen.mock.calls[0][0]
    expect(vorauswahl).toMatchObject({ berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, titel: 'Güter entladen', thema: 'Lieferschein prüfen' })
    expect(vorauswahl.vorlage?.name).toBe('Lieferschein prüfen')
    expect(vorauswahl.vorlage?.text).toContain('Aufgabe 1 (Ankreuzen): Was steht auf dem Lieferschein?')
    // The simulated panel is gone
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('meldet, wenn der Inhalt nicht geladen werden kann', async () => {
    backend(() => json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
    const onKiAnpassen = renderPage()
    const card = await screen.findByRole('article', { name: 'Lieferschein prüfen' })
    fireEvent.click(menuePunkt(card, '✦ Mit KI anpassen'))

    expect(await screen.findByText('Anpassen nicht möglich: Die Datenbank ist nicht verfügbar.')).toBeInTheDocument()
    expect(onKiAnpassen).not.toHaveBeenCalled()
  })

  it('KI-Erstellung: Lernziel ist vorausgewählt, die Vorlage steht in den Erwartungen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ anzahl: 0, lernziele: [] })))
    render(
      <KiErstellungPage
        vorauswahl={{ berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, titel: 'Güter entladen', thema: 'Lieferschein prüfen', vorlage: { name: 'Lieferschein prüfen', text: vorlageText(INHALT) } }}
      />,
    )
    expect(screen.getByRole('note')).toHaveTextContent('Lernziel ist vorausgewählt')
    expect(screen.getByLabelText(/Thema \/ Titel/)).toHaveValue('Lieferschein prüfen')
    expect((screen.getByLabelText(/Erwartungen/) as HTMLTextAreaElement).value).toContain('Prüfe einen Lieferschein.')
  })
})

describe('KI-Erstellung aus „Arbeitsblatt zuweisen“ (FE-33)', () => {
  it('wählt Berufsfeld, Stufe und Format der Person vor', () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ anzahl: 0, lernziele: [] })))
    render(<KiErstellungPage vorauswahl={{ berufsfeld: 'Lagerlogistik, Handel & Versand', stufe: 'F', format: 'mathefrei' }} />)

    expect(screen.getByRole('note')).toHaveTextContent('Für die Zuweisung vorausgewählt: Lagerlogistik, Handel & Versand · Stufe F · Ohne Rechnen.')
    const gedrueckt = (gruppe: string) =>
      within(screen.getByRole('group', { name: gruppe }))
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.textContent)
    expect(gedrueckt('Niveaustufen')).toEqual([expect.stringContaining('F')])
    expect(gedrueckt('Barrierefreiheits-Formate')).toEqual([expect.stringContaining('Ohne Rechnen')])
  })
})

describe('vorlageText', () => {
  it('fasst Titel, Einleitung, Aufgaben mit Optionen und Wörterbuch zusammen', () => {
    expect(vorlageText(INHALT)).toBe(
      [
        'Lieferschein prüfen',
        'Ein LKW bringt Ware.',
        'Aufgabe 1 (Ankreuzen): Was steht auf dem Lieferschein?\n- Die Anzahl\n- Das Wetter',
        'Aufgabe 2 (Praxis-Übung): Prüfe einen Lieferschein.',
        'Wörter-Buch: Liefer-schein: Ein Zettel mit der Ware.',
      ].join('\n\n'),
    )
  })
})

/** FE-31: further card actions sit in the "⋯" menu */
function menuePunkt(card: HTMLElement, name: string | RegExp) {
  fireEvent.click(within(card).getByRole('button', { name: /Weitere Aktionen/ }))
  return screen.getByRole('menuitem', { name })
}
