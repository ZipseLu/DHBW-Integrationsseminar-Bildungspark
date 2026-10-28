import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { ErrorNote, fieldLabelClass, inputStyle } from '@/components/Widgets'
import { BERUFSBILDER, FORMAT_OPTIONS, LEVELS, LEVEL_STYLES, PERSONA_MAP, formatOption } from '@/data/constants'
import { moveItem, type StationDraft } from '@/lib/participants'
import type { Format, Participant } from '@/types'

type Props = {
  /** null = neue Person anlegen */
  editing: Participant | null
  defaultBerufsbild: string
  /** Gibt eine Fehlermeldung zurueck oder null, wenn gespeichert wurde */
  onSave: (id: string, stations: StationDraft[]) => string | null
  onClose: () => void
}

const smallButton = 'w-6 h-6 rounded flex items-center justify-center text-xs disabled:opacity-20 hover:opacity-60 transition-opacity'

/** Dialog "Teilnehmer hinzufügen / bearbeiten" mit Lernweg aus mehreren Berufsfeldern */
export function ParticipantModal({ editing, defaultBerufsbild, onSave, onClose }: Props) {
  const emptyStation: StationDraft = { berufsbild: defaultBerufsbild, level: 'T', format: 'text' }
  const [id, setId] = useState(editing?.id ?? '')
  const [error, setError] = useState('')
  const [stations, setStations] = useState<StationDraft[]>(
    editing ? editing.berufsbilder.map((b) => ({ berufsbild: b.berufsbild, level: b.level, format: b.format })) : [emptyStation],
  )

  const update = (index: number, patch: Partial<StationDraft>) => setStations((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(onSave(id.trim(), stations) ?? '')
  }

  return (
    <Modal title={editing ? 'Teilnehmer bearbeiten' : 'Neuen Teilnehmer hinzufügen'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5 overflow-y-auto">
        <div>
          <label htmlFor="tn-kennung" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
            ANONYME KENNUNG <span className="opacity-60">(optional)</span>
          </label>
          <input
            id="tn-kennung"
            type="text"
            placeholder="z.B. IW3-0001 oder leer lassen"
            value={id}
            onChange={(e) => {
              setId(e.target.value)
              setError('')
            }}
            className="w-full px-3 py-2.5 rounded text-sm outline-none font-mono"
            style={inputStyle}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--muted-foreground)' }}>
              BERUFSBEREICHE <span className="opacity-60">(Reihenfolge = Lernweg)</span>
            </span>
            <button
              type="button"
              onClick={() => setStations((prev) => [...prev, emptyStation])}
              className="text-xs px-2.5 py-1 rounded font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              + Bereich hinzufügen
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {stations.map((station, i) => {
              const s = LEVEL_STYLES[station.level]
              return (
                <div key={i} className="rounded-lg p-3 flex flex-col gap-3" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: s.bg, color: s.text, fontSize: 10 }}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-mono font-medium flex-1">{i === 0 ? 'Erster Bereich (startet aktiv)' : `Bereich ${i + 1} (ausstehend)`}</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: s.bg, color: s.text }}>
                      Persona {PERSONA_MAP[station.level][station.format]}
                    </span>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        aria-label={`Bereich ${i + 1} nach oben`}
                        onClick={() => setStations((prev) => moveItem(prev, i, -1))}
                        disabled={i === 0}
                        className={smallButton}
                        style={{ border: '1px solid var(--border)' }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Bereich ${i + 1} nach unten`}
                        onClick={() => setStations((prev) => moveItem(prev, i, 1))}
                        disabled={i === stations.length - 1}
                        className={smallButton}
                        style={{ border: '1px solid var(--border)' }}
                      >
                        ↓
                      </button>
                    </div>
                    {stations.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Bereich ${i + 1} entfernen`}
                        onClick={() => setStations((prev) => prev.filter((_, idx) => idx !== i))}
                        className={smallButton}
                        style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    aria-label={`Berufsfeld Bereich ${i + 1}`}
                    value={station.berufsbild}
                    onChange={(e) => update(i, { berufsbild: e.target.value })}
                    className="w-full px-3 py-2 rounded text-sm outline-none"
                    style={{ ...inputStyle, backgroundColor: 'var(--card)' }}
                  >
                    {BERUFSBILDER.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="font-mono mb-1" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>
                        NIVEAUSTUFE
                      </div>
                      <div className="grid grid-cols-4 gap-1" role="group" aria-label={`Niveaustufe Bereich ${i + 1}`}>
                        {LEVELS.map((l) => {
                          const ls = LEVEL_STYLES[l]
                          const active = station.level === l
                          return (
                            <button
                              key={l}
                              type="button"
                              aria-pressed={active}
                              title={ls.label}
                              onClick={() => update(i, { level: l })}
                              className="flex flex-col items-center py-1.5 rounded transition-all"
                              style={{ border: active ? `1.5px solid ${ls.text}` : '1px solid var(--border)', backgroundColor: active ? ls.bg : 'transparent' }}
                            >
                              <span className="text-xs font-mono font-bold" style={{ color: ls.text }}>
                                {l}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono mb-1" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>
                        FORMAT
                      </div>
                      <select
                        aria-label={`Format Bereich ${i + 1}`}
                        value={station.format}
                        onChange={(e) => update(i, { format: e.target.value as Format })}
                        className="w-full px-2 py-1.5 rounded text-xs outline-none"
                        style={{ ...inputStyle, backgroundColor: 'var(--card)' }}
                      >
                        {FORMAT_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.icon} {o.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>
                        {formatOption(station.format).desc}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded px-3 py-2.5 text-xs" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          Teilnehmer werden anonym verwaltet. Es werden keine persönlichen Daten gespeichert (§ 60 SGB IX).
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex gap-2 pb-1">
          <button
            type="submit"
            className="flex-1 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {editing ? 'Änderungen speichern' : 'Teilnehmer anlegen'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded text-sm hover:opacity-70 transition-opacity" style={{ border: '1px solid var(--border)' }}>
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  )
}
