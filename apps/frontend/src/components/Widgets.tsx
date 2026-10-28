import type { ReactNode } from 'react'

/** Kennzahl-Kachel (Dashboard) */
export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-1"
      style={{
        backgroundColor: accent ? 'var(--primary)' : 'var(--card)',
        color: accent ? 'var(--primary-foreground)' : 'var(--card-foreground)',
        border: accent ? 'none' : '1px solid var(--border)',
      }}
    >
      <span className="text-xs font-medium tracking-wide uppercase opacity-70 font-mono">{label}</span>
      <span className="text-3xl font-display font-semibold leading-none">{value}</span>
      {sub && <span className="text-xs opacity-60 mt-1">{sub}</span>}
    </div>
  )
}

/** Fortschrittsbalken 0–100 % */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const color = value > 70 ? '#2A7A4B' : value > 40 ? 'var(--primary)' : 'var(--accent)'
  return (
    <div
      className="h-1.5 rounded-full w-full"
      style={{ backgroundColor: 'var(--muted)' }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  )
}

/** Ein/Aus-Schalter */
export function Toggle({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={onToggle}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
      style={{ backgroundColor: value ? 'var(--primary)' : 'var(--border)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

/** Karte mit grauem Kopfbereich (Einstellungen) */
export function SectionCard({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label={title}>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {desc && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {desc}
          </p>
        )}
      </div>
      <div className="px-6 py-5 flex flex-col gap-5">{children}</div>
    </section>
  )
}

/** Eine Zeile "Bezeichnung + Beschreibung | Bedienelement" */
export function SettingRow({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {desc}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
export const fieldLabelClass = 'block text-xs font-mono font-medium mb-1.5'

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF2F2', color: '#E53E3E', border: '1px solid #FECACA' }}>
      {children}
    </div>
  )
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#F0FBF4', color: '#2A7A4B', border: '1px solid #C3E6CB' }}>
      {children}
    </div>
  )
}
