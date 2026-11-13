import { describe, expect, it, vi } from 'vitest'
import { combineAbortSignals } from '@/lib/abortSignals'

describe('API-Abbruch ohne AbortSignal.any', () => {
  it.each([0, 1])('bricht ab, wenn Quelle %s abbricht', (source) => {
    const sources = [new AbortController(), new AbortController()]
    const combined = combineAbortSignals(sources.map((s) => s.signal))
    sources[source].abort()
    expect(combined.signal.aborted).toBe(true)
    combined.dispose()
  })
  it('berücksichtigt bereits abgebrochene Signale', () => {
    const controller = new AbortController()
    controller.abort()
    expect(combineAbortSignals([controller.signal]).signal.aborted).toBe(true)
  })
  it('entfernt Listener nach Abschluss und verarbeitet doppelte Quellen einmal', () => {
    const source = new AbortController()
    const add = vi.spyOn(source.signal, 'addEventListener')
    const remove = vi.spyOn(source.signal, 'removeEventListener')
    const combined = combineAbortSignals([source.signal, source.signal])
    expect(add).toHaveBeenCalledTimes(1)
    combined.dispose()
    expect(remove).toHaveBeenCalledTimes(1)
    source.abort()
    expect(combined.signal.aborted).toBe(false)
    add.mockRestore(); remove.mockRestore()
  })
})
