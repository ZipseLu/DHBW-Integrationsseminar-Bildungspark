import { FORMAT_BADGE_COLORS, LEVEL_STYLES, formatOption, niveausOf } from '@/data/constants'
import { AktionsMenue } from '@/components/AktionsMenue'
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
      className="rounded-lg"
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
            {/* FE-30: levels instead of the former persona letters */}
            {levels.map((l) => (
              <span
                key={l}
                className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                title={`Stufe ${l}: ${LEVEL_STYLES[l].label}`}
                style={{ backgroundColor: LEVEL_STYLES[l].bg, color: LEVEL_STYLES[l].text }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 flex-shrink-0 items-center">
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
          {/* FE-31: one main action, everything else in the "⋯" menu (formerly 8 buttons per row) */}
          <button
            type="button"
            onClick={onPreview}
            aria-label={`${w.title} öffnen`}
            className="text-xs px-3 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Öffnen
          </button>
          <AktionsMenue
            label={`Weitere Aktionen für ${w.title}`}
            punkte={[
              { label: '🕓 Verlauf', onSelect: onHistory },
              ...(w.backend && onEdit ? [{ label: '✎ Bearbeiten', onSelect: onEdit }] : []),
              { label: '📄 Als Word (.docx)', onSelect: onDownload, title: 'Als Word-Datei herunterladen' },
              ...(w.backend && onPdf ? [{ label: '🖨 PDF / Drucken', onSelect: onPdf, title: 'Druckansicht öffnen – dort „Als PDF speichern“ wählen' }] : []),
              { label: '✦ Mit KI anpassen', onSelect: onAdapt },
            ]}
          />
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
