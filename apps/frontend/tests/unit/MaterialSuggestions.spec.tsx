import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MaterialSuggestions } from '@/components/MaterialSuggestions'
import type { LernzielInput } from '@/lib/api'

const goal: LernzielInput = { berufsfeld: 'Metall', baustein: 1, ausbildungsbaustein: 'Werkzeuge', titel: 'Holz bearbeiten', niveaus: { T: { kompetenz: 'T', beispiel: '' }, A: { kompetenz: 'A', beispiel: '' }, F: { kompetenz: 'F', beispiel: '' }, B: { kompetenz: 'B', beispiel: '' } } }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('FE-19 Materialvorschläge', () => {
  it('sucht zum Lernziel und öffnet den gespeicherten Inhalt', async () => {
    const fetchMock = vi.fn(async (url: string) => String(url).includes('?') ? json({ eintraege: [{ id: 'blatt-1', titel: 'Holzübung', stufe: 'T', berufsfeld: 'Metall' }] }) : json({ arbeitsblatt: { id: 'blatt-1', titel: 'Holzübung', inhalt: { einleitung: 'So sägst du Holz.', aufgaben: [{ nr: 1, anweisung: 'Lies die Anleitung.' }], woerterbuch: [], hinweisAnleiter: '' } } }))
    vi.stubGlobal('fetch', fetchMock)
    render(<MaterialSuggestions goal={goal} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Holzübung öffnen' }))
    expect(await screen.findByText('So sägst du Holz.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(String(fetchMock.mock.calls[0][0])).toContain('q=Holz+bearbeiten')
    expect(String(fetchMock.mock.calls[0][0])).toContain('berufsfeld=Metall')
  })
  it('unterscheidet leere Ergebnisse von Fehlern und lässt erneut laden', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({ eintraege: [] })))
    render(<MaterialSuggestions goal={goal} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('noch keine passenden Arbeitsblätter'))
  })
})
