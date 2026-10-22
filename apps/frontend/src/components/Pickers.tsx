import { FORMAT_OPTIONS, LEVELS, LEVEL_STYLES, SPRACHEN } from '@/data/constants'
import type { Format, Level, Sprache } from '@/types'

const LABEL_CLASS = 'text-xs font-mono font-medium mb-2'

export function FieldLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className={LABEL_CLASS} style={{ color: 'var(--muted-foreground)' }}>
      {children} {hint && <span className="opacity-60">({hint})</span>}
    </div>
  )
}

type LevelPickerProps = {
  selected: readonly Level[]
  onToggle: (level: Level) => void
  /** 'large' = Kacheln mit Bezeichnung, 'compact' = schmale Leiste */
  size?: 'large' | 'compact'
}

/** Mehrfachauswahl der Niveaustufen T / A / F / B */
export function LevelPicker({ selected, onToggle, size = 'large' }: LevelPickerProps) {
  return (
    <div className={size === 'large' ? 'grid grid-cols-4 gap-2' : 'flex gap-1'} role="group" aria-label="Niveaustufen">
      {LEVELS.map((level) => {
        const s = LEVEL_STYLES[level]
        const active = selected.includes(level)

        if (size === 'compact') {
          return (
            <button
              key={level}
              type="button"
              aria-pressed={active}
              title={s.label}
              onClick={() => onToggle(level)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded text-xs font-mono font-medium transition-all"
              style={{
                backgroundColor: active ? s.bg : 'var(--muted)',
                color: active ? s.text : 'var(--muted-foreground)',
                border: active ? `1.5px solid ${s.text}` : '1px solid transparent',
              }}
            >
              <span className="font-bold">{level}</span>
              <span style={{ fontSize: 9, opacity: active ? 1 : 0.6 }}>{s.label}</span>
            </button>
          )
        }

        return (
          <button
            key={level}
            type="button"
            aria-pressed={active}
            title={s.label}
            onClick={() => onToggle(level)}
            className="flex flex-col items-center gap-1 p-3 rounded-lg transition-all"
            style={{
              border: active ? `1.5px solid ${s.text}` : '1px solid var(--border)',
              backgroundColor: active ? s.bg : 'var(--background)',
            }}
          >
            <span className="text-base font-mono font-bold" style={{ color: s.text }}>
              {level}
            </span>
            <span className="text-xs text-center leading-tight" style={{ color: s.text, opacity: active ? 1 : 0.5 }}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

type FormatPickerProps = {
  selected: readonly Format[]
  onToggle: (format: Format) => void
  /** 'grid' = zwei Spalten mit Beschreibung, 'list' = untereinander, 'compact' = ohne Beschreibung */
  layout?: 'grid' | 'list' | 'compact'
}

/** Mehrfachauswahl der Barrierefreiheits-Formate */
export function FormatPicker({ selected, onToggle, layout = 'grid' }: FormatPickerProps) {
  const containerClass =
    layout === 'list' ? 'flex flex-col gap-2' : layout === 'compact' ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-2 gap-2'

  return (
    <div className={containerClass} role="group" aria-label="Barrierefreiheits-Formate">
      {FORMAT_OPTIONS.map((opt) => {
        const active = selected.includes(opt.id)
        const style = {
          border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
          backgroundColor: active ? '#EBF0F8' : layout === 'compact' ? 'var(--card)' : 'var(--background)',
        }

        if (layout === 'compact') {
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(opt.id)}
              className="flex items-center gap-2 px-2.5 py-2 rounded text-left transition-all"
              style={style}
            >
              <span className="text-base flex-shrink-0" aria-hidden="true">
                {opt.icon}
              </span>
              <span className="text-xs font-medium" style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}>
                {opt.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(opt.id)}
            className="flex items-center gap-3 px-3 py-2.5 rounded text-left transition-all"
            style={style}
          >
            <span className="text-lg w-6 text-center flex-shrink-0" aria-hidden="true">
              {opt.icon}
            </span>
            <div className="flex-1">
              <div className="text-xs font-semibold" style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}>
                {opt.label}
              </div>
              <div className="text-xs leading-tight" style={{ color: 'var(--muted-foreground)' }}>
                {opt.desc}
              </div>
            </div>
            {layout === 'list' && active && (
              <span className="text-xs" style={{ color: 'var(--primary)' }} aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Umschalter Leichte Sprache / Standardsprache */
export function SpracheToggle({ value, onChange }: { value: Sprache; onChange: (value: Sprache) => void }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Sprachformat">
      {SPRACHEN.map((sprache) => (
        <button
          key={sprache}
          type="button"
          aria-pressed={value === sprache}
          onClick={() => onChange(sprache)}
          className="px-3 py-2 rounded text-xs font-medium transition-all"
          style={{
            backgroundColor: value === sprache ? 'var(--primary)' : 'var(--muted)',
            color: value === sprache ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
          }}
        >
          {sprache}
        </button>
      ))}
    </div>
  )
}
