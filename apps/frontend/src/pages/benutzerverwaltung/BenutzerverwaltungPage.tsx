import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { ErrorNote, fieldLabelClass, inputStyle } from '@/components/Widgets'
import { ROLE_LABELS } from '@/data/constants'
import { ROLE_COLORS, initialsOf } from '@/data/users'
import { todayIso } from '@/lib/date'
import { useBenutzer, type KontoAenderung, type KontoNeu } from '@/lib/benutzer'
import type { StaffRole, StaffUser } from '@/types'

type Props = {
  currentUser: StaffUser
  /** Sample accounts, shown and changed locally only when the backend is not reachable */
  users: StaffUser[]
  onChange: (users: StaffUser[]) => void
}

const ROLES: readonly StaffRole[] = ['admin', 'dozent', 'assistent']
const MIN_PASSWORT = 8

/** Dialog state: closed, new account or editing an existing one */
type DialogState = { art: 'zu' } | { art: 'neu' } | { art: 'bearbeiten'; user: StaffUser }

/** Same person? Backend accounts have UUIDs, the signed-in prototype user a fixed ID – compare the e-mail */
const istGleichesKonto = (a: StaffUser, b: StaffUser) => a.email.toLowerCase() === b.email.toLowerCase()

/**
 * Staff accounts (admins only). FE-09: stored via /api/benutzer (BE-03).
 * Without a backend the sample accounts from App are shown and changes stay local.
 */
export function BenutzerverwaltungPage({ currentUser, users: beispielKonten, onChange }: Props) {
  const benutzer = useBenutzer()
  const { quelle } = benutzer
  const lokal = quelle.art === 'fehler'
  const users = lokal ? beispielKonten : benutzer.users
  const [dialog, setDialog] = useState<DialogState>({ art: 'zu' })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [fehler, setFehler] = useState('')

  // Local fallback (sample data) – same behaviour as the prototype before FE-09
  async function anlegen(konto: KontoNeu): Promise<string | null> {
    if (!lokal) return benutzer.anlegen(konto)
    onChange([...beispielKonten, { id: `u${Date.now()}`, name: konto.name, initials: initialsOf(konto.name), role: konto.rolle, email: konto.email, createdAt: todayIso() }])
    return null
  }

  async function aendern(user: StaffUser, aenderung: KontoAenderung): Promise<string | null> {
    if (!lokal) return benutzer.aendern(user.id, aenderung)
    const name = aenderung.name ?? user.name
    onChange(beispielKonten.map((u) => (u.id === user.id ? { ...u, name, initials: initialsOf(name), email: aenderung.email ?? u.email, role: aenderung.rolle ?? u.role } : u)))
    return null
  }

  async function handleDelete(user: StaffUser) {
    let meldung: string | null = null
    if (lokal) onChange(beispielKonten.filter((u) => u.id !== user.id))
    else meldung = await benutzer.loeschen(user.id)
    setFehler(meldung ?? '')
    setConfirmId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {quelle.art === 'fehler' && (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 text-sm flex items-start gap-3"
          style={{ backgroundColor: '#FFF3CD', color: '#7A5C00', border: '1px solid #E8D48A' }}
        >
          <div className="flex-1">
            <div className="font-semibold">Konten konnten nicht geladen werden – es werden Beispieldaten angezeigt.</div>
            <div className="text-xs mt-1">{quelle.grund} Änderungen werden nicht gespeichert.</div>
          </div>
          <button
            type="button"
            onClick={benutzer.neuLaden}
            className="text-xs px-2.5 py-1.5 rounded font-medium flex-shrink-0"
            style={{ backgroundColor: '#7A5C00', color: '#FFFFFF' }}
          >
            Erneut laden
          </button>
        </div>
      )}

      {fehler && (
        <div role="alert" className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
          {fehler}
        </div>
      )}

      <section className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Mitarbeiter-Zugänge">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-display text-lg font-semibold">Mitarbeiter-Zugänge</h2>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {quelle.art === 'laden' ? '…' : `${users.length} Konten · nur für Administratoren sichtbar`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFehler('')
              setDialog({ art: 'neu' })
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            + Mitarbeiter anlegen
          </button>
        </div>

        {quelle.art === 'laden' && (
          <div role="status" className="px-6 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Konten werden geladen …
          </div>
        )}

        <ul>
          {users.map((u, i) => {
            const rc = ROLE_COLORS[u.role]
            const isSelf = istGleichesKonto(u, currentUser)
            return (
              <li key={u.id} className="px-6 py-4 flex items-center gap-4 flex-wrap" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-mono font-bold flex-shrink-0"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  aria-hidden="true"
                >
                  {u.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{u.name}</span>
                    {isSelf && (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        ich
                      </span>
                    )}
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: rc.bg, color: rc.color }}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {u.email}
                  </div>
                </div>
                {u.createdAt && (
                  <div className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                    seit {u.createdAt}
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`Konto von ${u.name} bearbeiten`}
                  onClick={() => {
                    setFehler('')
                    setDialog({ art: 'bearbeiten', user: u })
                  }}
                  className="text-xs px-2.5 py-1.5 rounded hover:opacity-80 transition-opacity flex-shrink-0"
                  style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                >
                  Bearbeiten
                </button>
                {!isSelf &&
                  (confirmId === u.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleDelete(u)}
                        className="text-xs px-2.5 py-1.5 rounded font-medium"
                        style={{ backgroundColor: '#C53030', color: 'white' }}
                      >
                        Ja, löschen
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className="text-xs px-2.5 py-1.5 rounded" style={{ border: '1px solid var(--border)' }}>
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Konto von ${u.name} löschen`}
                      onClick={() => setConfirmId(u.id)}
                      className="text-xs px-2.5 py-1.5 rounded hover:opacity-80 transition-opacity flex-shrink-0"
                      style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
                    >
                      Löschen
                    </button>
                  ))}
              </li>
            )
          })}
        </ul>
      </section>

      {dialog.art !== 'zu' && (
        <KontoDialog
          editing={dialog.art === 'bearbeiten' ? dialog.user : null}
          users={users}
          lokal={lokal}
          onSave={(daten) => (dialog.art === 'bearbeiten' ? aendern(dialog.user, daten) : anlegen(daten as KontoNeu))}
          onClose={() => setDialog({ art: 'zu' })}
        />
      )}
    </div>
  )
}

type DialogProps = {
  /** null = new account */
  editing: StaffUser | null
  users: readonly StaffUser[]
  /** Sample data mode: hint that nothing is stored */
  lokal: boolean
  /** Returns an error message, or null once saved */
  onSave: (daten: KontoAenderung) => Promise<string | null>
  onClose: () => void
}

/** Dialog "Neuen Mitarbeiter anlegen" / "Konto bearbeiten" */
function KontoDialog({ editing, users, lokal, onSave, onClose }: DialogProps) {
  const [form, setForm] = useState({ name: editing?.name ?? '', email: editing?.email ?? '', role: editing?.role ?? ('dozent' as StaffRole), password: '' })
  const [error, setError] = useState('')
  const [speichert, setSpeichert] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (speichert) return
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    if (!name || !email || (!editing && !form.password)) return setError('Bitte alle Pflichtfelder ausfüllen.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Bitte eine gültige E-Mail-Adresse eingeben.')
    if (form.password && form.password.length < MIN_PASSWORT) return setError(`Das Passwort muss mindestens ${MIN_PASSWORT} Zeichen lang sein.`)
    if (users.some((u) => u.email.toLowerCase() === email && u.id !== editing?.id)) return setError('Diese E-Mail-Adresse ist bereits vergeben.')

    // On edit only changed fields are sent; an empty password keeps the old one
    const daten: KontoAenderung = editing
      ? {
          ...(name !== editing.name ? { name } : {}),
          ...(email !== editing.email.toLowerCase() ? { email } : {}),
          ...(form.role !== editing.role ? { rolle: form.role } : {}),
          ...(form.password ? { passwort: form.password } : {}),
        }
      : { name, email, rolle: form.role, passwort: form.password }
    if (editing && Object.keys(daten).length === 0) return onClose()

    setSpeichert(true)
    const meldung = await onSave(daten)
    if (meldung) {
      setError(meldung)
      setSpeichert(false)
      return
    }
    onClose()
  }

  return (
    <Modal title={editing ? 'Konto bearbeiten' : 'Neuen Mitarbeiter anlegen'} width="max-w-md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="ma-name" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
            NAME *
          </label>
          <input
            id="ma-name"
            type="text"
            placeholder="Vor- und Nachname"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="ma-email" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
            E-MAIL-ADRESSE *
          </label>
          <input
            id="ma-email"
            type="email"
            placeholder="name@bildungspark.example"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <div className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
            ROLLE *
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Rolle">
            {ROLES.map((r) => {
              const rc = ROLE_COLORS[r]
              const active = form.role === r
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className="flex flex-col items-center py-2.5 rounded transition-all"
                  style={{ border: active ? `1.5px solid ${rc.color}` : '1px solid var(--border)', backgroundColor: active ? rc.bg : 'var(--background)' }}
                >
                  <span className="text-xs font-semibold" style={{ color: rc.color }}>
                    {ROLE_LABELS[r]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label htmlFor="ma-passwort" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
            {editing ? 'NEUES PASSWORT' : 'PASSWORT *'}
          </label>
          <input
            id="ma-passwort"
            type="password"
            autoComplete="new-password"
            placeholder={editing ? 'Leer lassen = unverändert' : `Mindestens ${MIN_PASSWORT} Zeichen`}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={inputStyle}
          />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        {lokal && (
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Backend nicht erreichbar: Die Änderung gilt nur in diesem Browser, das Passwort wird nicht gespeichert.
          </div>
        )}
        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={speichert}
            className="flex-1 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {speichert ? 'Wird gespeichert …' : editing ? 'Änderungen speichern' : 'Konto anlegen'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded text-sm hover:opacity-70" style={{ border: '1px solid var(--border)' }}>
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  )
}
