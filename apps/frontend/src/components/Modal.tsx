import { useEffect, type ReactNode } from 'react'
import { CloseButton } from './SlideOver'

type Props = {
  title: string
  subtitle?: string
  onClose: () => void
  /** Tailwind-Klasse fuer die Breite, z. B. max-w-lg */
  width?: string
  children: ReactNode
}

/** Zentrierter Dialog mit abgedunkeltem Hintergrund. Schliesst mit Esc oder Klick daneben. */
export function Modal({ title, subtitle, onClose, width = 'max-w-lg', children }: Props) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`w-full ${width} rounded-xl flex flex-col overflow-hidden pointer-events-auto`}
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '90vh' }}
        >
          <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              {subtitle && (
                <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {subtitle}
                </div>
              )}
            </div>
            <CloseButton onClick={onClose} />
          </div>
          {children}
        </div>
      </div>
    </>
  )
}
