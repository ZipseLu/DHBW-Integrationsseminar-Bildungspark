import { formatHeaderDate } from '@/lib/date'

type Props = {
  title: string
  onCreate: () => void
}

export function Header({ title, onCreate }: Props) {
  return (
    <header className="flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
      <div>
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
          {title}
        </h1>
        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-foreground)' }}>
          {formatHeaderDate(new Date())}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs px-3 py-1.5 rounded-full font-mono" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          Prototyp
        </div>
        <button
          type="button"
          className="text-sm px-4 py-2 rounded font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          onClick={onCreate}
        >
          + Arbeitsblatt erstellen
        </button>
      </div>
    </header>
  )
}
