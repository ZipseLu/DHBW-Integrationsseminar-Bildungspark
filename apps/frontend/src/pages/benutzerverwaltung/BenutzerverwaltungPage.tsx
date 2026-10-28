import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { ErrorNote, fieldLabelClass, inputStyle } from '@/components/Widgets'
import { ROLE_LABELS } from '@/data/constants'
import { ROLE_COLORS, initialsOf } from '@/data/users'
import { todayIso } from '@/lib/date'
import type { StaffRole, StaffUser } from '@/types'

type Props = {
  currentUser: StaffUser
  users: StaffUser[]
  onChange: (users: StaffUser[]) => void
}

const ROLES: readonly StaffRole[] = ['admin', 'dozent', 'assistent']
const EMPTY_FORM = { name: '', email: '', role: 'dozent' as StaffRole, password: '' }

/**
 * Mitarbeiter-Zugaenge (nur fuer Administratoren).
 * Prototyp: Konten leben nur im Browser, das Passwort wird nur geprueft und nicht gespeichert.
 */
export function BenutzerverwaltungPage({ currentUser, users, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    if (!name || !email || !form.password) return setError('Bitte alle Pflichtfelder ausfüllen.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Bitte eine gültige E-Mail-Adresse eingeben.')
    if (form.password.length < 8) return setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
    if (users.some((u) => u.email.toLowerCase() === email)) return setError('Diese E-Mail-Adresse ist bereits vergeben.')

    onChange([...users, { id: `u${Date.now()}`, name, initials: initialsOf(name), role: form.role, email, createdAt: todayIso() }])
    setShowAdd(false)
    setForm(EMPTY_FORM)
    setError('')
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Mitarbeiter-Zugänge">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-display text-lg font-semibold">Mitarbeiter-Zugänge</h2>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {users.length} Konten · nur für Administratoren sichtbar
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAdd(true)
              setError('')
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            + Mitarbeiter anlegen
          </button>
        </div>

        <ul>
          {users.map((u, i) => {
            const rc = ROLE_COLORS[u.role]
            const isSelf = u.id === currentUser.id
            return (
              <li key={u.id} className="px-6 py-4 flex items-center gap-4" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
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
                {!isSelf &&
                  (confirmId === u.id ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onChange(users.filter((x) => x.id !== u.id))
                          setConfirmId(null)
                        }}
                        className="text-xs px-2.5 py-1.5 rounded font-medium"
                        style={{ backgroundColor: '#E53E3E', color: 'white' }}
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
                      style={{ border: '1px solid #E53E3E', color: '#E53E3E' }}
                    >
                      Löschen
                    </button>
                  ))}
              </li>
            )
          })}
        </ul>
      </section>

      {showAdd && (
        <Modal title="Neuen Mitarbeiter anlegen" width="max-w-md" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="px-6 py-5 flex flex-col gap-4" noValidate>
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
                PASSWORT *
              </label>
              <input
                id="ma-passwort"
                type="password"
                autoComplete="new-password"
                placeholder="Mindestens 8 Zeichen"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 rounded text-sm outline-none"
                style={inputStyle}
              />
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Prototyp: Das Konto gilt nur in diesem Browser, das Passwort wird nicht gespeichert.
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Konto anlegen
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded text-sm hover:opacity-70" style={{ border: '1px solid var(--border)' }}>
                Abbrechen
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
