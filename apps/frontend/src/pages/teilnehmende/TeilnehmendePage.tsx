import { useState } from 'react'
import { SuccessNote } from '@/components/Widgets'
import { todayIso } from '@/lib/date'
import { buildStations, nextParticipantId, type StationDraft } from '@/lib/participants'
import type { TeilnehmendeState } from '@/lib/teilnehmende'
import type { Participant } from '@/types'
import { AssignWorksheetModal } from './AssignWorksheetModal'
import { ParticipantCard } from './ParticipantCard'
import { ParticipantModal } from './ParticipantModal'

type Props = {
  /** Profiles and actions from useTeilnehmende() (FE-12) */
  teilnehmende: TeilnehmendeState
  defaultBerufsbild: string
}

/** Dialogzustand: geschlossen, neue Person oder Bearbeiten */
type EditState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; participant: Participant }

export function TeilnehmendePage({ teilnehmende, defaultBerufsbild }: Props) {
  const { participants, quelle } = teilnehmende
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState>({ mode: 'closed' })
  const [assignFor, setAssignFor] = useState<Participant | null>(null)
  const [notice, setNotice] = useState('')
  const [fehler, setFehler] = useState('')

  /** Saves the dialog. Returns an error message or null on success. */
  async function handleSave(id: string, drafts: StationDraft[]): Promise<string | null> {
    const today = todayIso()
    let alteKennung: string | null = null
    let participant: Participant
    if (edit.mode === 'edit') {
      const original = edit.participant
      const berufsbilder = buildStations(drafts, original.berufsbilder, today)
      alteKennung = original.id
      // The backend keeps the pseudonymous ID fixed, so it is not editable here
      participant = { ...original, level: berufsbilder[0]?.level ?? original.level, berufsbilder }
    } else if (edit.mode === 'new') {
      const newId = (id || nextParticipantId(participants)).toUpperCase()
      if (participants.some((p) => p.id === newId)) return `Die Kennung ${newId} gibt es bereits.`
      const berufsbilder = buildStations(drafts, [], today)
      participant = { id: newId, level: berufsbilder[0]?.level ?? 'T', progress: 0, lastActive: today, berufsbilder }
    } else {
      return null
    }
    const fehlermeldung = await teilnehmende.speichern(alteKennung, participant)
    if (fehlermeldung) return fehlermeldung
    setNotice('')
    setFehler('')
    setEdit({ mode: 'closed' })
    return null
  }

  async function handleDelete(kennung: string) {
    setNotice('')
    const fehlermeldung = await teilnehmende.loeschen(kennung)
    setFehler(fehlermeldung ?? '')
    if (!fehlermeldung && expandedId === kennung) setExpandedId(null)
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

      {quelle.art === 'beispiel' && (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 text-sm flex items-start gap-3"
          style={{ backgroundColor: '#FFF3CD', color: '#7A5C00', border: '1px solid #E8D48A' }}
        >
          <div className="flex-1">
            <div className="font-semibold">Teilnehmende konnten nicht geladen werden – es werden Beispieldaten angezeigt.</div>
            <div className="text-xs mt-1">{quelle.grund} Änderungen werden nicht gespeichert.</div>
          </div>
          <button
            type="button"
            onClick={teilnehmende.neuLaden}
            className="text-xs px-2.5 py-1.5 rounded font-medium flex-shrink-0"
            style={{ backgroundColor: '#7A5C00', color: '#FFFFFF' }}
          >
            Erneut laden
          </button>
        </div>
      )}

      {notice && <SuccessNote>{notice}</SuccessNote>}

      {fehler && (
        <div role="alert" className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
          {fehler}
        </div>
      )}

      {quelle.art === 'laden' && (
        <div role="status" className="py-10 text-center text-sm rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          Teilnehmende werden geladen …
        </div>
      )}

      {participants.map((p) => (
        <ParticipantCard
          key={p.id}
          participant={p}
          expanded={expandedId === p.id}
          onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
          onAssign={() => setAssignFor(p)}
          onEdit={() => setEdit({ mode: 'edit', participant: p })}
          onDelete={() => void handleDelete(p.id)}
        />
      ))}

      {quelle.art !== 'laden' && participants.length === 0 && (
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
