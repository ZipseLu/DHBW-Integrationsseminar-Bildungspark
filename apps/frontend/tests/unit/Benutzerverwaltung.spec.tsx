import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_USER, STAFF_USERS } from '@/data/users'
import { ApiError } from '@/lib/api'
import { benutzerFehlertext, staffUserAusKonto, type Konto } from '@/lib/benutzer'
import { BenutzerverwaltungPage } from '@/pages/benutzerverwaltung/BenutzerverwaltungPage'
import type { StaffUser } from '@/types'

/**
 * FE-09: staff accounts from GET/POST/PATCH/DELETE /api/benutzer.
 * fetch is mocked; answers follow apps/backend/src/routes/benutzer.js.
 */

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const konto = (teil: Partial<Konto> = {}): Konto => ({
  id: '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90',
  name: 'T. Neumann',
  email: 't.neumann@bildungspark.example',
  rolle: 'dozent',
  erstelltAm: '2026-11-03T09:30:00.000Z',
  ...teil,
})

const ICH = konto({ id: '11111111-1111-4111-8111-111111111111', name: 'Celine Hager', email: 'c.hager@bildungspark.example', rolle: 'admin' })

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

function backend(liste: Konto[], weitere: Handler = () => json({}, 500)) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
    (init?.method ?? 'GET') === 'GET' && url === '/api/benutzer' ? json({ eintraege: liste, gesamt: liste.length }) : weitere(url, init),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(beispiel: StaffUser[] = [...STAFF_USERS], onChange = vi.fn()) {
  render(<BenutzerverwaltungPage currentUser={CURRENT_USER} users={beispiel} onChange={onChange} />)
  return onChange
}

const aufrufe = (fetchMock: ReturnType<typeof vi.fn>, method: string) =>
  fetchMock.mock.calls.filter(([, init]) => ((init as RequestInit | undefined)?.method ?? 'GET') === method)

function dialogAusfuellen(felder: { name?: string; email?: string; passwort?: string }) {
  const dialog = screen.getByRole('dialog')
  if (felder.name !== undefined) fireEvent.change(within(dialog).getByLabelText('NAME *'), { target: { value: felder.name } })
  if (felder.email !== undefined) fireEvent.change(within(dialog).getByLabelText('E-MAIL-ADRESSE *'), { target: { value: felder.email } })
  if (felder.passwort !== undefined) fireEvent.change(within(dialog).getByLabelText(/PASSWORT/), { target: { value: felder.passwort } })
  return dialog
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Benutzerverwaltung mit Backend (FE-09)', () => {
  it('zeigt die Konten aus dem Backend und erkennt das eigene Konto an der E-Mail', async () => {
    backend([ICH, konto()])
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Konten werden geladen')
    expect(await screen.findByText('2 Konten · nur für Administratoren sichtbar')).toBeInTheDocument()
    expect(screen.getAllByText('seit 2026-11-03')).toHaveLength(2)
    expect(screen.getByText('ich')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Konto von Celine Hager löschen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Konto von T. Neumann löschen' })).toBeInTheDocument()
    // Sample accounts are not shown
    expect(screen.queryByText('A. Mustajbegovic')).not.toBeInTheDocument()
  })

  it('legt ein Konto per POST an', async () => {
    const fetchMock = backend([ICH], (_url, init) => json({ benutzer: konto({ id: 'neu-1', name: 'Max Beispiel', email: 'm.beispiel@bildungspark.example', rolle: 'assistent' }) }, init?.method === 'POST' ? 201 : 500))
    renderPage()
    await screen.findByText('1 Konten · nur für Administratoren sichtbar')

    fireEvent.click(screen.getByRole('button', { name: '+ Mitarbeiter anlegen' }))
    const dialog = dialogAusfuellen({ name: 'Max Beispiel', email: 'M.Beispiel@bildungspark.example', passwort: 'langespasswort' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assistent/in' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konto anlegen' }))

    expect(await screen.findByText('Max Beispiel')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [[url, init]] = aufrufe(fetchMock, 'POST')
    expect(url).toBe('/api/benutzer')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ name: 'Max Beispiel', email: 'm.beispiel@bildungspark.example', rolle: 'assistent', passwort: 'langespasswort' })
  })

  it('zeigt die Meldung des Backends, z. B. bei vergebener E-Mail', async () => {
    backend([ICH], () => json({ error: 'conflict', code: 'email_vergeben', message: 'Die E-Mail-Adresse x@bildungspark.example ist schon vergeben' }, 409))
    renderPage()
    await screen.findByText('1 Konten · nur für Administratoren sichtbar')

    fireEvent.click(screen.getByRole('button', { name: '+ Mitarbeiter anlegen' }))
    const dialog = dialogAusfuellen({ name: 'X', email: 'x@bildungspark.example', passwort: 'langespasswort' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Konto anlegen' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Die E-Mail-Adresse x@bildungspark.example ist schon vergeben.')
    expect(within(dialog).getByRole('button', { name: 'Konto anlegen' })).toBeEnabled()
  })

  it('schickt beim Bearbeiten nur geänderte Felder per PATCH', async () => {
    const fetchMock = backend([ICH, konto()], (_url, init) => json({ benutzer: konto({ rolle: 'admin' }) }, init?.method === 'PATCH' ? 200 : 500))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Konto von T. Neumann bearbeiten' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('NAME *')).toHaveValue('T. Neumann')
    expect(within(dialog).getByLabelText('NEUES PASSWORT')).toHaveValue('')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Administrator' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Änderungen speichern' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [[url, init]] = aufrufe(fetchMock, 'PATCH')
    expect(url).toBe(`/api/benutzer/${konto().id}`)
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ rolle: 'admin' })
  })

  it('setzt ein neues Passwort nur, wenn eines eingegeben wurde', async () => {
    const fetchMock = backend([ICH, konto()], () => json({ benutzer: konto() }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Konto von T. Neumann bearbeiten' }))
    let dialog = dialogAusfuellen({ passwort: 'kurz' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Änderungen speichern' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('mindestens 8 Zeichen')

    dialog = dialogAusfuellen({ passwort: 'neues-passwort' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Änderungen speichern' }))
    await waitFor(() => expect(aufrufe(fetchMock, 'PATCH')).toHaveLength(1))
    expect(JSON.parse(String((aufrufe(fetchMock, 'PATCH')[0][1] as RequestInit).body))).toEqual({ passwort: 'neues-passwort' })
  })

  it('schließt den Dialog ohne Anfrage, wenn nichts geändert wurde', async () => {
    const fetchMock = backend([ICH, konto()])
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Konto von T. Neumann bearbeiten' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Änderungen speichern' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(aufrufe(fetchMock, 'PATCH')).toHaveLength(0)
  })

  it('löscht per DELETE und zeigt Regeln des Backends (letzter Admin)', async () => {
    let antwort = json({ error: 'conflict', code: 'letzter_admin', message: 'Das letzte Admin-Konto kann nicht entfernt oder herabgestuft werden' }, 409)
    const fetchMock = backend([ICH, konto()], () => antwort)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Konto von T. Neumann löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Das letzte Admin-Konto kann nicht entfernt oder herabgestuft werden.')
    expect(screen.getByText('T. Neumann')).toBeInTheDocument()

    antwort = new Response(null, { status: 204 })
    fireEvent.click(screen.getByRole('button', { name: 'Konto von T. Neumann löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }))
    await waitFor(() => expect(screen.queryByText('T. Neumann')).not.toBeInTheDocument())
    expect(aufrufe(fetchMock, 'DELETE').map(([url]) => url)).toEqual([`/api/benutzer/${konto().id}`, `/api/benutzer/${konto().id}`])
  })

  it('zeigt ohne Backend die Beispielkonten mit Hinweis, ändert lokal und lädt auf Knopfdruck neu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: 'db_unavailable', message: 'Die Datenbank ist nicht verfügbar.' }, 503))
      .mockResolvedValueOnce(json({ eintraege: [ICH], gesamt: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const onChange = renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Konten konnten nicht geladen werden')
    expect(screen.getByText(`${STAFF_USERS.length} Konten · nur für Administratoren sichtbar`)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Konto von T. Neumann löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(STAFF_USERS.filter((u) => u.name !== 'T. Neumann')))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }))
    expect(await screen.findByText('1 Konten · nur für Administratoren sichtbar')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Benutzerverwaltung (Hilfsfunktionen)', () => {
  it('übersetzt ein Konto in einen StaffUser', () => {
    expect(staffUserAusKonto(konto())).toEqual({
      id: konto().id,
      name: 'T. Neumann',
      initials: 'TN',
      role: 'dozent',
      email: 't.neumann@bildungspark.example',
      createdAt: '2026-11-03',
    })
  })

  it('formuliert Fehlermeldungen', () => {
    expect(benutzerFehlertext(new ApiError('verboten', 403, 'forbidden'))).toBe('Nur Administratoren dürfen Konten verwalten.')
    expect(benutzerFehlertext(new ApiError('Das Konto kann nicht angelegt werden: name: muss mindestens 2 Zeichen haben', 400, 'validation_error'))).toBe(
      'Das Konto kann nicht angelegt werden: name: muss mindestens 2 Zeichen haben',
    )
    expect(benutzerFehlertext(new ApiError('Die Datenbank ist nicht verfügbar.', 503, 'db_unavailable'))).toBe('Nicht gespeichert: Die Datenbank ist nicht verfügbar.')
    expect(benutzerFehlertext(new Error('x'))).toBe('Nicht gespeichert: unbekannter Fehler.')
  })
})
