import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { TaskOptionsEditor } from '@/pages/arbeitsblaetter/TaskOptionsEditor'
import { bereinige, istGeaendert, pruefeEntwurf } from '@/lib/arbeitsblattBearbeiten'
import type { Arbeitsblatt, Aufgabe } from '@/lib/api'

afterEach(cleanup)
function Editor({ task }: { task: Aufgabe }) {
  const [options, setOptions] = useState(task.optionen ?? [])
  return <><TaskOptionsEditor task={{ ...task, optionen: options }} taskNumber={1} onChange={setOptions} /><output data-testid="options">{JSON.stringify(options)}</output></>
}
const sheet = (task: Aufgabe): Arbeitsblatt => ({ titel: 'Holz', berufsfeld: 'Metall', stufe: 'T', format: 'text', sprache: 'Leichte Sprache', lernziel: 'Werkzeug', einleitung: 'Übung.', aufgaben: [task], woerterbuch: [], hinweisAnleiter: '' })
describe('FE-26 Antwortmöglichkeiten', () => {
  it('ändert, ergänzt und entfernt Ankreuzoptionen', () => {
    render(<Editor task={{ nr: 1, typ: 'ankreuzen', anweisung: 'Kreuze an.', optionen: ['Alt'] }} />)
    fireEvent.change(screen.getByLabelText('Aufgabe 1 Option 1'), { target: { value: 'Neu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Option hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Aufgabe 1 Option 2'), { target: { value: 'Zwei' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aufgabe 1 Option 1 entfernen' }))
    expect(screen.getByTestId('options')).toHaveTextContent('["Zwei"]')
  })
  it('bearbeitet Zuordnungen in zwei Feldern und erhält das API-Format', () => {
    render(<Editor task={{ nr: 1, typ: 'zuordnen', anweisung: 'Verbinde.', optionen: ['Hammer | Nagel'] }} />)
    fireEvent.change(screen.getByLabelText('Aufgabe 1 Paar 1 links'), { target: { value: 'Säge' } })
    fireEvent.change(screen.getByLabelText('Aufgabe 1 Paar 1 rechts'), { target: { value: 'Holz' } })
    expect(screen.getByTestId('options')).toHaveTextContent('["Säge|Holz"]')
  })
  it('verschiebt Reihenfolge-Schritte', () => {
    render(<Editor task={{ nr: 1, typ: 'reihenfolge', anweisung: 'Sortiere.', optionen: ['A', 'B'] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Schritt 2 nach oben' }))
    expect(screen.getByTestId('options')).toHaveTextContent('["B","A"]')
  })
  it('prüft unvollständige Paare, leere und zu lange Optionen vor dem Speichern', () => {
    const task: Aufgabe = { nr: 1, typ: 'zuordnen', anweisung: 'Verbinde.', optionen: ['Links|'] }
    expect(pruefeEntwurf(sheet(task)).join(' ')).toContain('linke und rechte Seite')
    expect(pruefeEntwurf(sheet({ ...task, typ: 'ankreuzen', optionen: [''] })).join(' ')).toContain('darf nicht leer')
    expect(pruefeEntwurf(sheet({ ...task, optionen: ['x'.repeat(201)] })).join(' ')).toContain('200 Zeichen')
    const original = sheet({ ...task, optionen: ['A | B'] })
    const changed = sheet({ ...task, optionen: ['C|D'] })
    expect(istGeaendert(original, changed)).toBe(true)
    expect(bereinige(changed).aufgaben[0].optionen).toEqual(['C | D'])
  })
})
