import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { FieldLabel, FormatPicker, LevelPicker, SpracheToggle } from '@/components/Pickers'
import { GenerateButton, Spinner, VariantSummary } from '@/components/VariantSummary'
import { BERUFSBILD_LAGER, LEVELS, LEVEL_STYLES, formatOption } from '@/data/constants'
import { todayIso } from '@/lib/date'
import { toggleKeepOne } from '@/lib/selection'
import { useSimulatedTask } from '@/lib/simulation'
import type { Format, Level, SavedDocument, Sprache } from '@/types'

type UploadedFile = { name: string; size: string; pages: number }
type Analysis = { thema: string; berufsbild: string; level: Level }

const MAX_FILE_BYTES = 20 * 1024 * 1024
const ACCEPTED = '.pdf,.doc,.docx,.txt,.png,.jpg'

function formatSize(bytes: number): string {
  const kb = bytes / 1024
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
}

type Props = {
  savedBy: string
  onSave: (doc: SavedDocument) => void
}

/** "Vorhandenes Arbeitsblatt hochladen & anpassen" – Analyse und Varianten sind simuliert */
export function UploadSection({ savedBy, onSave }: Props) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [levels, setLevels] = useState<Level[]>([...LEVELS])
  const [formats, setFormats] = useState<Format[]>(['text'])
  const [sprache, setSprache] = useState<Sprache>('Leichte Sprache')

  const analyse = useSimulatedTask('uploadAnalyse')
  const transform = useSimulatedTask('varianten')
  const optionsRef = useRef<HTMLDivElement>(null)

  function reset() {
    setFile(null)
    setAnalysis(null)
    analyse.reset()
    transform.reset()
  }

  function startUpload(selected: File) {
    if (selected.size > MAX_FILE_BYTES) {
      setError('Die Datei ist größer als 20 MB.')
      return
    }
    setError('')
    // Seitenzahl ist im Prototyp nur ein Schaetzwert
    setFile({ name: selected.name, size: formatSize(selected.size), pages: Math.floor(Math.random() * 4) + 1 })
    setAnalysis(null)
    setLevels([...LEVELS])
    setFormats(['text'])
    transform.reset()
    // Simulierte Analyse: Thema aus dem Dateinamen, Berufsfeld und Stufe fest vorgegeben
    analyse.start(() => {
      setAnalysis({
        thema: selected.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        berufsbild: BERUFSBILD_LAGER,
        level: 'F',
      })
    })
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) startUpload(dropped)
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (selected) startUpload(selected)
    event.target.value = ''
  }

  function handleSaveDirectly() {
    if (!file || !analysis) return
    onSave({
      id: `doc-${Date.now()}`,
      name: file.name,
      size: file.size,
      pages: file.pages,
      savedAt: todayIso(),
      savedBy,
      berufsbild: analysis.berufsbild,
      thema: analysis.thema,
    })
    reset()
  }

  const toggleLevel = (l: Level) => {
    setLevels((prev) => toggleKeepOne(prev, l))
    transform.reset()
  }
  const toggleFormat = (f: Format) => {
    setFormats((prev) => toggleKeepOne(prev, f))
    transform.reset()
  }

  return (
    <section className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
      <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--accent)' }} aria-hidden="true">
          ↑
        </span>
        <h2 className="font-display text-base font-semibold">Vorhandenes Arbeitsblatt hochladen & anpassen</h2>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {!file && (
          <label
            className="flex flex-col items-center justify-center gap-3 rounded-lg cursor-pointer transition-all select-none"
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: dragging ? '#FEF3EC' : 'var(--background)',
              padding: '2.5rem 1rem',
              minHeight: 140,
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept={ACCEPTED} className="sr-only" onChange={handleInput} aria-label="Arbeitsblatt hochladen" />
            <div className="text-3xl" aria-hidden="true">
              📄
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Datei hierher ziehen oder klicken</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                PDF, Word, Text oder Bild · max. 20 MB
              </div>
            </div>
            <div className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
              Datei auswählen
            </div>
          </label>
        )}

        {error && (
          <div role="alert" className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF2F2', color: '#E53E3E', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        {file && analyse.running && (
          <div className="rounded-lg p-4 flex items-center gap-4" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
            <div className="text-2xl" aria-hidden="true">
              📄
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{file.name}</div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {file.size} · {file.pages} Seiten
              </div>
              <div className="flex items-center gap-2 mt-2" role="status">
                <Spinner className="text-sm" />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  KI analysiert Inhalt, Thema und Niveaustufe…
                </span>
              </div>
            </div>
          </div>
        )}

        {file && analysis && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg p-4 flex items-start gap-4" style={{ border: '1px solid #2A7A4B', backgroundColor: '#F0FBF4' }}>
              <div className="text-2xl mt-0.5" aria-hidden="true">
                📄
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: '#1A5C32' }}>
                    {file.name}
                  </span>
                  <LevelBadge level={analysis.level} />
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#C3E6CB', color: '#1A5C32' }}>
                    erkannt
                  </span>
                </div>
                <div className="text-xs font-mono mt-1" style={{ color: '#2A7A4B' }}>
                  Thema: <strong>{analysis.thema}</strong> · Berufsbild: <strong>{analysis.berufsbild}</strong> · {file.size} · {file.pages} S.
                </div>
              </div>
              <button type="button" onClick={reset} aria-label="Datei verwerfen" className="text-xs hover:opacity-60" style={{ color: '#2A7A4B' }}>
                ✕
              </button>
            </div>

            {!transform.done && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSaveDirectly}
                  className="flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg text-left transition-all hover:opacity-90"
                  style={{ border: '1.5px solid var(--primary)', backgroundColor: 'var(--background)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">
                      💾
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                      Direkt speichern
                    </span>
                  </div>
                  <span className="text-xs leading-snug" style={{ color: 'var(--muted-foreground)' }}>
                    Dokument unverändert in die Bibliothek übernehmen
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => optionsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}
                  className="flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg text-left transition-all hover:opacity-90"
                  style={{ border: '1.5px solid var(--accent)', backgroundColor: 'var(--background)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">
                      ✦
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                      KI anpassen
                    </span>
                  </div>
                  <span className="text-xs leading-snug" style={{ color: 'var(--muted-foreground)' }}>
                    Auf Niveaustufen und Barrierefreiheiten herunterbrechen
                  </span>
                </button>
              </div>
            )}

            <div ref={optionsRef}>
              <FieldLabel hint="mehrere möglich">ZIELNIVEAUS</FieldLabel>
              <LevelPicker selected={levels} onToggle={toggleLevel} />
            </div>

            <div>
              <FieldLabel hint="mehrere möglich">BARRIEREFREIHEITS-FORMATE</FieldLabel>
              <FormatPicker selected={formats} onToggle={toggleFormat} />
            </div>

            <div>
              <FieldLabel>SPRACHFORMAT</FieldLabel>
              <SpracheToggle
                value={sprache}
                onChange={(value) => {
                  setSprache(value)
                  transform.reset()
                }}
              />
            </div>

            <VariantSummary levels={levels} formats={formats} extras={<> · {sprache}</>} />

            {!transform.done && <GenerateButton running={transform.running} count={levels.length * formats.length} onClick={() => transform.start()} />}

            {transform.done && (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-mono font-medium" style={{ color: '#1A5C32' }} role="status">
                  ✓ Alle Varianten bereit
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {levels.flatMap((l) =>
                    formats.map((f) => {
                      const opt = formatOption(f)
                      const s = LEVEL_STYLES[l]
                      return (
                        <div
                          key={`${l}-${f}`}
                          className="rounded-lg p-3 flex items-center gap-3"
                          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <LevelBadge level={l} />
                              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                {opt.icon} {opt.label}
                              </span>
                            </div>
                            <div className="text-xs font-mono truncate" style={{ color: 'var(--muted-foreground)' }}>
                              {analysis.thema} · {sprache}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button type="button" className="text-xs px-2 py-1 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
                              Öffnen
                            </button>
                            <button type="button" className="text-xs px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                              PDF
                            </button>
                          </div>
                        </div>
                      )
                    }),
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 text-xs py-2 rounded font-medium"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    Alle speichern & zur Bibliothek hinzufügen
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs px-4 py-2 rounded font-medium"
                    style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                  >
                    Neue Datei
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
