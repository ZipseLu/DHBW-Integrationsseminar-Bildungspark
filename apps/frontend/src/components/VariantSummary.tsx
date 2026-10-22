import type { ReactNode } from 'react'
import { LEVEL_STYLES, formatOption } from '@/data/constants'
import { variantenLabel } from '@/lib/selection'
import type { Format, Level } from '@/types'

type Props = {
  levels: readonly Level[]
  formats: readonly Format[]
  /** Zusatzangaben hinter der Format-Liste, z. B. Sprache oder Berufsbild */
  extras?: ReactNode
  children?: ReactNode
}

/** "KI erstellt 4 Varianten: T A F B × Standard-Text · Leichte Sprache" */
export function VariantSummary({ levels, formats, extras, children }: Props) {
  return (
    <div
      className="rounded px-3 py-2.5 text-xs font-mono flex flex-col gap-1.5"
      style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
    >
      <div>
        KI erstellt <strong style={{ color: 'var(--foreground)' }}>{variantenLabel(levels.length * formats.length)}</strong>:{' '}
        {levels.map((l) => (
          <span key={l} className="font-bold" style={{ color: LEVEL_STYLES[l].text }}>
            {l}{' '}
          </span>
        ))}
        × {formats.map((f) => formatOption(f).label).join(', ')}
        {extras}
      </div>
      {children}
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block animate-spin ${className}`} aria-hidden="true">
      ✦
    </span>
  )
}

type GenerateButtonProps = {
  running: boolean
  count: number
  onClick?: () => void
  type?: 'button' | 'submit'
  verb?: string
  runningText?: string
}

/** Orangefarbener Haupt-Button "✦ 4 Varianten erstellen" */
export function GenerateButton({
  running,
  count,
  onClick,
  type = 'button',
  verb = 'erstellen',
  runningText = 'Varianten werden erstellt…',
}: GenerateButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={running}
      className="flex items-center justify-center gap-2 px-5 py-3 rounded font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
    >
      {running ? (
        <>
          <Spinner /> {runningText}
        </>
      ) : (
        `✦ ${variantenLabel(count)} ${verb}`
      )}
    </button>
  )
}
