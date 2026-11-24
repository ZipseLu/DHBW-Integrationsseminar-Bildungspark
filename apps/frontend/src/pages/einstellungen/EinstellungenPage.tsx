import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FormatPicker, LevelPicker, SpracheToggle, StufenHinweis } from '@/components/Pickers'
import { SectionCard, SettingRow, Toggle, fieldLabelClass, inputStyle } from '@/components/Widgets'
import { ROLE_LABELS } from '@/data/constants'
import { useBerufsfelder } from '@/lib/berufsfelder'
import { toggleKeepOne } from '@/lib/selection'
import { ACCENT_COLORS, DEFAULT_SETTINGS, PRIMARY_COLORS, SCHRIFTGROESSEN } from '@/lib/settings'
import type { AppSettings, Schriftgroesse, StaffUser } from '@/types'

type Props = {
  currentUser: StaffUser
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

type BoolKey = { [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never }[keyof AppSettings]

/**
 * Settings that actually work: dark mode, colours, compact sidebar, text size, the
 * preselection of the KI-Erstellung and the default occupational field for new
 * participants (FE-29: options of the mockup without any effect were removed –
 * language, date format, notifications, auto save …). FE-42: reset to the defaults.
 */
export function EinstellungenPage({ currentUser, settings, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState<string | null>(null)
  // FE-42: "Auf Standard zurücksetzen" asks once before it overwrites everything
  const [zuruecksetzenFragen, setZuruecksetzenFragen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  // FE-34: includes Berufsfelder of added curricula
  const berufsfelder = useBerufsfelder([draft.defaultBerufsbild])
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const flip = (key: BoolKey) => setDraft((d) => ({ ...d, [key]: !d[key] }))

  function melde(text: string) {
    setSaved(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(null), 2500)
  }

  function handleSave(event: FormEvent) {
    event.preventDefault()
    onSave(draft)
    melde('✓ Gespeichert')
  }

  function zuruecksetzen() {
    setDraft(DEFAULT_SETTINGS)
    onSave(DEFAULT_SETTINGS)
    setZuruecksetzenFragen(false)
    melde('✓ Auf Standard zurückgesetzt')
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Two columns on wide screens, so the cards use the whole width */}
      <div className="grid gap-6 xl:grid-cols-2 items-start">
        <div className="flex flex-col gap-6">
          <SectionCard title="Darstellung" desc="Farbgebung, Erscheinungsbild und Layout der Oberfläche.">
            <SettingRow label="Dunkelmodus" desc="Dunkle Hintergrundfarben für die gesamte Oberfläche">
              <Toggle label="Dunkelmodus" value={draft.darkMode} onToggle={() => flip('darkMode')} />
            </SettingRow>
            <SettingRow label="Kompakte Seitenleiste" desc="Zeigt nur Icons ohne Beschriftung in der Navigation">
              <Toggle label="Kompakte Seitenleiste" value={draft.sidebarCompact} onToggle={() => flip('sidebarCompact')} />
            </SettingRow>
            <SettingRow label="Schriftgröße" desc="Größere Schrift für die gesamte Oberfläche">
              <div className="flex gap-1" role="group" aria-label="Schriftgröße">
                {(Object.keys(SCHRIFTGROESSEN) as Schriftgroesse[]).map((groesse) => {
                  const aktiv = draft.schriftgroesse === groesse
                  return (
                    <button
                      key={groesse}
                      type="button"
                      aria-pressed={aktiv}
                      onClick={() => set('schriftgroesse', groesse)}
                      className="px-3 py-1.5 rounded font-medium"
                      style={{
                        fontSize: SCHRIFTGROESSEN[groesse].px * 0.8,
                        backgroundColor: aktiv ? 'var(--primary)' : 'var(--muted)',
                        color: aktiv ? 'var(--primary-foreground)' : 'var(--foreground)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {SCHRIFTGROESSEN[groesse].label}
                    </button>
                  )
                })}
              </div>
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

        </div>
        <div className="flex flex-col gap-6">
          <SectionCard title="KI-Erstellung" desc="Diese Auswahl ist beim Öffnen der KI-Erstellung schon gesetzt und lässt sich dort jederzeit ändern.">
            <div>
              <div className={`${fieldLabelClass} mb-2`} style={{ color: 'var(--muted-foreground)' }}>
                Niveaustufen <span className="font-normal">(mehrere möglich)</span>
              </div>
              <LevelPicker size="compact" selected={draft.kiStufen} onToggle={(l) => set('kiStufen', toggleKeepOne(draft.kiStufen, l))} />
              <StufenHinweis />
            </div>
            <div>
              <div className={`${fieldLabelClass} mb-2`} style={{ color: 'var(--muted-foreground)' }}>
                Barrierefreiheits-Formate <span className="font-normal">(mehrere möglich)</span>
              </div>
              <FormatPicker layout="compact" selected={draft.kiFormate} onToggle={(f) => set('kiFormate', toggleKeepOne(draft.kiFormate, f))} />
            </div>
            <div>
              <div className={`${fieldLabelClass} mb-2`} style={{ color: 'var(--muted-foreground)' }}>
                Sprachformat
              </div>
              <SpracheToggle value={draft.kiSprache} onChange={(sprache) => set('kiSprache', sprache)} />
            </div>
          </SectionCard>

          <AccountSection user={currentUser} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-5 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Einstellungen speichern
        </button>
        {saved && (
          <span className="text-sm" style={{ color: 'var(--success)' }} role="status">
            {saved}
          </span>
        )}
        {!zuruecksetzenFragen && (
          <button
            type="button"
            onClick={() => setZuruecksetzenFragen(true)}
            className="ml-auto px-4 py-2.5 rounded text-sm"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            Auf Standard zurücksetzen
          </button>
        )}
        </div>

      {zuruecksetzenFragen && (
        <div role="alertdialog" aria-label="Einstellungen zurücksetzen" className="rounded-lg p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
          <p className="text-sm">
            Alle Einstellungen auf die Vorgaben des Bildungsparks zurücksetzen? Farben, Schriftgröße, Vorgaben für die KI-Erstellung und das Standard-Berufsbild
            gehen dabei verloren.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={zuruecksetzen}
              className="px-4 py-2 rounded text-sm font-medium"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Zurücksetzen
            </button>
            <button type="button" onClick={() => setZuruecksetzenFragen(false)} className="px-4 py-2 rounded text-sm" style={{ border: '1px solid var(--border)' }}>
              Abbrechen
            </button>
          </div>
          </div>
      )}
    </form>
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
