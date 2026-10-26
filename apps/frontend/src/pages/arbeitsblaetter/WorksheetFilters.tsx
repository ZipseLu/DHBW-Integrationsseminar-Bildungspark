import { ALLE_BERUFSBILDER, BERUFSBILDER } from '@/data/constants'
import type { WorksheetFilter } from '@/lib/worksheetFilter'

type Props = {
  filter: WorksheetFilter
  onChange: (filter: WorksheetFilter) => void
  bausteine: number[]
  ausbildungsbausteine: string[]
  onlyFavorites: boolean
  onOnlyFavoritesChange: (value: boolean) => void
  resultCount: number
}

const chipStyle = (active: boolean) => ({
  backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
  color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
  border: '1px solid var(--border)',
})

export function WorksheetFilters({ filter, onChange, bausteine, ausbildungsbausteine, onlyFavorites, onOnlyFavoritesChange, resultCount }: Props) {
  const update = (patch: Partial<WorksheetFilter>) => onChange({ ...filter, ...patch })

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
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: 200 }}
        />
        <button
          type="button"
          aria-pressed={onlyFavorites}
          onClick={() => onOnlyFavoritesChange(!onlyFavorites)}
          className="px-2.5 py-1.5 rounded text-xs font-medium transition-all"
          style={chipStyle(onlyFavorites)}
        >
          ★ Nur Favoriten
        </button>
        <span className="text-xs font-mono ml-auto" style={{ color: 'var(--muted-foreground)' }} aria-live="polite">
          {resultCount} Ergebnisse
        </span>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label htmlFor="filter-berufsbild" className="block text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>
            BERUFSBILD
          </label>
          <select
            id="filter-berufsbild"
            value={filter.berufsbild}
            onChange={(e) => update({ berufsbild: e.target.value, ausbildungsbaustein: 'Alle' })}
            className="px-3 py-1.5 rounded text-xs outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
          >
            {[ALLE_BERUFSBILDER, ...BERUFSBILDER].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>
            BAUSTEIN
          </div>
          <div className="flex gap-1" role="group" aria-label="Baustein">
            {(['Alle', ...bausteine] as (number | 'Alle')[]).map((b) => (
              <button
                key={String(b)}
                type="button"
                aria-pressed={filter.baustein === b}
                onClick={() => update({ baustein: b })}
                className="px-2.5 py-1.5 rounded text-xs font-mono font-medium transition-all"
                style={chipStyle(filter.baustein === b)}
              >
                {b === 'Alle' ? 'Alle' : `BS ${b}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>
            AUSBILDUNGSBAUSTEIN
          </div>
          <div className="flex gap-1 flex-wrap" role="group" aria-label="Ausbildungsbaustein">
            {['Alle', ...ausbildungsbausteine].map((ab) => (
              <button
                key={ab}
                type="button"
                aria-pressed={filter.ausbildungsbaustein === ab}
                onClick={() => update({ ausbildungsbaustein: ab })}
                className="px-2.5 py-1.5 rounded text-xs font-medium transition-all"
                style={chipStyle(filter.ausbildungsbaustein === ab)}
              >
                {ab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
