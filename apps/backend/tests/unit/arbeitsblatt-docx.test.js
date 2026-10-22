import { describe, it, expect } from 'vitest'
import { arbeitsblattFileName, buildArbeitsblattDocx, DOCX_MIME } from '../../src/arbeitsblatt/docx.js'
import { WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

describe('DOCX-Export', () => {
  it('erzeugt eine Word-Datei (ZIP, Magic Bytes "PK")', async () => {
    const buffer = await buildArbeitsblattDocx({ ...WORKSHEET_T_TEXT, baustein: 1, ausbildungsbaustein: 'Wareneingang' })
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.subarray(0, 2).toString()).toBe('PK')
    expect(buffer.length).toBeGreaterThan(2000)
  })

  it('verarbeitet alle Aufgabentypen und Piktogramme', async () => {
    const aufgaben = ['offen', 'reihenfolge', 'zuordnen', 'ankreuzen', 'malen', 'praxis'].map((typ, i) => ({
      nr: i + 1,
      typ,
      anweisung: 'Anweisung.',
      optionen: ['Links | Rechts', 'Oben | Unten'],
      piktogramm: 'denken',
    }))
    const buffer = await buildArbeitsblattDocx({ ...WORKSHEET_T_TEXT, format: 'piktogramm', aufgaben, hinweisAnleiter: '' })
    expect(buffer.subarray(0, 2).toString()).toBe('PK')
  })

  it('hat den richtigen MIME-Typ', () => {
    expect(DOCX_MIME).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })

  it('bildet einen Windows-sicheren Dateinamen mit Stufe und Format', () => {
    const name = arbeitsblattFileName({ ...WORKSHEET_T_TEXT, berufsfeld: 'Gastronomie & Hauswirtschaft', baustein: 5, titel: 'Hygiene: Hände/Arme?' })
    expect(name).toBe('Gastronomie_und_Hauswirtschaft_BS5_Hygiene_HändeArme_T-text.docx')
    expect(arbeitsblattFileName(WORKSHEET_T_TEXT)).toBe('Lagerlogistik,_Handel_und_Versand_Der_LKW_ist_da_T-text.docx')
  })
})
