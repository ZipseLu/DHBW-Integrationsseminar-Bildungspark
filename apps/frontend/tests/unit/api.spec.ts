import { describe, expect, it } from 'vitest'
import { arbeitsblaetterQuery, fileNameFromDisposition } from '@/lib/api'

describe('arbeitsblaetterQuery', () => {
  it('liefert ohne Filter einen leeren String', () => {
    expect(arbeitsblaetterQuery()).toBe('')
    expect(arbeitsblaetterQuery({ q: '', stufe: [] })).toBe('')
  })

  it('kodiert Listen als Kommaliste und laesst leere Werte weg', () => {
    const query = arbeitsblaetterQuery({ stufe: ['T', 'A'], format: ['piktogramm'], berufsfeld: 'Gastronomie & Hauswirtschaft', seite: 2, favorit: true, baustein: undefined })
    const params = new URLSearchParams(query)
    expect(params.get('stufe')).toBe('T,A')
    expect(params.get('format')).toBe('piktogramm')
    expect(params.get('berufsfeld')).toBe('Gastronomie & Hauswirtschaft')
    expect(params.get('seite')).toBe('2')
    expect(params.get('favorit')).toBe('true')
    expect(params.has('baustein')).toBe(false)
  })
})

describe('fileNameFromDisposition', () => {
  it('bevorzugt den UTF-8-Dateinamen', () => {
    expect(fileNameFromDisposition(`attachment; filename="G_ter.docx"; filename*=UTF-8''G%C3%BCter.docx`, 'x.docx')).toBe('Güter.docx')
  })

  it('faellt auf den Standardnamen zurueck', () => {
    expect(fileNameFromDisposition(null, 'Standard.docx')).toBe('Standard.docx')
  })
})
