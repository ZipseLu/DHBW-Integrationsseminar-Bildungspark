import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_USER } from '@/data/users'
import type { GespeichertesArbeitsblatt } from '@/lib/api'
import { worksheetAusGespeichertem } from '@/lib/gespeicherteArbeitsblaetter'
import { WorksheetCard } from '@/pages/arbeitsblaetter/WorksheetCard'
import { WorksheetDetailPanel } from '@/pages/arbeitsblaetter/WorksheetDetailPanel'

/**
 * FE-38: das seit BE-05 gelieferte `geaendertVon` erscheint in der Detailansicht
 * neben „Version n · zuletzt geändert …“ und dezent als Tooltip auf der Karte.
 * Fehlt der Name (ältere Blätter: NULL), darf kein Platzhalter auftauchen.
 */

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

function blatt(teil: Partial<GespeichertesArbeitsblatt> = {}): GespeichertesArbeitsblatt {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    titel: 'Lieferschein prüfen',
    berufsfeld: 'Lagerlogistik, Handel & Versand',
    baustein: 1,
    ausbildungsbaustein: 'Wareneingang',
    lernziel: 'Güter entladen',
    stufe: 'A',
    format: 'piktogramm',
    sprache: 'Leichte Sprache',
    status: 'entwurf',
    kiGeneriert: true,
    favorit: false,
    elternId: null,
    version: 2,
    erstelltVon: 'C. Hager',
    erstelltAm: '2026-10-28T09:00:00.000Z',
    geaendertAm: '2026-10-29T09:00:00.000Z',
    ...teil,
  }
}

/** Verlauf-Tab: der Header wird unabhängig vom Verlauf gerendert. */
function panel(teil: Partial<GespeichertesArbeitsblatt> = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => json({ eintraege: [] })))
  render(
    <WorksheetDetailPanel
      worksheet={worksheetAusGespeichertem(blatt(teil), 1)}
      tab="verlauf"
      user={CURRENT_USER}
      onTabChange={() => {}}
      onClose={() => {}}
      onAdapt={() => {}}
      onDownload={() => {}}
    />,
  )
  return screen.getByText(/Version 2 · zuletzt geändert/)
}

function karte(teil: Partial<GespeichertesArbeitsblatt> = {}) {
  const w = worksheetAusGespeichertem(blatt(teil), 1)
  render(
    <WorksheetCard
      worksheet={w}
      isFavorite={false}
      onToggleFavorite={() => {}}
      onPreview={() => {}}
      onHistory={() => {}}
      onDownload={() => {}}
      onAdapt={() => {}}
    />,
  )
  return within(screen.getByRole('article', { name: 'Lieferschein prüfen' })).getByText(w.date)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FE-38: „Zuletzt geändert von“', () => {
  it('übernimmt geaendertVon aus der API in die Kartendaten', () => {
    expect(worksheetAusGespeichertem(blatt({ geaendertVon: 'T. Neumann' }), 1).backend?.geaendertVon).toBe('T. Neumann')
    expect(worksheetAusGespeichertem(blatt({ geaendertVon: null }), 1).backend?.geaendertVon).toBeNull()
    expect(worksheetAusGespeichertem(blatt(), 1).backend?.geaendertVon).toBeUndefined()
  })

  it('zeigt den Namen in der Detailansicht hinter dem Zeitpunkt', () => {
    expect(panel({ geaendertVon: 'T. Neumann' })).toHaveTextContent(/zuletzt geändert .+ von T\. Neumann$/)
  })

  it.each([null, undefined, '', '   '])('zeigt keinen Platzhalter bei %j', (wert) => {
    const kopf = panel({ geaendertVon: wert })
    expect(kopf.textContent).not.toMatch(/zuletzt geändert .+ von /)
    expect(kopf.textContent).not.toMatch(/von (null|undefined)/)
  })

  it('zeigt den Namen dezent im Tooltip der Listekarte', () => {
    expect(karte({ geaendertVon: 'T. Neumann' })).toHaveAttribute('title', 'Zuletzt geändert von T. Neumann')
  })

  it.each([null, '   '])('kein Tooltip bei %j', (wert) => {
    expect(karte({ geaendertVon: wert })).not.toHaveAttribute('title')
  })
})
