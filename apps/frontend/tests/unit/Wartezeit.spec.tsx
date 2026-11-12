import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KiErstellungPage, formatWartezeit, warteHinweis } from '@/pages/ki-erstellung/KiErstellungPage'

/**
 * FE-24: elapsed time while the KI creates a variant (20 s to 2 min in QS-04).
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

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
    expect(anzeige).toHaveTextContent('⏱ 0:00')
    expect(anzeige).toHaveTextContent('Eine Variante dauert meist 20 Sekunden bis 2 Minuten.')
    await waitFor(() => expect(anzeige).toHaveTextContent('⏱ 0:01'), { timeout: 2500 })

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
