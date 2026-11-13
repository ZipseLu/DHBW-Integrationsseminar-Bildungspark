import { useState } from 'react'
import { SuccessNote } from '@/components/Widgets'
import { todayIso } from '@/lib/date'
import { buildStations, nextParticipantId, type StationDraft } from '@/lib/participants'
import type { Participant } from '@/types'
import { AssignWorksheetModal } from './AssignWorksheetModal'
import { ParticipantCard } from './ParticipantCard'
import { ParticipantModal } from './ParticipantModal'

type Props = {
  participants: Participant[]
  onChange: (participants: Participant[]) => void
  defaultBerufsbild: string
}

/** Dialogzustand: geschlossen, neue Person oder Bearbeiten */
type EditState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; participant: Participant }

export function TeilnehmendePage({ participants, onChange, defaultBerufsbild }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState>({ mode: 'closed' })
  const [assignFor, setAssignFor] = useState<Participant | null>(null)
  const [notice, setNotice] = useState('')

  /** Speichert den Dialog. Gibt eine Fehlermeldung zurueck oder null bei Erfolg. */
  function handleSave(id: string, drafts: StationDraft[]): string | null {
    const today = todayIso()
    if (edit.mode === 'edit') {
      const original = edit.participant
      const berufsbilder = buildStations(drafts, original.berufsbilder, today)
      if (id && id !== original.id && participants.some((p) => p.id === id)) return `Die Kennung ${id} gibt es bereits.`
      const updated: Participant = { ...original, id: id || original.id, level: berufsbilder[0]?.level ?? original.level, berufsbilder }
      onChange(participants.map((p) => (p.id === original.id ? updated : p)))
      if (expandedId === original.id) setExpandedId(updated.id)
    } else if (edit.mode === 'new') {
      const newId = id || nextParticipantId(participants)
      if (participants.some((p) => p.id === newId)) return `Die Kennung ${newId} gibt es bereits.`
      const berufsbilder = buildStations(drafts, [], today)
      onChange([...participants, { id: newId, level: berufsbilder[0]?.level ?? 'T', progress: 0, lastActive: today, berufsbilder }])
    }
    setNotice('')
    setEdit({ mode: 'closed' })
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Anonymisierte Teilnehmerprofile</h2>
          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
            § 60 SGB IX konform · {participants.length} Teilnehmende
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice('')
            setEdit({ mode: 'new' })
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          + Teilnehmer hinzufügen
        </button>
      </div>

      {notice && <SuccessNote>{notice}</SuccessNote>}

      {participants.map((p) => (
        <ParticipantCard
          key={p.id}
          participant={p}
          expanded={expandedId === p.id}
          onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
          onAssign={() => setAssignFor(p)}
          onEdit={() => setEdit({ mode: 'edit', participant: p })}
          onDelete={() => {
            onChange(participants.filter((x) => x.id !== p.id))
            if (expandedId === p.id) setExpandedId(null)
          }}
        />
      ))}

      {participants.length === 0 && (
        <div className="py-10 text-center text-sm rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          Noch keine Teilnehmenden angelegt.
        </div>
      )}

      {edit.mode !== 'closed' && (
        <ParticipantModal
          editing={edit.mode === 'edit' ? edit.participant : null}
          defaultBerufsbild={defaultBerufsbild}
          onSave={handleSave}
          onClose={() => setEdit({ mode: 'closed' })}
        />
      )}

      {assignFor && (
        <AssignWorksheetModal
          participant={assignFor}
          onClose={() => setAssignFor(null)}
          onAssign={(w) => {
            // Prototyp: Zuweisung wird nur bestaetigt, noch nicht gespeichert
            setNotice(`Arbeitsblatt „${w.title}“ wurde ${assignFor.id} zugewiesen.`)
            setAssignFor(null)
          }}
        />
      )}
    </div>
  )
}
