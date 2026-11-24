import type { ReactNode } from 'react'
import { ALLE_BERUFSBILDER, FORMAT_OPTIONS, LEVELS, LEVEL_STYLES, SPRACHEN } from '@/data/constants'
import { useBerufsfelder } from '@/lib/berufsfelder'
import { EMPTY_FILTER, type WorksheetFilter } from '@/lib/worksheetFilter'
import type { Format, Level, Sprache } from '@/types'

type Props = {
  filter: WorksheetFilter
  onChange: (filter: WorksheetFilter) => void
  bausteine: number[]
  ausbildungsbausteine: string[]
  onlyFavorites: boolean
  onOnlyFavoritesChange: (value: boolean) => void
  resultCount: number
  /** FE-31: e.g. the upload button, shown at the end of the search row */
  aktionen?: ReactNode
}

const feldStil = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

/** Number of filters that differ from "Alle" (search not counted) */
function aktiveFilter(filter: WorksheetFilter): number {
  return (['berufsbild', 'baustein', 'ausbildungsbaustein', 'niveau', 'sprache', 'format'] as const).filter((k) => filter[k] !== EMPTY_FILTER[k]).length
}

/**
 * FE-31: search row plus all filters as dropdowns in one row (formerly six rows of chips),
 * so the list starts right below. "Filter zurücksetzen" appears as soon as one is set.
 */
export function WorksheetFilters({ filter, onChange, bausteine, ausbildungsbausteine, onlyFavorites, onOnlyFavoritesChange, resultCount, aktionen }: Props) {
  const update = (patch: Partial<WorksheetFilter>) => onChange({ ...filter, ...patch })
  const anzahlAktiv = aktiveFilter(filter)
  // FE-34: includes Berufsfelder of curricula added on the page Lehrpläne
  const berufsfelder = useBerufsfelder([filter.berufsbild === ALLE_BERUFSBILDER ? null : filter.berufsbild])

  return (
    <div className="rounded-lg p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          aria-label="Arbeitsblätter durchsuchen"
          placeholder="Suchen nach Titel, Baustein, Abschnitt…"
          value={filter.search}
          onChange={(e) => update({ search: e.target.value })}
          className="px-3 py-2 rounded text-sm outline-none flex-1"
          style={{ ...feldStil, minWidth: 200 }}
        />
        <button
          type="button"
          aria-pressed={onlyFavorites}
          onClick={() => onOnlyFavoritesChange(!onlyFavorites)}
          className="px-2.5 py-2 rounded text-xs font-medium transition-all"
          style={{
            backgroundColor: onlyFavorites ? 'var(--primary)' : 'var(--muted)',
            color: onlyFavorites ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            border: '1px solid var(--border)',
          }}
        >
          ★ Nur Favoriten
        </button>
        {aktionen}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
        <Auswahl id="filter-berufsbild" label="Berufsbild" value={filter.berufsbild} onChange={(berufsbild) => update({ berufsbild, ausbildungsbaustein: 'Alle' })}>
          {[ALLE_BERUFSBILDER, ...berufsfelder].map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Auswahl>
        <Auswahl id="filter-baustein" label="Baustein" value={String(filter.baustein)} onChange={(b) => update({ baustein: b === 'Alle' ? 'Alle' : Number(b) })}>
          <option value="Alle">Alle</option>
          {bausteine.map((b) => (
            <option key={b} value={b}>
              BS {b}
            </option>
          ))}
        </Auswahl>
        <Auswahl id="filter-ausbildungsbaustein" label="Ausbildungsbaustein" value={filter.ausbildungsbaustein} onChange={(ausbildungsbaustein) => update({ ausbildungsbaustein })}>
          {['Alle', ...ausbildungsbausteine].map((ab) => (
            <option key={ab} value={ab}>
              {ab}
            </option>
          ))}
        </Auswahl>
        <Auswahl id="filter-niveau" label="Niveau" value={filter.niveau} onChange={(niveau) => update({ niveau: niveau as Level | 'Alle' })}>
          <option value="Alle">Alle</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l} · {LEVEL_STYLES[l].label}
            </option>
          ))}
        </Auswahl>
        <Auswahl id="filter-sprache" label="Sprache" value={filter.sprache} onChange={(sprache) => update({ sprache: sprache as Sprache | 'Alle' })}>
          <option value="Alle">Alle</option>
          {SPRACHEN.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Auswahl>
        <Auswahl id="filter-format" label="Format" value={filter.format} onChange={(format) => update({ format: format as Format | 'Alle' })}>
          <option value="Alle">Alle</option>
          {FORMAT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.icon} {o.label}
            </option>
          ))}
        </Auswahl>

      </div>

      <div className="flex items-center justify-end gap-3 -mt-1">
        {anzahlAktiv > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTER, search: filter.search })}
            className="text-xs underline underline-offset-2"
            style={{ color: 'var(--accent-text)' }}
          >
            Filter zurücksetzen ({anzahlAktiv})
          </button>
        )}
        <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }} aria-live="polite">
          {resultCount} Ergebnisse
        </span>
      </div>
    </div>
  )
}

function Auswahl({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  const gesetzt = value !== 'Alle' && value !== ALLE_BERUFSBILDER
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded text-xs outline-none"
        style={{ ...feldStil, ...(gesetzt ? { borderColor: 'var(--primary)', fontWeight: 600 } : {}) }}
      >
        {children}
      </select>
    </div>
  )
}
