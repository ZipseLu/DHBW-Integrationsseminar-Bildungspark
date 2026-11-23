import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SectionCard, SettingRow, Toggle, fieldLabelClass, inputStyle } from '@/components/Widgets'
import { ROLE_LABELS } from '@/data/constants'
import { useBerufsfelder } from '@/lib/berufsfelder'
import { ACCENT_COLORS, PRIMARY_COLORS } from '@/lib/settings'
import type { AppSettings, StaffUser } from '@/types'

type Props = {
  currentUser: StaffUser
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

type BoolKey = { [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never }[keyof AppSettings]

/**
 * Settings that actually work: dark mode, colours, compact sidebar and the default
 * occupational field for new participants (FE-29: options of the mockup without any
 * effect were removed – language, date format, notifications, auto save …).
 */
export function EinstellungenPage({ currentUser, settings, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  // FE-34: includes Berufsfelder of added curricula
  const berufsfelder = useBerufsfelder([draft.defaultBerufsbild])
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const flip = (key: BoolKey) => setDraft((d) => ({ ...d, [key]: !d[key] }))

  function handleSave(event: FormEvent) {
    event.preventDefault()
    onSave(draft)
    setSaved(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <SectionCard title="Darstellung" desc="Farbgebung, Erscheinungsbild und Layout der Oberfläche.">
          <SettingRow label="Dunkelmodus" desc="Dunkle Hintergrundfarben für die gesamte Oberfläche">
            <Toggle label="Dunkelmodus" value={draft.darkMode} onToggle={() => flip('darkMode')} />
          </SettingRow>
          <SettingRow label="Kompakte Seitenleiste" desc="Zeigt nur Icons ohne Beschriftung in der Navigation">
            <Toggle label="Kompakte Seitenleiste" value={draft.sidebarCompact} onToggle={() => flip('sidebarCompact')} />
          </SettingRow>
          <ColorChoice label="Akzentfarbe" colors={ACCENT_COLORS} value={draft.accentColor} onChange={(c) => set('accentColor', c)} />
          <ColorChoice label="Navigationsfarbe" colors={PRIMARY_COLORS} value={draft.primaryColor} onChange={(c) => set('primaryColor', c)} />
        </SectionCard>

        <SectionCard title="Teilnehmende" desc="Vorgaben beim Anlegen neuer Teilnehmerprofile.">
          <SettingRow label="Standard-Berufsbild" desc="Wird für den ersten Bereich im Lernweg vorgeschlagen">
            <select
              aria-label="Standard-Berufsbild"
              value={draft.defaultBerufsbild}
              onChange={(e) => set('defaultBerufsbild', e.target.value)}
              className="px-3 py-1.5 rounded text-sm outline-none"
              style={inputStyle}
            >
              {berufsfelder.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </SettingRow>
        </SectionCard>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Einstellungen speichern
          </button>
          {saved && (
            <span className="text-sm font-mono" style={{ color: 'var(--success)' }} role="status">
              ✓ Gespeichert
            </span>
          )}
        </div>
      </form>

      <AccountSection user={currentUser} />
    </div>
  )
}

function ColorChoice({ label, colors, value, onChange }: { label: string; colors: readonly string[]; value: string; onChange: (color: string) => void }) {
  return (
    <div>
      <div className={`${fieldLabelClass} mb-2`} style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </div>
      <div className="flex items-center gap-3 flex-wrap" role="group" aria-label={label}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Farbe ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
            onClick={() => onChange(color)}
            className="w-8 h-8 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: color,
              // Auswahl als Ring per box-shadow, damit der Tastatur-Fokusrahmen (outline) sichtbar bleibt
              boxShadow: value.toLowerCase() === color.toLowerCase() ? `0 0 0 2px var(--card), 0 0 0 5px ${color}` : 'none',
              outlineOffset: 7,
            }}
          />
        ))}
        <label className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
            style={{ border: '1px solid var(--border)', padding: 1 }}
            aria-label={`${label} eigene Farbe`}
          />
          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
            Eigene
          </span>
        </label>
      </div>
    </div>
  )
}

/**
 * "Mein Konto": name, e-mail and role. Changing the own password needs the login (FE-08);
 * until then administrators set passwords in the user administration (FE-29).
 */
function AccountSection({ user }: { user: StaffUser }) {
  return (
    <SectionCard title="Mein Konto">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-mono font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--primary)', color: 'white' }}
          aria-hidden="true"
        >
          {user.initials}
        </div>
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {user.email} · {ROLE_LABELS[user.role]}
          </div>
        </div>
      </div>
      <p className="text-sm" style={{ color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        Ein neues Passwort vergibt eine Administratorin oder ein Administrator unter „Benutzerverwaltung“.
      </p>
    </SectionCard>
  )
}
