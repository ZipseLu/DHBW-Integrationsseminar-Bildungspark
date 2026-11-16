import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { formatOption } from '@/data/constants'
import { fetchArbeitsblaetter, type GespeichertesArbeitsblatt } from '@/lib/api'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'
import type { KiVorauswahl } from '@/lib/lehrplaene'
import { activeStation } from '@/lib/participants'
import type { Participant } from '@/types'

type Props = {
  participant: Participant
  /** IDs of worksheets that are already assigned to this person */
  zugeordnet: ReadonlySet<string>
  /** Returns an error message or null */
  onZuordnen: (blatt: GespeichertesArbeitsblatt) => Promise<string | null>
  onClose: () => void
  /** FE-33: opens the KI-Erstellung with Berufsfeld, level and format of the person */
  onErstellen?: (vorauswahl: KiVorauswahl) => void
}

type Zustand = { art: 'laden' } | { art: 'fehler'; text: string } | { art: 'bereit'; blaetter: GespeichertesArbeitsblatt[] }

/**
 * FE-11/FE-33: dialog "Arbeitsblatt zuweisen" with the saved worksheets that fit the
 * active station of the person – same Berufsfeld, level and format
 * (GET /api/arbeitsblaetter?berufsfeld=…&stufe=…&format=…).
 * "Auch andere Stufen und Formate zeigen" loads the whole Berufsfeld for exceptions
 * (matching ones first).
 */
export function ZuordnenModal({ participant, zugeordnet, onZuordnen, onClose, onErstellen }: Props) {
  const active = activeStation(participant)
  const [alleZeigen, setAlleZeigen] = useState(false)
  const [zustand, setZustand] = useState<Zustand>({ art: 'laden' })
  const [auswahl, setAuswahl] = useState<string | null>(null)
  const [fehler, setFehler] = useState('')
  const [speichert, setSpeichert] = useState(false)

  useEffect(() => {
    let aktiv = true
    setZustand({ art: 'laden' })
    setAuswahl(null)
    const stufe = active?.level
    const format = active?.format
    // Without an active station there is nothing to match, so the whole list is shown
    const nurPassende = Boolean(active) && !alleZeigen
    fetchArbeitsblaetter({
      berufsfeld: active?.berufsbild,
      stufe: nurPassende && stufe ? [stufe] : undefined,
      format: nurPassende && format ? [format] : undefined,
      proSeite: 100,
    })
      .then((seite) => {
        if (!aktiv) return
        // Matching level and format first, then the rest; archived ones are not offered by the backend
        const passt = (b: GespeichertesArbeitsblatt) => Number(b.stufe === stufe) + Number(b.format === format)
        const blaetter = [...seite.eintraege].sort((a, b) => passt(b) - passt(a))
        setZustand({ art: 'bereit', blaetter })
      })
      .catch((error: unknown) => aktiv && setZustand({ art: 'fehler', text: fehlertext(error) }))
    return () => {
      aktiv = false
    }
  }, [active?.berufsbild, active?.level, active?.format, alleZeigen])

  const formatName = active ? (formatOption(active.format)?.label ?? active.format) : ''

  const kandidaten = zustand.art === 'bereit' ? zustand.blaetter : []
  const gewaehlt = kandidaten.find((b) => b.id === auswahl) ?? null

  async function zuweisen() {
    if (!gewaehlt) return
    setSpeichert(true)
    const meldung = await onZuordnen(gewaehlt)
    setSpeichert(false)
    if (meldung) setFehler(meldung)
  }

  return (
    <Modal
      title="Arbeitsblatt zuweisen"
      subtitle={`${participant.id} · ${active ? `${active.berufsbild} · Stufe ${active.level} · ${formatName}` : 'Alle Berufsfelder'}`}
      onClose={onClose}
    >
      {active && (
        <label className="mx-4 mt-3 flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--muted-foreground)' }}>
          <input type="checkbox" checked={alleZeigen} onChange={(e) => setAlleZeigen(e.target.checked)} />
          Auch andere Stufen und Formate zeigen
        </label>
      )}
      <div className="flex flex-col gap-1 p-4 overflow-y-auto" role="listbox" aria-label="Gespeicherte Arbeitsblätter">
        {zustand.art === 'laden' && (
          <div role="status" className="text-sm text-center py-8" style={{ color: 'var(--muted-foreground)' }}>
            Arbeitsblätter werden geladen …
          </div>
        )}
        {zustand.art === 'fehler' && (
          <div role="alert" className="text-sm rounded px-3 py-2" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
            Arbeitsblätter konnten nicht geladen werden: {zustand.text}
          </div>
        )}
        {zustand.art === 'bereit' && kandidaten.length === 0 && (
          <div className="text-sm text-center py-6 flex flex-col items-center gap-3" style={{ color: 'var(--muted-foreground)' }}>
            <span>
              {active && !alleZeigen
                ? `Für Stufe ${active.level} · ${formatName} gibt es in „${active.berufsbild}“ noch kein Arbeitsblatt.`
                : 'Für dieses Berufsfeld ist noch kein Arbeitsblatt gespeichert.'}
            </span>
            {active && onErstellen && (
              <button
                type="button"
                onClick={() => onErstellen({ berufsfeld: active.berufsbild, stufe: active.level, format: active.format })}
                className="px-3 py-2 rounded text-sm font-medium hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                ✦ In der KI-Erstellung erstellen
              </button>
            )}
          </div>
        )}
        {kandidaten.map((b) => {
          const schon = zugeordnet.has(b.id)
          const isSelected = auswahl === b.id
          return (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-disabled={schon}
              disabled={schon}
              onClick={() => setAuswahl(isSelected ? null : b.id)}
              className="flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)', backgroundColor: isSelected ? 'var(--muted)' : 'transparent' }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{b.titel}</div>
                <div className="text-xs font-mono mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
                  <span>Stufe {b.stufe}</span>
                  <span>·</span>
                  <span>{formatOption(b.format)?.label ?? b.format}</span>
                  {b.baustein !== null && <span>· BS {b.baustein}</span>}
                  <span>· {b.status === 'freigegeben' ? 'freigegeben' : 'Entwurf'}</span>
                  {schon && <span>· schon zugeordnet</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {fehler && (
        <div role="alert" className="mx-4 mb-2 text-sm rounded px-3 py-2" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
          {fehler}
        </div>
      )}
      <div className="px-4 py-4 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          disabled={!gewaehlt || speichert}
          onClick={() => void zuweisen()}
          className="flex-1 py-2.5 rounded font-medium text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          {speichert ? 'Wird zugewiesen …' : 'Zuweisen'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded text-sm hover:opacity-70" style={{ border: '1px solid var(--border)' }}>
          Abbrechen
        </button>
      </div>
    </Modal>
  )
}
