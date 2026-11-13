import { fireEvent, render, screen, within, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { AuthenticatedApp } from '@/App'
import { apiFetch } from '@/lib/api'
import { login } from '@/lib/auth'
import { getSession, setSession } from '@/lib/session'
import type { StaffRole, StaffUser } from '@/types'

const user: StaffUser = { id: 'adi', name: 'Adi Mustajbegovic', email: 'adi@example.test', initials: 'AM', role: 'dozent' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const response = (role: StaffRole = 'dozent') => ({ token: 'test-token', expiresIn: 300, user: { ...user, role } })
beforeEach(() => { setSession(null); localStorage.clear(); sessionStorage.clear() })
afterEach(() => { cleanup(); setSession(null); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('FE-08 Anmeldung', () => {
  it('zeigt ohne Sitzung ausschließlich die Login-Maske', () => {
    render(<App />)
    expect(screen.getByLabelText('E-Mail')).toHaveAttribute('type', 'email')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
  it('meldet falsche Daten verständlich und löscht das Passwort', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'invalid_credentials' }, 401)))
    render(<App />)
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'falsch' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Anmeldung' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-Mail oder Passwort falsch')
    expect(screen.getByLabelText('Passwort')).toHaveValue('')
  })
  it('öffnet nach Login das Dashboard und beendet die Sitzung beim Logout', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).endsWith('/auth/login') ? json(response()) : json({ eintraege: [], lernziele: [] })))
    render(<App />)
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'test' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Anmeldung' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Übersicht' })).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))
    expect(screen.getByRole('button', { name: 'Anmelden' })).toBeInTheDocument()
    expect(getSession()).toBeNull()
  })
  it.each<StaffRole>(['admin', 'dozent', 'assistent'])('zeigt die Benutzerverwaltung nur für Admins (%s)', (role) => {
    render(<AuthenticatedApp user={{ ...user, role }} onLogout={() => {}} />)
    const nav = screen.getByRole('navigation')
    expect(!!within(nav).queryByRole('button', { name: /Benutzerverwaltung/ })).toBe(role === 'admin')
  })
  it('sendet den Token und behält vorhandene Header; 401 meldet ab', async () => {
    setSession({ token: 'abc', user, expiresAt: Date.now() + 300_000 })
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({}, 401))
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiFetch('/api/test', { headers: { 'Content-Type': 'application/json' } })).rejects.toMatchObject({ status: 401 })
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.get('Authorization')).toBe('Bearer abc')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(getSession()).toBeNull()
  })
  it('lehnt ungültige Rollen ab', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...response(), user: { ...user, role: 'root' } })))
    await expect(login(user.email, 'test')).rejects.toMatchObject({ code: 'invalid_auth_response' })
    expect(getSession()).toBeNull()
  })
  it('beendet abgelaufene Sitzungen', () => {
    vi.useFakeTimers()
    setSession({ token: 'abc', user, expiresAt: Date.now() + 1000 })
    vi.advanceTimersByTime(1001)
    expect(getSession()).toBeNull()
  })
})
