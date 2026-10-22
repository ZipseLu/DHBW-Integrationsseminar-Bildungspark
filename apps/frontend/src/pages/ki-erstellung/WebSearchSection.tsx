import { useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { FormatPicker, LevelPicker } from '@/components/Pickers'
import { GenerateButton, Spinner, VariantSummary } from '@/components/VariantSummary'
import { LEVELS, LEVEL_STYLES, formatOption } from '@/data/constants'
import { toggleKeepOne } from '@/lib/selection'
import { useSimulatedTask } from '@/lib/simulation'
import { simulateWebResults } from '@/lib/webSearch'
import type { Format, Level, WebResult } from '@/types'

/** "Ähnliche Dokumente im Internet suchen" – Ergebnisse sind im Prototyp simuliert */
export function WebSearchSection({ thema }: { thema: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WebResult[]>([])
  const [resultsFor, setResultsFor] = useState('')
  const [open, setOpen] = useState(true)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [levels, setLevels] = useState<Level[]>([...LEVELS])
  const [formats, setFormats] = useState<Format[]>(['text'])

  const search = useSimulatedTask('websuche')
  const adapt = useSimulatedTask('varianten')

  const effectiveQuery = query.trim() || thema.trim()

  function runSearch() {
    if (!effectiveQuery) return
    const q = effectiveQuery
    setResults([])
    setResultsFor(q)
    setOpen(true)
    setSelectedUrl(null)
    adapt.reset()
    search.start(() => setResults(simulateWebResults(q)))
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
        <span aria-hidden="true">🌐</span>
        <span className="text-xs font-mono font-medium" style={{ color: 'var(--muted-foreground)' }}>
          ÄHNLICHE DOKUMENTE IM INTERNET SUCHEN
        </span>
        <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>
          – optional als Vorlage oder Inspiration
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Suchbegriff für die Internetsuche"
            placeholder={thema ? `Nach „${thema}" suchen…` : 'Suchbegriff eingeben…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter darf das umgebende Formular nicht absenden
              if (e.key === 'Enter') {
                e.preventDefault()
                runSearch()
              }
            }}
            className="flex-1 px-3 py-2 rounded text-sm outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={search.running || !effectiveQuery}
            className="px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {search.running ? <Spinner className="text-xs" /> : <span aria-hidden="true">🔍</span>}
            {search.running ? 'Suche…' : 'Suchen'}
          </button>
        </div>

        {search.running && (
          <div className="py-6 flex flex-col items-center gap-2" style={{ color: 'var(--muted-foreground)' }} role="status">
            <Spinner className="text-2xl" />
            <span className="text-xs">Suche nach ähnlichen Dokumenten…</span>
          </div>
        )}

        {!search.running && results.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }}>
              Prototyp: Die Treffer sind Beispiele, die Links führen nicht zu echten Dokumenten.
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex items-center justify-between text-xs font-mono hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <span>
                {results.length} Ergebnisse für „{resultsFor}"
              </span>
              <span>{open ? '▲ Einklappen' : '▼ Ausklappen'}</span>
            </button>

            {!open && selectedUrl && (
              <div className="rounded px-3 py-2 text-xs font-mono" style={{ backgroundColor: '#EBF0F8', color: 'var(--primary)' }}>
                ✓ 1 Dokument ausgewählt – Anpassungsoptionen eingeklappt
              </div>
            )}

            {open &&
              results.map((r) => {
                const isSelected = selectedUrl === r.url
                return (
                  <div key={r.url} className="rounded-lg overflow-hidden" style={{ border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)' }}>
                    <div className="flex items-start gap-3 px-3 py-3" style={{ backgroundColor: isSelected ? '#EBF0F8' : 'var(--card)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold mb-0.5 leading-snug" style={{ color: 'var(--primary)' }}>
                          {r.title}
                        </div>
                        <a
                          href={`https://${r.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs mb-1.5 flex items-center gap-1 hover:opacity-70 w-fit max-w-full"
                          style={{ color: '#2A7A4B', textDecoration: 'none' }}
                        >
                          <span aria-hidden="true">🔗</span>
                          <span className="underline underline-offset-2 truncate">{r.url}</span>
                        </a>
                        <div className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                          {r.snippet}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedUrl(isSelected ? null : r.url)
                          adapt.reset()
                        }}
                        className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded font-medium transition-all"
                        style={{
                          backgroundColor: isSelected ? 'var(--primary)' : 'var(--muted)',
                          color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {isSelected ? '✓ Ausgewählt' : 'Auswählen'}
                      </button>
                    </div>

                    {isSelected && (
                      <div className="px-3 pb-4 pt-3 flex flex-col gap-3" style={{ backgroundColor: '#F4F7FC', borderTop: '1px solid var(--border)' }}>
                        <div className="text-xs font-mono font-medium" style={{ color: 'var(--primary)' }}>
                          ✦ Dieses Dokument anpassen
                        </div>
                        <div>
                          <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                            ZIELNIVEAUS <span className="opacity-60">(mehrere möglich)</span>
                          </div>
                          <LevelPicker
                            size="compact"
                            selected={levels}
                            onToggle={(l) => {
                              setLevels((prev) => toggleKeepOne(prev, l))
                              adapt.reset()
                            }}
                          />
                        </div>
                        <div>
                          <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                            BARRIEREFREIHEITS-FORMAT
                          </div>
                          <FormatPicker
                            layout="compact"
                            selected={formats}
                            onToggle={(f) => {
                              setFormats((prev) => toggleKeepOne(prev, f))
                              adapt.reset()
                            }}
                          />
                        </div>

                        <VariantSummary levels={levels} formats={formats} />

                        {!adapt.done ? (
                          <GenerateButton running={adapt.running} count={levels.length * formats.length} onClick={() => adapt.start()} />
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="text-xs font-mono font-medium" style={{ color: '#1A5C32' }} role="status">
                              ✓ Alle Varianten bereit
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {levels.flatMap((l) =>
                                formats.map((f) => {
                                  const s = LEVEL_STYLES[l]
                                  return (
                                    <div
                                      key={`${l}-${f}`}
                                      className="rounded px-3 py-2 flex items-center gap-2"
                                      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                                    >
                                      <LevelBadge level={l} />
                                      <span className="text-xs flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>
                                        {formatOption(f).label}
                                      </span>
                                      <button
                                        type="button"
                                        aria-label={`Variante ${l} ${formatOption(f).label} herunterladen`}
                                        className="text-xs px-2 py-0.5 rounded"
                                        style={{ backgroundColor: s.bg, color: s.text }}
                                      >
                                        ↓
                                      </button>
                                    </div>
                                  )
                                }),
                              )}
                            </div>
                            <button
                              type="button"
                              className="text-xs py-2 rounded font-medium"
                              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                            >
                              Alle zur Bibliothek hinzufügen
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
