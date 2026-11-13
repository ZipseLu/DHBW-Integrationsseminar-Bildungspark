import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import { searchOnline } from '@/lib/onlineSearch'
import type { WebResult } from '@/types'

type State = { kind: 'idle' | 'loading' | 'ready' | 'error'; query: string; results: WebResult[]; error?: string }

export function WebSearchSection({ thema, onUseTopic }: { thema: string; onUseTopic?: (title: string) => void }) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle', query: '', results: [] })
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const effective = query.trim() || thema.trim()
  async function search() {
    if (!effective) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState({ kind: 'loading', query: effective, results: [] })
    try {
      const results = await searchOnline(effective, controller.signal)
      if (!controller.signal.aborted) setState({ kind: 'ready', query: effective, results })
    } catch (error) {
      if (!controller.signal.aborted) setState({ kind: 'error', query: effective, results: [], error: error instanceof ApiError && [404, 501].includes(error.status) ? 'Die Online-Suche ist noch nicht verfügbar.' : error instanceof ApiError && error.status > 0 ? error.message : 'Die Online-Suche ist fehlgeschlagen. Bitte versuchen Sie es erneut.' })
    }
  }
  return (
    <section className="rounded-lg p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)' }} aria-label="Online-Material suchen" aria-busy={state.kind === 'loading'}>
      <h3 className="text-sm font-semibold">Passendes Material im Internet</h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input type="search" maxLength={200} aria-label="Suchbegriff für die Internetsuche" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={thema || 'Thema oder Lernziel eingeben'} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search() } }} className="flex-1 min-w-0 px-3 py-2 rounded text-sm" style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }} />
        <button type="button" disabled={!effective} onClick={() => void search()} className="px-4 py-2 rounded text-sm disabled:opacity-40" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>Suchen</button>
      </div>
      {state.kind === 'loading' && <p role="status" className="text-sm">Materialien werden gesucht …</p>}
      {state.kind === 'error' && <div role="alert" className="text-sm"><p>{state.error}</p><button type="button" className="underline py-2" onClick={() => void search()}>Erneut suchen</button></div>}
      {state.kind === 'ready' && <p role="status" className="text-xs">{state.results.length ? state.results.length + ' Treffer für „' + state.query + '“' : 'Keine Treffer für „' + state.query + '“. Versuchen Sie einen anderen Suchbegriff.'}</p>}
      <ul className="flex flex-col gap-3">
        {state.results.map((result) => <li key={result.url} className="text-sm flex flex-col gap-1">
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline font-medium break-words">{result.title}</a>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{result.source}</span>
          {result.snippet && <p>{result.snippet}</p>}
          {onUseTopic && <button type="button" className="self-start text-xs underline py-2" onClick={() => onUseTopic(result.title)}>Als Thema übernehmen</button>}
        </li>)}
      </ul>
    </section>
  )
}
