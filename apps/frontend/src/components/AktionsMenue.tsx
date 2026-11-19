import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export type MenuePunkt = { label: string; onSelect: () => void; title?: string }

/**
 * FE-31: "⋯" button with a menu of further actions (WAI-ARIA menu button pattern).
 * Keyboard: Enter/Space/↓ opens and focuses the first entry, ↑/↓/Home/End move,
 * Escape closes and returns to the button, Tab closes. A click outside closes too.
 */
export function AktionsMenue({ label, punkte }: { label: string; punkte: MenuePunkt[] }) {
  const [offen, setOffen] = useState(false)
  const knopfRef = useRef<HTMLButtonElement>(null)
  const menueRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const eintraege = () => Array.from(menueRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])

  useEffect(() => {
    if (!offen) return
    eintraege()[0]?.focus()
    const aussen = (event: MouseEvent) => {
      const ziel = event.target as Node
      if (!menueRef.current?.contains(ziel) && !knopfRef.current?.contains(ziel)) setOffen(false)
    }
    document.addEventListener('mousedown', aussen)
    return () => document.removeEventListener('mousedown', aussen)
  }, [offen])

  function schliessen(fokusZurueck = true) {
    setOffen(false)
    if (fokusZurueck) knopfRef.current?.focus()
  }

  function tasteImMenue(event: KeyboardEvent<HTMLDivElement>) {
    const liste = eintraege()
    const index = liste.indexOf(document.activeElement as HTMLButtonElement)
    const gehe = (i: number) => {
      event.preventDefault()
      liste[(i + liste.length) % liste.length]?.focus()
    }
    if (event.key === 'ArrowDown') gehe(index + 1)
    else if (event.key === 'ArrowUp') gehe(index - 1)
    else if (event.key === 'Home') gehe(0)
    else if (event.key === 'End') gehe(liste.length - 1)
    else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      schliessen()
    } else if (event.key === 'Tab') schliessen(false)
  }

  return (
    <div className="relative">
      <button
        ref={knopfRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={offen}
        aria-controls={offen ? id : undefined}
        title="Weitere Aktionen"
        onClick={() => setOffen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !offen) {
            e.preventDefault()
            setOffen(true)
          }
        }}
        className="text-sm px-2.5 py-1 rounded font-bold hover:opacity-80"
        style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
      >
        ⋯
      </button>
      {offen && (
        <div
          ref={menueRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={tasteImMenue}
          className="absolute right-0 mt-1 z-30 py-1 rounded-lg min-w-52"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}
        >
          {punkte.map((p) => (
            <button
              key={p.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              title={p.title}
              onClick={() => {
                schliessen(false)
                p.onSelect()
              }}
              className="w-full text-left text-sm px-3 py-2 whitespace-nowrap hover:bg-[var(--muted)] focus:bg-[var(--muted)]"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
