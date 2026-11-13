import { apiFetch, ApiError } from '@/lib/api'
import { setSession, type Session } from '@/lib/session'
import type { StaffRole } from '@/types'

/** BE-01 contract confirmed on integration/adi-frontend-backend. */
export async function login(email: string, password: string, signal?: AbortSignal): Promise<void> {
  const response = await apiFetch(import.meta.env.VITE_AUTH_LOGIN_PATH || '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }), signal,
  })
  const body = await response.json()
  const user = body?.user
  if (typeof body?.token !== 'string' || !body.token || /[\r\n]/.test(body.token) ||
      !user || typeof user.id !== 'string' || typeof user.name !== 'string' ||
      typeof user.email !== 'string' || !['admin', 'dozent', 'assistent'].includes(user.role) ||
      typeof body.expiresIn !== 'number' || !Number.isFinite(body.expiresIn) || body.expiresIn <= 0 || body.expiresIn > 86400) {
    throw new ApiError('Die Anmeldung hat eine ungültige Antwort geliefert.', 502, 'invalid_auth_response')
  }
  if (signal?.aborted) return
  const session: Session = {
    token: body.token, expiresAt: Date.now() + body.expiresIn * 1000,
    user: { id: user.id, name: user.name, email: user.email, role: user.role as StaffRole,
      initials: user.name.trim().split(/\s+/).map((part: string) => part[0]).slice(0, 2).join('').toUpperCase() },
  }
  setSession(session)
}
