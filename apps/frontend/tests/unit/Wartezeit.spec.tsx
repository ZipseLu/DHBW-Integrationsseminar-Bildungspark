import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KiErstellungPage, formatWartezeit, warteHinweis } from '@/pages/ki-erstellung/KiErstellungPage'

/**
 * FE-24: elapsed time while the KI creates a variant (20 s to 2 min in QS-04).
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Sekunden, die der Zähler anzeigt ("⏱ 0:01" → 1); -1, wenn kein Zählerstand zu lesen ist. */
function gezeigteSekunden(element: HTMLElement): number {
  const treffer = element.textContent?.match(/⏱ (\d+):(\d{2})/)
  return treffer ? Number(treffer[1]) * 60 + Number(treffer[2]) : -1
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Wartezeit der KI (FE-24)', () => {
  it('zählt während der Generierung die Sekunden und verschwindet danach', async () => {
    let freigeben: (antwort: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/ai/arbeitsblatt') return new Promise<Response>((resolve) => (freigeben = resolve))
        return Promise.resolve(json({ anzahl: 0, lernziele: [] }))
      }),
    )
    render(<KiErstellungPage />)
    fireEvent.click(screen.getByRole('button', { name: '✦ 1 Variante generieren' }))

    const anzeige = await screen.findByTestId('wartezeit')
    expect(anzeige).toHaveTextContent('Eine Variante dauert meist 20 Sekunden bis 2 Minuten.')
    // Der Zähler startet bei 0:00 und läuft dann hoch. Bewusst keine exakte Sekunde
    // prüfen: auf langsamen CI-Runnern kann beim Prüfen schon 0:02 stehen (CI-Flake).
    await waitFor(() => expect(gezeigteSekunden(anzeige)).toBeGreaterThanOrEqual(1), { timeout: 5000 })

    freigeben(json({ error: 'llm_timeout', message: 'Zeitüberschreitung' }, 502))
    await waitFor(() => expect(screen.queryByTestId('wartezeit')).not.toBeInTheDocument())
  })

  it('formatiert die Zeit als Minuten:Sekunden', () => {
    expect(formatWartezeit(0)).toBe('0:00')
    expect(formatWartezeit(7)).toBe('0:07')
    expect(formatWartezeit(65)).toBe('1:05')
  })

  it('beruhigt ab einer Minute mit einem anderen Hinweis', () => {
    expect(warteHinweis(59)).toContain('20 Sekunden bis 2 Minuten')
    expect(warteHinweis(60)).toContain('braucht gerade länger als üblich')
  })
})
