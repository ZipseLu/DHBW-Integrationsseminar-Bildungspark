import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../AuthenticatedTestApp'

/**
 * Trello "Sidedrawer sticky machen": the content column is one screen high and
 * only <main> scrolls, so sidebar and header stay visible. jsdom has no layout engine, therefore the
 * test checks the CSS classes and the scroll reset on page change.
 */

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'db_unavailable', message: 'nicht verfügbar' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Layout mit feststehender Seitenleiste', () => {
  it('lässt nur den Hauptinhalt scrollen', () => {
    render(<App />)
    const spalte = screen.getByTestId('inhalt-spalte')
    expect(spalte).toHaveClass('h-screen')
    expect(screen.getByRole('main')).toHaveClass('overflow-auto')
    expect(spalte).toContainElement(screen.getByRole('main'))
    expect(spalte).not.toContainElement(screen.getByRole('navigation', { name: 'Hauptnavigation' }))
  })

  it('springt beim Seitenwechsel nach oben', () => {
    render(<App />)
    const main = screen.getByRole('main')
    // jsdom does not scroll, so emulate a scrolled position
    let scrollTop = 500
    Object.defineProperty(main, 'scrollTop', { configurable: true, get: () => scrollTop, set: (wert: number) => (scrollTop = wert) })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Hauptnavigation' })).getByRole('button', { name: /Teilnehmende/ }))
    expect(main.scrollTop).toBe(0)
  })
})
