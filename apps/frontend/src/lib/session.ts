import type { StaffUser } from '@/types'

export type Session = { token: string; user: StaffUser; expiresAt: number }
let session: Session | null = null
let expiryTimer: ReturnType<typeof setTimeout> | undefined
let requests = new AbortController()
const listeners = new Set<() => void>()

/** Access tokens stay in memory; reloads require a fresh login. */
export function getSession(): Session | null { return session }
export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function sessionSignal(): AbortSignal { return requests.signal }
export function setSession(next: Session | null) {
  clearTimeout(expiryTimer)
  requests.abort()
  requests = new AbortController()
  session = next
  if (next) expiryTimer = setTimeout(() => setSession(null), Math.max(0, next.expiresAt - Date.now()))
  listeners.forEach((listener) => listener())
}
