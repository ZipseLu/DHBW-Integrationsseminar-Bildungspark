import { useEffect, type ReactNode } from 'react'

type Props = {
  label: string
  width: number
  onClose: () => void
  children: ReactNode
}

/** Seitenpanel von rechts mit abgedunkeltem Hintergrund. Schliesst mit Esc oder Klick daneben. */
export function SlideOver({ label, width, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width,
          maxWidth: '100vw',
          backgroundColor: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        }}
      >
        {children}
      </div>
    </>
  )
}

export function CloseButton({ onClick, label = 'Schließen' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-xl leading-none hover:opacity-50 transition-opacity mt-1"
      style={{ color: 'var(--muted-foreground)' }}
    >
      ✕
    </button>
  )
}
