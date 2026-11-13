import { apiFetch, ApiError } from '@/lib/api'
import type { WebResult } from '@/types'

export function safeMaterialUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

/** Confirmed FE-14 search contract: GET /api/suche?q=... -> { results: WebResult[] }. */
export async function searchOnline(query: string, signal?: AbortSignal): Promise<WebResult[]> {
  const q = query.trim()
  if (!q) return []
  if (q.length > 200) throw new ApiError('Der Suchbegriff darf höchstens 200 Zeichen lang sein.', 400, 'validation_error')
  const path = import.meta.env.VITE_WEB_SEARCH_PATH || '/api/suche'
  const response = await apiFetch(`${path}?${new URLSearchParams({ q })}`, { signal })
  const body = await response.json()
  if (!Array.isArray(body?.results)) throw new ApiError('Die Suchantwort ist ungültig.', 502, 'invalid_search_response')
  const seen = new Set<string>()
  return body.results.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return []
    const result = item as Partial<WebResult>
    const url = safeMaterialUrl(result.url)
    if (!url || typeof result.title !== 'string' || !result.title.trim() || seen.has(url)) return []
    seen.add(url)
    return [{ title: result.title, url, source: new URL(url).hostname, snippet: typeof result.snippet === 'string' ? result.snippet : '' }]
  })
}
