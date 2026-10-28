import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErrorNote, SectionCard, SettingRow, SuccessNote, Toggle, fieldLabelClass, inputStyle } from '@/components/Widgets'
import { BERUFSBILDER, ROLE_LABELS } from '@/data/constants'
import { ACCENT_COLORS, PRIMARY_COLORS } from '@/lib/settings'
import type { AppSettings, StaffUser } from '@/types'

type Props = {
  currentUser: StaffUser
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

type BoolKey = { [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never }[keyof AppSettings]

function choiceStyle(active: boolean) {
  return {
    border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
    backgroundColor: active ? 'var(--muted)' : 'transparent',
    color: 'var(--foreground)',
  }
}

/**
 * Einstellungen wie im Mockup. Wirksam im Prototyp: Dunkelmodus, Farben,
 * kompakte Seitenleiste und Standard-Berufsfeld fuer neue Teilnehmende.
 * Die uebrigen Werte werden gespeichert, aber noch nicht ausgewertet.
 */
export function EinstellungenPage({ currentUser, settings, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

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
          <ColorChoice label="AKZENTFARBE" colors={ACCENT_COLORS} value={draft.accentColor} onChange={(c) => set('accentColor', c)} />
          <ColorChoice label="NAVIGATIONSFARBE" colors={PRIMARY_COLORS} value={draft.primaryColor} onChange={(c) => set('primaryColor', c)} />
        </SectionCard>

        <SectionCard title="Sprache & Regional" desc="Spracheinstellungen und Datumsformate.">
          <SettingRow label="Sprache der Oberfläche">
            <div className="flex gap-2">
              {(['de', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  aria-pressed={draft.language === lang}
                  onClick={() => set('language', lang)}
                  className="px-3 py-1.5 rounded text-xs font-mono font-medium transition-all"
                  style={choiceStyle(draft.language === lang)}
                >
                  {lang === 'de' ? 'Deutsch' : 'English'}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Datumsformat">
            <div className="flex gap-2">
              {(['DD.MM.YYYY', 'YYYY-MM-DD'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  aria-pressed={draft.dateFormat === fmt}
                  onClick={() => set('dateFormat', fmt)}
                  className="px-3 py-1.5 rounded text-xs font-mono transition-all"
                  style={choiceStyle(draft.dateFormat === fmt)}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </SettingRow>
        </SectionCard>

        <SectionCard title="Arbeitsblätter & KI" desc="Standardverhalten beim Erstellen und Bearbeiten von Arbeitsblättern.">
          <SettingRow label="Standard-Berufsbild">
            <select
              aria-label="Standard-Berufsbild"
              value={draft.defaultBerufsbild}
              onChange={(e) => set('defaultBerufsbild', e.target.value)}
              className="px-3 py-1.5 rounded text-sm outline-none"
              style={inputStyle}
            >
              {BERUFSBILDER.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Standard-Exportformat">
            <div className="flex gap-2">
              {(['docx', 'pdf'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  aria-pressed={draft.exportFormat === fmt}
                  onClick={() => set('exportFormat', fmt)}
                  className="px-3 py-1.5 rounded text-xs font-mono transition-all"
                  style={choiceStyle(draft.exportFormat === fmt)}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="KI-Ergebnis automatisch aufklappen" desc="Nach erfolgreicher Generierung direkt anzeigen">
            <Toggle label="KI-Ergebnis automatisch aufklappen" value={draft.aiAutoExpand} onToggle={() => flip('aiAutoExpand')} />
          </SettingRow>
          <SettingRow label="Persona-Badges anzeigen" desc="Empfohlene Persona-Kennzeichnung auf Arbeitsblatt-Karten">
            <Toggle label="Persona-Badges anzeigen" value={draft.showPersonaBadges} onToggle={() => flip('showPersonaBadges')} />
          </SettingRow>
          <SettingRow label="Automatisch speichern" desc="Änderungen beim Bearbeiten alle 30 Sekunden automatisch sichern">
            <Toggle label="Automatisch speichern" value={draft.autoSave} onToggle={() => flip('autoSave')} />
          </SettingRow>
        </SectionCard>

        <SectionCard title="Sitzung & Sicherheit" desc="Benachrichtigungen.">
          <SettingRow label="E-Mail-Benachrichtigungen" desc="Bei neuen Arbeitsblättern oder Kommentaren eine E-Mail erhalten">
            <Toggle label="E-Mail-Benachrichtigungen" value={draft.emailNotifications} onToggle={() => flip('emailNotifications')} />
          </SettingRow>
          <SettingRow label="Erinnerungen für ausstehende Arbeitsblätter" desc="Täglich an nicht abgeschlossene Teilnehmer-Aufgaben erinnern">
            <Toggle label="Erinnerungen für ausstehende Arbeitsblätter" value={draft.worksheetReminders} onToggle={() => flip('worksheetReminders')} />
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
            <span className="text-sm font-mono" style={{ color: '#2A7A4B' }} role="status">
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
            style={{ backgroundColor: color, outline: value.toLowerCase() === color.toLowerCase() ? `3px solid ${color}` : 'none', outlineOffset: 2 }}
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

/** "Mein Konto" – Passwort ändern ist im Prototyp ohne Anmeldung nur eine Formularprüfung */
function AccountSection({ user }: { user: StaffUser }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSuccess(false)
    if (!current) return setError('Bitte das aktuelle Passwort eingeben.')
    if (next.length < 8) return setError('Das neue Passwort muss mindestens 8 Zeichen lang sein.')
    if (next !== confirm) return setError('Die neuen Passwörter stimmen nicht überein.')
    setError('')
    setCurrent('')
    setNext('')
    setConfirm('')
    setSuccess(true)
  }

  const fieldStyle = { ...inputStyle, border: `1px solid ${error ? '#E53E3E' : 'var(--border)'}` }
  const clear = () => {
    setError('')
    setSuccess(false)
  }

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
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="text-sm font-semibold mb-4">Passwort ändern</div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div>
            <label htmlFor="pw-aktuell" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
              AKTUELLES PASSWORT
            </label>
            <input
              id="pw-aktuell"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => {
                setCurrent(e.target.value)
                clear()
              }}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={fieldStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pw-neu" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
                NEUES PASSWORT
              </label>
              <input
                id="pw-neu"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => {
                  setNext(e.target.value)
                  clear()
                }}
                placeholder="Min. 8 Zeichen"
                className="w-full px-3 py-2.5 rounded text-sm outline-none"
                style={fieldStyle}
              />
            </div>
            <div>
              <label htmlFor="pw-wiederholen" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
                PASSWORT WIEDERHOLEN
              </label>
              <input
                id="pw-wiederholen"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  clear()
                }}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded text-sm outline-none"
                style={fieldStyle}
              />
            </div>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          {success && <SuccessNote>✓ Eingaben sind gültig. Im Prototyp gibt es noch keine Anmeldung, das Passwort wird daher nicht gespeichert.</SuccessNote>}
          <div>
            <button
              type="submit"
              className="px-4 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Passwort ändern
            </button>
          </div>
        </form>
      </div>
    </SectionCard>
  )
}
