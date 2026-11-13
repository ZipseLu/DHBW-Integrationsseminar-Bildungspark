/** Combine cancellation sources without requiring AbortSignal.any (older browsers/jsdom). */
export function combineAbortSignals(signals: readonly AbortSignal[]): { signal: AbortSignal; dispose: () => void } {
  const sources = [...new Set(signals)]
  const controller = new AbortController()
  function dispose() { sources.forEach((signal) => signal.removeEventListener('abort', abort)) }
  function abort() { controller.abort(); dispose() }
  for (const signal of sources) {
    if (signal.aborted) { abort(); break }
    signal.addEventListener('abort', abort, { once: true })
  }
  return { signal: controller.signal, dispose }
}
