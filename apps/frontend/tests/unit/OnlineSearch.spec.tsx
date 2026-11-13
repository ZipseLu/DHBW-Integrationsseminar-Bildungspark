import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchOnline, safeMaterialUrl } from '@/lib/onlineSearch'
import { WebSearchSection } from '@/pages/ki-erstellung/WebSearchSection'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('FE-14 Online-Suche', () => {
  it.each([
    [503, 'suche_nicht_konfiguriert', 'Die Online-Suche ist nicht eingerichtet.'],
    [429, 'zu_viele_suchanfragen', 'Zu viele Suchanfragen. Bitte später erneut versuchen.'],
    [504, 'suchanbieter_timeout', 'Die Suchmaschine hat nicht rechtzeitig geantwortet.'],
  ])('zeigt die genaue Backend-Meldung bei HTTP %s', async (status, code, message) => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'search_error', code, message }, status as number)))
    render(<WebSearchSection thema="Holz" />)
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message as string)
  })
  it('kodiert Suchbegriffe und filtert unsichere oder doppelte Links', async () => {
    const fetchMock = vi.fn(async (_url: string) => json({ results: [
      { title: 'Holz', url: 'https://example.test/holz', source: 'Erfundene Quelle' },
      { title: 'Doppelt', url: 'https://example.test/holz' },
      { title: 'Unsicher', url: 'javascript:alert(1)' },
    ] }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchOnline('Holz & Metall')).toEqual([{ title: 'Holz', url: 'https://example.test/holz', source: 'example.test', snippet: '' }])
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/suche?q=Holz+%26+Metall')
    expect(safeMaterialUrl('https://user:pass@example.test')).toBeNull()
  })
  it('zeigt fehlende Schnittstellen und ermöglicht einen erneuten Versuch', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    render(<WebSearchSection thema="Holz" />)
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('noch nicht verfügbar')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut suchen' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Keine Treffer'))
  })
  it('zeigt Titel, Quelle und Ziel und übernimmt ein Thema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ results: [{ title: 'Holz bearbeiten', url: 'https://example.test/holz', snippet: 'Übung' }] })))
    const useTopic = vi.fn()
    render(<WebSearchSection thema="Holz" onUseTopic={useTopic} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))
    expect(await screen.findByRole('link', { name: 'Holz bearbeiten' })).toHaveAttribute('href', 'https://example.test/holz')
    expect(screen.getByText('example.test')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Als Thema übernehmen' }))
    expect(useTopic).toHaveBeenCalledWith('Holz bearbeiten')
  })
  it('verwirft Antworten einer überholten Suche', async () => {
    let resolveFirst!: (r: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve })).mockResolvedValueOnce(json({ results: [{ title: 'Neu', url: 'https://example.test/neu' }] })))
    render(<WebSearchSection thema="Alt" />)
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))
    fireEvent.change(screen.getByLabelText('Suchbegriff für die Internetsuche'), { target: { value: 'Neu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))
    expect(await screen.findByRole('link', { name: 'Neu' })).toBeInTheDocument()
    resolveFirst(json({ results: [{ title: 'Alt', url: 'https://example.test/alt' }] }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Alt' })).not.toBeInTheDocument())
  })
})
