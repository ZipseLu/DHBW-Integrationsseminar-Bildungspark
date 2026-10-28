import { NAV_ITEMS, ROLE_LABELS } from '@/data/constants'
import type { NavItem, StaffUser } from '@/types'

type Props = {
  user: StaffUser
  active: NavItem
  onNavigate: (item: NavItem) => void
  /** Kompakte Seitenleiste: nur Icons (Einstellung "Kompakte Seitenleiste") */
  compact?: boolean
}

export function Sidebar({ user, active, onNavigate, compact = false }: Props) {
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'admin')

  return (
    <aside
      className={`${compact ? 'w-16' : 'w-60'} flex-shrink-0 flex flex-col transition-all`}
      style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
    >
      <div className={compact ? 'px-2 pt-8 pb-6 text-center' : 'px-6 pt-8 pb-6'} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {compact ? (
          <div className="font-display text-xl font-semibold" title="Bildungspark – Arbeitsblattverwaltung">
            ▦
          </div>
        ) : (
          <>
            <div className="text-xs font-mono tracking-widest uppercase opacity-60 mb-1">Bildungspark</div>
            <div className="font-display text-xl font-semibold leading-tight">Arbeitsblatt&shy;verwaltung</div>
          </>
        )}
      </div>

      <nav className={`flex-1 ${compact ? 'px-2' : 'px-3'} py-5 flex flex-col gap-0.5`} aria-label="Hauptnavigation">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={compact ? item.label : undefined}
              title={compact ? item.label : undefined}
              className={`flex items-center ${compact ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded text-sm text-left w-full transition-all`}
              style={{
                backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <span className="text-base w-5 text-center opacity-80" aria-hidden="true">
                {item.icon}
              </span>
              {!compact && item.label}
            </button>
          )
        })}
      </nav>

      <div className={compact ? 'px-2 pb-6 pt-4 flex justify-center' : 'px-4 pb-6 pt-4'} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3" title={compact ? `${user.name} · ${ROLE_LABELS[user.role]}` : undefined}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-medium flex-shrink-0"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            aria-hidden="true"
          >
            {user.initials}
          </div>
          {!compact && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.name}</div>
              <div className="text-xs opacity-50">{ROLE_LABELS[user.role]}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
