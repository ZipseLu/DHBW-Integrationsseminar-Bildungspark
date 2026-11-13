import { fireEvent, render, screen, within, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalisiereKennung, pruefeProfil, buildStations, type StationDraft } from '@/lib/participants'
import { ParticipantModal } from '@/pages/teilnehmende/ParticipantModal'
import { BERUFSBILD_LAGER, BERUFSBILD_METALL } from '@/data/constants'

afterEach(cleanup)
const drafts: StationDraft[] = [{ berufsbild: BERUFSBILD_LAGER, level: 'T', format: 'text' }, { berufsbild: BERUFSBILD_METALL, level: 'B', format: 'piktogramm' }]
describe('Anonymisierte Profile und Niveaus', () => {
  it('verlangt eine pseudonyme Kennung und verhindert doppelte Berufsbereiche', () => {
    expect(pruefeProfil('', drafts)).toContain('IW3-Nummer')
    expect(pruefeProfil('Adi Mustajbegovic', drafts)).toContain('Keine Namen')
    expect(normalisiereKennung(' iw3-1234 ')).toBe('IW3-1234')
    expect(pruefeProfil('iw3-1234', drafts)).toBeNull()
    expect(pruefeProfil('IW3-1234', [drafts[0], drafts[0]])).toContain('nur einmal')
  })
  it('hält unterschiedliche Niveaus und Formate je Berufsbereich im Profil', () => {
    const stations = buildStations(drafts, [], '2026-11-13')
    expect(stations.map((s) => [s.berufsbild, s.level, s.format])).toEqual(drafts.map((s) => [s.berufsbild, s.level, s.format]))
    const edited = buildStations([{ ...drafts[0], level: 'A' }, drafts[1]], stations, '2026-11-14')
    expect(edited[0].level).toBe('A')
    expect(edited[1].level).toBe('B')
  })
  it('kennzeichnet das Kennungsfeld als Pflichtfeld', () => {
    const save = vi.fn(() => null)
    render(<ParticipantModal editing={null} defaultBerufsbild={BERUFSBILD_LAGER} onSave={save} onClose={() => {}} />)
    const input = within(screen.getByRole('dialog')).getByLabelText(/ANONYME KENNUNG/)
    expect(input).toBeRequired()
    fireEvent.change(input, { target: { value: 'IW3-3333' } })
    fireEvent.click(screen.getByRole('button', { name: 'Teilnehmer anlegen' }))
    expect(save).toHaveBeenCalledWith('IW3-3333', expect.any(Array))
  })
})
