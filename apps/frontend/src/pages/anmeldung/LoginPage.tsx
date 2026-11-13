import { useEffect, useRef, useState, type FormEvent } from 'react'
import { login } from '@/lib/auth'
import { ApiError } from '@/lib/api'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    document.title = 'Anmelden – Arbeitsblattverwaltung'
    return () => request.current?.abort()
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    const controller = new AbortController()
    request.current = controller
    try { await login(email, password, controller.signal) }
    catch (cause) {
      if (controller.signal.aborted) return
      setError(cause instanceof ApiError && cause.status === 401 ? 'E-Mail oder Passwort falsch.' :
        cause instanceof ApiError && [404, 501].includes(cause.status) ? 'Die Anmeldung ist noch nicht verfügbar. Bitte wenden Sie sich an die Administration.' :
        'Die Anmeldung ist gerade nicht möglich. Bitte versuchen Sie es erneut.')
    } finally {
      if (!controller.signal.aborted) { setBusy(false); setPassword('') }
    }
  }
  const fieldStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }
  return (
    <main className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <section className="w-full max-w-md p-6 sm:p-8 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-labelledby="login-title">
        <p className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>Bildungspark Heilbronn-Franken</p>
        <h1 id="login-title" className="font-display text-2xl font-semibold">Arbeitsblattverwaltung</h1>
        <p className="text-sm mt-3 mb-6">Melden Sie sich mit Ihrem Mitarbeiterkonto an.</p>
        <form onSubmit={submit} className="flex flex-col gap-4" aria-label="Anmeldung" aria-busy={busy}>
          <label className="text-sm flex flex-col gap-2">E-Mail
            <input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} className="w-full rounded px-3 py-3" style={fieldStyle} />
          </label>
          <label className="text-sm flex flex-col gap-2">Passwort
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} className="w-full rounded px-3 py-3" style={fieldStyle} />
          </label>
          {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button type="submit" disabled={busy} className="rounded px-4 py-3 text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>{busy ? 'Wird angemeldet …' : 'Anmelden'}</button>
        </form>
      </section>
    </main>
  )
}
