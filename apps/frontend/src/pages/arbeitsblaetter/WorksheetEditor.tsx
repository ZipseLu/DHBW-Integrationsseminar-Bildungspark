import { useEffect, useState, type ReactNode } from 'react'
import { fetchArbeitsblatt, updateArbeitsblatt, type Arbeitsblatt, type GespeichertesArbeitsblattMitInhalt } from '@/lib/api'
import { LIMITS, bereinige, istGeaendert, pruefeEntwurf } from '@/lib/arbeitsblattBearbeiten'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'
import { TaskOptionsEditor } from './TaskOptionsEditor'

type Props = {
  backendId: string
  autor: string
  /** Called with the new version after a successful save */
  onSaved: (blatt: GespeichertesArbeitsblattMitInhalt) => void
  /** Reports unsaved changes, so the panel can warn before closing */
  onDirtyChange?: (dirty: boolean) => void
}

type Zustand =
  | { art: 'laden' }
  | { art: 'fehler'; text: string }
  | { art: 'bereit'; original: Arbeitsblatt; entwurf: Arbeitsblatt; version: number }

const feldStil = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }
const labelKlasse = 'text-xs font-mono font-medium mb-1 block'

/**
 * FE-10: edit the content of a saved worksheet.
 * Saving sends PATCH /api/arbeitsblaetter/:id with the full worksheet; the
 * backend stores it as a new version with action "bearbeitet", author and note.
 */
export function WorksheetEditor({ backendId, autor, onSaved, onDirtyChange }: Props) {
  const [zustand, setZustand] = useState<Zustand>({ art: 'laden' })
  const [notiz, setNotiz] = useState('')
  const [fehler, setFehler] = useState<string[]>([])
  const [speichern, setSpeichern] = useState<'bereit' | 'laeuft' | 'gespeichert'>('bereit')
  const [ladeVersuch, setLadeVersuch] = useState(0)

  useEffect(() => {
    let aktiv = true
    setZustand({ art: 'laden' })
    fetchArbeitsblatt(backendId)
      .then((blatt) => aktiv && setZustand({ art: 'bereit', original: blatt.inhalt, entwurf: blatt.inhalt, version: blatt.version }))
      .catch((error: unknown) => aktiv && setZustand({ art: 'fehler', text: fehlertext(error) }))
    return () => {
      aktiv = false
    }
  }, [backendId, ladeVersuch])

  const geaendert = zustand.art === 'bereit' && istGeaendert(zustand.original, zustand.entwurf)
  useEffect(() => {
    onDirtyChange?.(geaendert)
  }, [geaendert, onDirtyChange])

  if (zustand.art === 'laden') {
    return (
      <div role="status" className="text-sm py-10 text-center" style={{ color: 'var(--muted-foreground)' }}>
        Inhalt wird geladen …
      </div>
    )
  }

  if (zustand.art === 'fehler') {
    return (
      <div role="alert" className="text-sm rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
        <span className="flex-1">Der Inhalt konnte nicht geladen werden: {zustand.text}</span>
        <button type="button" onClick={() => setLadeVersuch((n) => n + 1)} className="text-xs px-2.5 py-1.5 rounded font-medium" style={{ backgroundColor: '#7A2E00', color: '#FFFFFF' }}>
          Erneut laden
        </button>
      </div>
    )
  }

  const { entwurf } = zustand
  const aendere = (teil: Partial<Arbeitsblatt>) => {
    setSpeichern('bereit')
    setZustand({ ...zustand, entwurf: { ...entwurf, ...teil } })
  }

  async function speichere() {
    if (zustand.art !== 'bereit') return
    const probleme = pruefeEntwurf(zustand.entwurf, notiz)
    setFehler(probleme)
    if (probleme.length > 0) return
    setSpeichern('laeuft')
    try {
      const blatt = await updateArbeitsblatt(backendId, {
        worksheet: bereinige(zustand.entwurf),
        autor,
        ...(notiz.trim() ? { notiz: notiz.trim() } : {}),
      })
      setZustand({ art: 'bereit', original: blatt.inhalt, entwurf: blatt.inhalt, version: blatt.version })
      setNotiz('')
      setSpeichern('gespeichert')
      onSaved(blatt)
    } catch (error) {
      setSpeichern('bereit')
      setFehler([`Speichern fehlgeschlagen: ${fehlertext(error)}`])
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      aria-label="Arbeitsblatt bearbeiten"
      onSubmit={(event) => {
        event.preventDefault()
        void speichere()
      }}
    >
      <Feld label="Titel" id="edit-titel">
        <input id="edit-titel" value={entwurf.titel} maxLength={LIMITS.titel} onChange={(e) => aendere({ titel: e.target.value })} className="w-full px-3 py-2 rounded text-sm" style={feldStil} />
      </Feld>

      <Feld label="Einleitung" id="edit-einleitung">
        <textarea id="edit-einleitung" value={entwurf.einleitung} rows={4} maxLength={LIMITS.einleitung} onChange={(e) => aendere({ einleitung: e.target.value })} className="w-full px-3 py-2 rounded text-sm" style={feldStil} />
      </Feld>

      <fieldset className="flex flex-col gap-3">
        <legend className={labelKlasse} style={{ color: 'var(--muted-foreground)' }}>
          AUFGABEN
        </legend>
        {entwurf.aufgaben.map((aufgabe, i) => (
          <div key={i} className="rounded-lg p-3 flex flex-col gap-2" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                Aufgabe {i + 1} <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>· {aufgabe.typ}</span>
              </span>
              <button
                type="button"
                disabled={entwurf.aufgaben.length <= 1}
                onClick={() => aendere({ aufgaben: entwurf.aufgaben.filter((_, j) => j !== i) })}
                className="text-xs px-2 py-1 rounded disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--border)', color: entwurf.aufgaben.length <= 1 ? 'var(--muted-foreground)' : 'var(--foreground)' }}
                aria-label={`Aufgabe ${i + 1} entfernen`}
              >
                Entfernen
              </button>
            </div>
            <label className="sr-only" htmlFor={`edit-anweisung-${i}`}>
              Anweisung Aufgabe {i + 1}
            </label>
            <textarea
              id={`edit-anweisung-${i}`}
              value={aufgabe.anweisung}
              rows={3}
              maxLength={LIMITS.anweisung}
              onChange={(e) => aendere({ aufgaben: entwurf.aufgaben.map((a, j) => (j === i ? { ...a, anweisung: e.target.value } : a)) })}
              className="w-full px-3 py-2 rounded text-sm"
              style={feldStil}
            />
            <TaskOptionsEditor task={aufgabe} taskNumber={i + 1} onChange={(optionen) => aendere({ aufgaben: entwurf.aufgaben.map((a, j) => j === i ? { ...a, optionen } : a) })} />
            <label className="text-xs" htmlFor={`edit-loesung-${i}`} style={{ color: 'var(--muted-foreground)' }}>
              Lösung für die Anleitung (optional)
            </label>
            <input
              id={`edit-loesung-${i}`}
              value={aufgabe.loesung ?? ''}
              maxLength={LIMITS.loesung}
              onChange={(e) => aendere({ aufgaben: entwurf.aufgaben.map((a, j) => (j === i ? { ...a, loesung: e.target.value } : a)) })}
              className="w-full px-3 py-1.5 rounded text-sm"
              style={feldStil}
            />
          </div>
        ))}
      </fieldset>

      {entwurf.woerterbuch.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className={labelKlasse} style={{ color: 'var(--muted-foreground)' }}>
            WÖRTERBUCH
          </legend>
          {entwurf.woerterbuch.map((eintrag, i) => (
            <div key={i} className="grid gap-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <input
                aria-label={`Wort ${i + 1}`}
                value={eintrag.wort}
                maxLength={LIMITS.wort}
                onChange={(e) => aendere({ woerterbuch: entwurf.woerterbuch.map((x, j) => (j === i ? { ...x, wort: e.target.value } : x)) })}
                className="px-3 py-1.5 rounded text-sm"
                style={feldStil}
              />
              <input
                aria-label={`Erklärung ${i + 1}`}
                value={eintrag.erklaerung}
                maxLength={LIMITS.erklaerung}
                onChange={(e) => aendere({ woerterbuch: entwurf.woerterbuch.map((x, j) => (j === i ? { ...x, erklaerung: e.target.value } : x)) })}
                className="px-3 py-1.5 rounded text-sm"
                style={feldStil}
              />
            </div>
          ))}
        </fieldset>
      )}

      <Feld label="Hinweis für die Anleitung" id="edit-hinweis">
        <textarea id="edit-hinweis" value={entwurf.hinweisAnleiter} rows={3} maxLength={LIMITS.hinweisAnleiter} onChange={(e) => aendere({ hinweisAnleiter: e.target.value })} className="w-full px-3 py-2 rounded text-sm" style={feldStil} />
      </Feld>

      <div className="rounded-lg p-3 flex flex-col gap-2 sticky bottom-0" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
        <label htmlFor="edit-notiz" className="text-xs font-medium">
          Was hast du geändert? <span className="font-normal">(erscheint im Verlauf, hilft Vertretungen)</span>
        </label>
        <input
          id="edit-notiz"
          value={notiz}
          maxLength={LIMITS.notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder="z. B. Aufgabe 2 vereinfacht"
          className="w-full px-3 py-1.5 rounded text-sm"
          style={feldStil}
        />
        {fehler.length > 0 && (
          <ul role="alert" className="text-xs rounded px-3 py-2 list-disc pl-6" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
            {fehler.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!geaendert || speichern === 'laeuft'}
            className="px-4 py-2 rounded text-sm font-medium disabled:cursor-not-allowed"
            style={
              geaendert && speichern !== 'laeuft'
                ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                : { backgroundColor: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
            }
          >
            {speichern === 'laeuft' ? 'Wird gespeichert …' : 'Änderungen speichern'}
          </button>
          {geaendert && speichern !== 'laeuft' && (
            <button
              type="button"
              onClick={() => {
                setFehler([])
                setZustand({ ...zustand, entwurf: zustand.original })
              }}
              className="text-xs underline"
              style={{ color: 'var(--foreground)' }}
            >
              Verwerfen
            </button>
          )}
          <span role="status" className="text-xs font-mono ml-auto" style={{ color: 'var(--muted-foreground)' }}>
            {speichern === 'gespeichert' ? `✓ Gespeichert als Version ${zustand.version}` : geaendert ? 'Ungespeicherte Änderungen' : ''}
          </span>
        </div>
      </div>
    </form>
  )
}

function Feld({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={`${labelKlasse} uppercase`} style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
