import type { WebResult } from '@/types'
import { apiFetch } from '@/lib/api'

/** Sucht im Web und filtert optional nach Dateiendung. */
export async function searchWebResults(query: string, fileType?: string): Promise<WebResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const params = new URLSearchParams({ q: trimmed })
  if (fileType) params.set('fileType', fileType)
  const response = await apiFetch(`/api/web-search?${params.toString()}`)
  const body = (await response.json()) as { results?: WebResult[] }
  return Array.isArray(body.results) ? body.results : []
}
