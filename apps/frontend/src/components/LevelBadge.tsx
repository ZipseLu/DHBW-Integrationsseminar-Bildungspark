import { LEVEL_STYLES } from '@/data/constants'
import type { Level } from '@/types'

export function LevelBadge({ level }: { level: Level }) {
  const s = LEVEL_STYLES[level]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
      title={`${s.label} – ${s.beschreibung}`}
    >
      {level}
    </span>
  )
}
