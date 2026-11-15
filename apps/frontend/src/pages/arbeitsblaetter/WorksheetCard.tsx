import { FORMAT_BADGE_COLORS, LEVEL_STYLES, PERSONA_MAP, formatOption, niveausOf } from '@/data/constants'
import type { Worksheet } from '@/types'

type Props = {
  worksheet: Worksheet
  isFavorite: boolean
  onToggleFavorite: () => void
  onPreview: () => void
  onHistory: () => void
  /** Only offered for worksheets saved in the backend (FE-10) */
  onEdit?: () => void
  onDownload: () => void
  /** FE-04: print view / PDF, only for worksheets saved in the backend */
  onPdf?: () => void
  onAdapt: () => void
}

const secondaryButton = { backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }

export function WorksheetCard({
  worksheet: w,
  isFavorite,
  onToggleFavorite,
  onPreview,
  onHistory,
  onEdit,
  onDownload,
  onPdf,
  onAdapt,
}: Props) {
  const opt = formatOption(w.format)
  const formatColors = FORMAT_BADGE_COLORS[w.format]
  const levels = niveausOf(w)

  return (
    <article
      className="rounded-lg overflow-hidden"
      aria-label={w.title}
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 flex flex-col items-center justify-center rounded px-2 py-1 text-center" style={{ backgroundColor: 'var(--muted)', minWidth: 44 }}>
          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
            BS
          </span>
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--foreground)' }}>
            {w.baustein}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{w.ausbildungsbaustein}</span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }} aria-hidden="true">
              →
            </span>
            <h3 className="text-sm font-normal">{w.title}</h3>
            {w.backend && <StatusBadge status={w.backend.status} />}
            {w.aiGenerated && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }} title="KI-generiert">
                KI
              </span>
            )}
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
            <span className="font-medium" style={{ color: 'var(--foreground)' }}>
              {w.berufsbild}
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span className="font-mono">{w.createdBy}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span className="font-mono">{w.date}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: formatColors.bg, color: formatColors.color }}>
              {opt.icon} {opt.label}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>
              {w.sprache}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              → Personas:
            </span>
            {levels.map((l) => {
              const letter = PERSONA_MAP[l][w.format]
              const s = LEVEL_STYLES[l]
              return (
                <span
                  key={l}
                  className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                  title={`Persona ${letter}: ${s.label} · ${opt.label}`}
                  style={{ backgroundColor: s.bg, color: s.text }}
                >
                  {letter}
                </span>
              )
            })}
          </div>
        </div>

        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label="Als Favorit markieren"
            aria-pressed={isFavorite}
            title={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
            className="text-sm px-2 py-1 rounded font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: isFavorite ? '#FEF3C7' : 'var(--muted)',
              color: isFavorite ? '#92400E' : 'var(--muted-foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button type="button" onClick={onPreview} className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80" style={secondaryButton}>
            👁 Vorschau
          </button>
          <button type="button" onClick={onHistory} className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80" style={secondaryButton}>
            🕓 Verlauf
          </button>
          {w.backend && onEdit && (
            <button type="button" onClick={onEdit} className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80" style={secondaryButton}>
              ✎ Bearbeiten
            </button>
          )}
          <button
            type="button"
            onClick={onDownload}
            className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80"
            style={secondaryButton}
            title="Als Word-Datei herunterladen"
          >
            📄 .docx
          </button>
          {w.backend && onPdf && (
            <button
              type="button"
              onClick={onPdf}
              className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80"
              style={secondaryButton}
              title="Druckansicht öffnen – dort „Als PDF speichern“ wählen"
            >
              🖨 PDF
            </button>
          )}
          <button
            type="button"
            onClick={onAdapt}
            className="text-xs px-2.5 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            ✦ Anpassen
          </button>
        </div>
      </div>

    </article>
  )
}

export const STATUS_STYLES = {
  entwurf: { label: 'Entwurf', bg: '#DCEAF7', color: '#00487A' },
  freigegeben: { label: 'Freigegeben', bg: '#D4EDDA', color: '#1A5C32' },
  archiviert: { label: 'Archiviert', bg: '#FAD9C8', color: '#7A2E00' },
} as const

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
  const st = STATUS_STYLES[status]
  return (
    <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: st.bg, color: st.color }}>
      {st.label}
    </span>
  )
}
