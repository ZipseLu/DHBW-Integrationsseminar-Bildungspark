import { useState } from 'react'
import { FormatPicker, LevelPicker } from '@/components/Pickers'
import { GenerateButton, Spinner, VariantSummary } from '@/components/VariantSummary'
import { LEVELS } from '@/data/constants'
import { ApiError } from '@/lib/api'
import { ladeWebDokument, searchWebResults } from '@/lib/webSearch'
import { toggleKeepOne } from '@/lib/selection'
import type { Format, Level, WebResult } from '@/types'

/** FE-35: a web search hit with its text, used as template for the KI-Erstellung */
export type WebVorlage = { titel: string; url: string; text: string }

type Props = {
  thema: string
  vorschlag?: string
  /** Generates the chosen variants from the template; missing = adapting is not possible (no learning goal) */
  onAnpassen?: (vorlage: WebVorlage, levels: Level[], formats: Format[]) => void
  /** True while the KI-Erstellung is generating variants */
  generierungLaeuft?: boolean
}

/** "PDF Arbeitsheft Logistik - Westermann" -> "Arbeitsheft Logistik - Westermann" (engines prefix the file type) */
const ohneDateitypPraefix = (titel: string) => titel.replace(/^(PDF|DOCX?)\s+/i, '')

/** Finds worksheets on the web that match the entered keywords (FE-36: no other documents). */
export function WebSearchSection({ thema, vorschlag = '', onAnpassen, generierungLaeuft = false }: Props) {
  // The selected learning goal is pre-filled and stays editable; choosing another goal replaces it
  const [query, setQuery] = useState(vorschlag)
  const [vorschlagBisher, setVorschlagBisher] = useState(vorschlag)
  if (vorschlag !== vorschlagBisher) {
    setVorschlagBisher(vorschlag)
    setQuery(vorschlag)
  }
  const [fileType, setFileType] = useState('')
  const [results, setResults] = useState<WebResult[]>([])
  const [resultsFor, setResultsFor] = useState('')
  const [open, setOpen] = useState(true)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [levels, setLevels] = useState<Level[]>([...LEVELS])
  const [formats, setFormats] = useState<Format[]>(['text'])

  const [searchRunning, setSearchRunning] = useState(false)
  const [searchError, setSearchError] = useState('')
  // FE-35: reading the selected document (PDF/DOCX) before the variants are generated
  const [dokumentLaedt, setDokumentLaedt] = useState(false)
  const [dokumentFehler, setDokumentFehler] = useState('')
  const [uebergeben, setUebergeben] = useState<string | null>(null)
  /** Wahr, wenn mindestens ein Treffer aus dem Mock-Modus stammt (keine echte Websuche) */
  const [mockMode, setMockMode] = useState(false)

  const effectiveQuery = query.trim() || thema.trim()

  async function runSearch() {
    if (!effectiveQuery) return
    const q = effectiveQuery
    setResults([])
    setSearchError('')
    setResultsFor(q)
    setOpen(true)
    setSelectedUrl(null)
    setDokumentFehler('')
    setUebergeben(null)
    setMockMode(false)
    setSearchRunning(true)
    try {
      const fetched = await searchWebResults(q, fileType || undefined)
      setResults(fetched)
      setMockMode(fetched.some((r) => r.mocked === true))
    } catch (error) {
      console.error('Websuche fehlgeschlagen', error)
      setSearchError(error instanceof Error ? error.message : 'Die Websuche ist fehlgeschlagen.')
    } finally {
      setSearchRunning(false)
    }
  }

  async function anpassen(r: WebResult) {
    if (!onAnpassen || dokumentLaedt) return
    setDokumentLaedt(true)
    setDokumentFehler('')
    setUebergeben(null)
    try {
      const dokument = await ladeWebDokument(r.url)
      setUebergeben(r.url)
      onAnpassen({ titel: ohneDateitypPraefix(r.title), url: r.url, text: dokument.text }, levels, formats)
    } catch (error) {
      setDokumentFehler(error instanceof ApiError ? error.message : 'Das Dokument konnte nicht gelesen werden.')
    } finally {
      setDokumentLaedt(false)
    }
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
        <span aria-hidden="true">🌐</span>
        <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
          Arbeitsblätter im Internet suchen
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
              if (e.key === 'Enter') {
                e.preventDefault()
                runSearch()
              }
            }}
            className="flex-1 px-3 py-2 rounded text-sm outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
          />
          <select
            aria-label="Dateityp filtern"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="px-2 py-2 rounded text-sm outline-none"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
          >
            <option value="">PDF &amp; DOCX</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
          </select>
          <button
            type="button"
            onClick={runSearch}
            disabled={searchRunning || !effectiveQuery}
            className="px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {searchRunning ? <Spinner className="text-xs" /> : <span aria-hidden="true">🔍</span>}
            {searchRunning ? 'Suche…' : 'Suchen'}
          </button>
        </div>

        {searchError && (
          <div className="text-xs px-3 py-2 rounded" role="alert" style={{ backgroundColor: '#FDECEC', color: '#8A1C1C' }}>
            {searchError}
          </div>
        )}

        {!searchRunning && !searchError && resultsFor && results.length === 0 && (
          <div className="text-xs py-3" role="status" style={{ color: 'var(--muted-foreground)' }}>
            Keine Arbeitsblätter zu „{resultsFor}“ gefunden. Versuchen Sie weniger oder andere Stichwörter.
          </div>
        )}

        {searchRunning && (
          <div className="py-6 flex flex-col items-center gap-2" style={{ color: 'var(--muted-foreground)' }} role="status">
            <Spinner className="text-2xl" />
            <span className="text-xs">Suche nach passenden Arbeitsblättern…</span>
          </div>
        )}

        {!searchRunning && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {mockMode && (
              <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }}>
                ⚠ Simulierte Beispieltreffer. Die echte Websuche ist
                derzeit nicht erreichbar. Prüfen Sie die Internetverbindung des Backends.
              </div>
            )}
            {!mockMode && (
              <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#D4EDDA', color: '#1A5C32' }}>
                ✓ Echte Websuchergebnisse vom Backend.
              </div>
            )}
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
              <div className="rounded px-3 py-2 text-xs font-mono" style={{ backgroundColor: 'var(--tint-info)', color: 'var(--primary-text)' }}>
                ✓ 1 Dokument ausgewählt – Anpassungsoptionen eingeklappt
              </div>
            )}

            {open &&
              results.map((r) => {
                const isSelected = selectedUrl === r.url
                return (
                  <div key={r.url} className="rounded-lg overflow-hidden" style={{ border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)' }}>
                    <div className="flex items-start gap-3 px-3 py-3" style={{ backgroundColor: isSelected ? 'var(--tint-info)' : 'var(--card)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold mb-0.5 leading-snug" style={{ color: 'var(--primary-text)' }}>
                          {r.title}
                          {r.mocked && <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>· simuliert</span>}
                        </div>
                        <a
                          href={/^https?:\/\//i.test(r.url) ? r.url : `https://${r.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs mb-1.5 flex items-center gap-1 hover:opacity-70 w-fit max-w-full"
                          style={{ color: 'var(--success)', textDecoration: 'none' }}
                        >
                          <span aria-hidden="true">🔗</span>
                          <span className="underline underline-offset-2 truncate">{r.url}</span>
                        </a>
                        {r.fileType && (
                          <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>
                            Dateityp: {r.fileType}
                          </div>
                        )}
                        <div className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                          {r.snippet}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedUrl(isSelected ? null : r.url)
                          setDokumentFehler('')
                          setUebergeben(null)
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
                        <div className="text-xs font-mono font-medium" style={{ color: 'var(--primary-text)' }}>
                          ✦ Dieses Dokument anpassen
                        </div>
                        <div>
                          <div className="text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                            Zielniveaus <span className="font-normal">(mehrere möglich)</span>
                          </div>
                          <LevelPicker
                            size="compact"
                            selected={levels}
                            onToggle={(l) => {
                              setLevels((prev) => toggleKeepOne(prev, l))
                            }}
                          />
                        </div>
                        <div>
                          <div className="text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                            Barrierefreiheits-Format
                          </div>
                          <FormatPicker
                            layout="compact"
                            selected={formats}
                            onToggle={(f) => {
                              setFormats((prev) => toggleKeepOne(prev, f))
                            }}
                          />
                        </div>

                        <VariantSummary levels={levels} formats={formats} />

                        {onAnpassen ? (
                          <GenerateButton
                            running={dokumentLaedt || generierungLaeuft}
                            count={levels.length * formats.length}
                            verb="aus diesem Dokument erstellen"
                            runningText={dokumentLaedt ? 'Dokument wird gelesen…' : 'Varianten werden erstellt…'}
                            onClick={() => void anpassen(r)}
                          />
                        ) : (
                          <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }} role="note">
                            Zum Anpassen bitte oben ein Berufsfeld mit Lehrplan und ein Lernziel wählen.
                          </div>
                        )}
                        {dokumentLaedt && (
                          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }} role="status">
                            Das Dokument wird geladen und gelesen – bei PDFs liest die KI den Text, das dauert etwas.
                          </div>
                        )}
                        {dokumentFehler && (
                          <div className="text-xs px-3 py-2 rounded" role="alert" style={{ backgroundColor: '#FDECEC', color: '#8A1C1C' }}>
                            {dokumentFehler}
                          </div>
                        )}
                        {uebergeben === r.url && !dokumentLaedt && (
                          <div className="text-xs font-mono font-medium" style={{ color: 'var(--success)' }} role="status">
                            ✓ Dokument übernommen – die angepassten Varianten erscheinen unten unter „Erstellte Varianten“.
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
