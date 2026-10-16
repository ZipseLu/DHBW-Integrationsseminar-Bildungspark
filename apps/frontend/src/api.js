/**
 * API-Client.
 *
 * Nutzt im Development den Vite-Proxy: `/api/...` wird auf das Backend
 * weitergeleitet, dadurch ist alles same-origin und CORS faellt weg.
 * Im Production-Build laeuft Nginx mit demselben /api-Proxy.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`

  let response
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (cause) {
    // Netzwerkfehler (Backend nicht erreichbar) in eine klare Meldung uebersetzen
    throw new ApiError(`Backend nicht erreichbar (${url})`, 0, { cause })
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    throw new ApiError(body?.message ?? `HTTP ${response.status}`, response.status, body)
  }

  return body
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export const api = {
  health: () => request('/api/health'),

  aiStatus: () => request('/api/ai/status'),

  aiGenerate: (body) => request('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) }),
}
