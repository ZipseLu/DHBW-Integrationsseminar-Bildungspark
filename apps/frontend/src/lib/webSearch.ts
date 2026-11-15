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

/** FE-35: text of a web search hit, read by the backend (PDF via the AI, DOCX directly) */
export type WebDokument = { text: string; dateityp: string; gekuerzt: boolean; mocked: boolean }

/** POST /api/web-search/dokument – loads a hit as template for the KI-Erstellung */
export async function ladeWebDokument(url: string): Promise<WebDokument> {
  const response = await apiFetch('/api/web-search/dokument', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return (await response.json()) as WebDokument
}
