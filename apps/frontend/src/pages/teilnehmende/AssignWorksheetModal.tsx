import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { formatOption } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import { activeStation, worksheetsFor } from '@/lib/participants'
import type { Participant, Worksheet } from '@/types'

type Props = {
  participant: Participant
  onAssign: (worksheet: Worksheet) => void
  onClose: () => void
}

/** Dialog "Arbeitsblatt zuweisen" – zeigt die Arbeitsblätter des aktiven Berufsfelds */
export function AssignWorksheetModal({ participant, onAssign, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const active = activeStation(participant)
  const candidates = active ? worksheetsFor(WORKSHEETS, active.berufsbild) : WORKSHEETS
  const selected = candidates.find((w) => w.id === selectedId) ?? null

  return (
    <Modal title="Arbeitsblatt zuweisen" subtitle={`${participant.id} · ${active ? active.berufsbild : 'Kein aktiver Bereich'}`} onClose={onClose}>
      <div className="flex flex-col gap-1 p-4 overflow-y-auto" role="listbox" aria-label="Arbeitsblätter">
        {candidates.length === 0 && (
          <div className="text-sm text-center py-8" style={{ color: 'var(--muted-foreground)' }}>
            Keine passenden Arbeitsblätter gefunden.
          </div>
        )}
        {candidates.map((w) => {
          const isSelected = selectedId === w.id
          const opt = formatOption(w.format)
          return (
            <button
              key={w.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => setSelectedId(isSelected ? null : w.id)}
              className="flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all hover:opacity-90"
              style={{ border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)', backgroundColor: isSelected ? 'var(--muted)' : 'transparent' }}
            >
              <div
                className="w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center"
                style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border)', backgroundColor: isSelected ? 'var(--primary)' : 'transparent' }}
                aria-hidden="true"
              >
                {isSelected && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{w.title}</div>
                <div className="text-xs font-mono mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
                  <span>BS {w.baustein}</span>
                  <span>·</span>
                  <span>{w.ausbildungsbaustein}</span>
                  <span>
                    {opt.icon} {opt.label}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="px-4 py-4 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onAssign(selected)}
          className="flex-1 py-2.5 rounded font-medium text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Zuweisen
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded text-sm hover:opacity-70" style={{ border: '1px solid var(--border)' }}>
          Abbrechen
        </button>
      </div>
    </Modal>
  )
}
