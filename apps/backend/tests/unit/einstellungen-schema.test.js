import { describe, it, expect } from 'vitest'
import { EinstellungenSchema } from '../../src/einstellungen/schema.js'

/** FE-20 / FE-42: validation of the per-account settings (without MySQL) */
describe('EinstellungenSchema', () => {
  it('nimmt die Vorgaben für die KI-Erstellung und die Schriftgröße an (FE-42)', () => {
    const werte = { kiStufen: ['T', 'A'], kiFormate: ['piktogramm'], kiSprache: 'Standardsprache', schriftgroesse: 'sehr-gross' }
    expect(EinstellungenSchema.parse(werte)).toEqual(werte)
  })

  it('lehnt unbekannte Stufen, Formate, Sprachen und Schriftgrößen ab', () => {
    for (const falsch of [{ kiStufen: ['X'] }, { kiStufen: [] }, { kiFormate: ['comic'] }, { kiSprache: 'Englisch' }, { schriftgroesse: 'riesig' }]) {
      expect(EinstellungenSchema.safeParse(falsch).success, JSON.stringify(falsch)).toBe(false)
    }
  })

  it('lehnt weiterhin unbekannte Felder ab', () => {
    expect(EinstellungenSchema.safeParse({ darkmode: true }).success).toBe(false)
  })
})
