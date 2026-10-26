import { ALLE_BERUFSBILDER, BERUFSBILDER, FORMAT_OPTIONS, LEVELS, LEVEL_STYLES, SPRACHEN } from '@/data/constants'
import type { WorksheetFilter } from '@/lib/worksheetFilter'
import type { Format, Level, Sprache } from '@/types'

type Props = {
  filter: WorksheetFilter
  onChange: (filter: WorksheetFilter) => void
  bausteine: number[]
  ausbildungsbausteine: string[]
  onlyFavorites: boolean
  onOnlyFavoritesChange: (value: boolean) => void
  resultCount: number
}

type ChipOption<T extends string> = { value: T | 'Alle'; label: string }

const NIVEAU_OPTIONS: ChipOption<Level>[] = [
  { value: 'Alle', label: 'Alle' },
  ...LEVELS.map((l) => ({ value: l, label: `${l} · ${LEVEL_STYLES[l].label}` })),
]

const SPRACHE_OPTIONS: ChipOption<Sprache>[] = [{ value: 'Alle', label: 'Alle' }, ...SPRACHEN.map((s) => ({ value: s, label: s }))]

const FORMAT_CHIP_OPTIONS: ChipOption<Format>[] = [
  { value: 'Alle', label: 'Alle' },
  ...FORMAT_OPTIONS.map((o) => ({ value: o.id, label: `${o.icon} ${o.label}` })),
]

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

      <div className="flex flex-wrap gap-3 items-start">
        <ChipGroup title="NIVEAU" ariaLabel="Niveau" options={NIVEAU_OPTIONS} value={filter.niveau} onChange={(niveau) => update({ niveau })} />
        <ChipGroup title="SPRACHE" ariaLabel="Sprache" options={SPRACHE_OPTIONS} value={filter.sprache} onChange={(sprache) => update({ sprache })} />
        <ChipGroup title="FORMAT" ariaLabel="Format" options={FORMAT_CHIP_OPTIONS} value={filter.format} onChange={(format) => update({ format })} />
      </div>
    </div>
  )
}

function ChipGroup<T extends string>({
  title,
  ariaLabel,
  options,
  value,
  onChange,
}: {
  title: string
  ariaLabel: string
  options: ChipOption<T>[]
  value: T | 'Alle'
  onChange: (value: T | 'Alle') => void
}) {
  return (
    <div>
      <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {title}
      </div>
      <div className="flex gap-1 flex-wrap" role="group" aria-label={ariaLabel}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className="px-2.5 py-1.5 rounded text-xs font-medium transition-all"
            style={chipStyle(value === o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
