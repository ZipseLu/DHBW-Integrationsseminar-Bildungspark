import { useState, type FormEvent } from 'react'
import { FormatPicker, LevelPicker, SpracheToggle } from '@/components/Pickers'
import { GenerateButton, VariantSummary } from '@/components/VariantSummary'
import { BERUFSBILDER, LEVEL_STYLES, formatOption } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import { ApiError, generateArbeitsblatt, lernzielFromWorksheet, type ArbeitsblattResult } from '@/lib/api'
import { toggleKeepOne, variantenLabel } from '@/lib/selection'
import type { Format, Level, Sprache, Worksheet } from '@/types'
import { GeneratedWorksheetCard } from './GeneratedWorksheetCard'
import { WebSearchSection } from './WebSearchSection'

const labelClass = 'block text-xs font-mono font-medium mb-1.5'
const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

/** Eckdaten der letzten Generierung – bleiben stehen, auch wenn das Formular danach geaendert wird */
type Generated = { thema: string; berufsbild: string; sprache: Sprache; lernziel: Worksheet; total: number }

type Progress = { current: number; total: number; label: string }

type GenerationError = { message: string; variant: string; current: number; total: number }

/**
 * KI-Erstellung: Lernziel aus dem Lehrplan waehlen, Stufen und Formate
 * ankreuzen, Backend ruft je Variante Gemini auf (ohne Key: Mock).
 * Die Varianten werden nacheinander erzeugt, weil der Gemini-Free-Tier
 * nur wenige Anfragen pro Minute erlaubt.
 */
export function KiErstellungPage() {
  const [thema, setThema] = useState('')
  const [erwartungen, setErwartungen] = useState('')
  const [berufsbild, setBerufsbild] = useState(BERUFSBILDER[0])
  const [lernzielId, setLernzielId] = useState<number | null>(null)
  const [sprache, setSprache] = useState<Sprache>('Leichte Sprache')
  const [levels, setLevels] = useState<Level[]>(['A'])
  const [formats, setFormats] = useState<Format[]>(['text'])

  const [progress, setProgress] = useState<Progress | null>(null)
  const [results, setResults] = useState<ArbeitsblattResult[]>([])
  const [error, setError] = useState<GenerationError | null>(null)
  const [generated, setGenerated] = useState<Generated | null>(null)

  // Lernziele des gewaehlten Berufsbilds (Katalog aus den Lehrplaenen des Bildungsparks)
  const lernziele = WORKSHEETS.filter((w) => w.berufsbild === berufsbild)
  const lernziel = lernziele.find((w) => w.id === lernzielId) ?? lernziele[0] ?? null
  const running = progress !== null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!lernziel || running) return

    const variants = levels.flatMap((level) => formats.map((format) => ({ level, format })))
    const snapshot: Generated = { thema: thema.trim(), berufsbild, sprache, lernziel, total: variants.length }
    const request = lernzielFromWorksheet(lernziel)
    const trimmedErwartungen = erwartungen.trim()

    setResults([])
    setError(null)
    setGenerated(snapshot)

    for (let index = 0; index < variants.length; index += 1) {
      const { level, format } = variants[index]
      const label = `${level} ${LEVEL_STYLES[level].label} · ${formatOption(format).label}`
      setProgress({ current: index + 1, total: variants.length, label })

      try {
        const result = await generateArbeitsblatt({
          lernziel: request,
          stufe: level,
          format,
          sprache,
          thema: snapshot.thema || undefined,
          erwartungen: trimmedErwartungen || undefined,
        })
        setResults((prev) => [...prev, result])
      } catch (caught) {
        const message = caught instanceof ApiError ? caught.message : 'Unbekannter Fehler bei der Generierung.'
        setError({ message, variant: label, current: index + 1, total: variants.length })
        break
      }
    }

    setProgress(null)
  }

  const trimmedErwartungen = erwartungen.trim()

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 780 }}>
      <section className="rounded-lg p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-lg" style={{ color: 'var(--accent)' }} aria-hidden="true">
            ✦
          </span>
          <h2 className="font-display text-xl font-semibold">Neues Arbeitsblatt mit KI erstellen</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ki-berufsbild" className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
                BERUFSBILD
              </label>
              <select
                id="ki-berufsbild"
                value={berufsbild}
                onChange={(e) => {
                  setBerufsbild(e.target.value)
                  setLernzielId(null)
                }}
                className="w-full px-3 py-2.5 rounded text-sm outline-none"
                style={inputStyle}
              >
                {BERUFSBILDER.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ki-lernziel" className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
                LERNZIEL AUS DEM LEHRPLAN
              </label>
              <select
                id="ki-lernziel"
                value={lernziel?.id ?? ''}
                onChange={(e) => setLernzielId(Number(e.target.value))}
                disabled={lernziele.length === 0}
                className="w-full px-3 py-2.5 rounded text-sm outline-none disabled:opacity-50"
                style={inputStyle}
              >
                {lernziele.length === 0 && <option value="">– keine Lehrpläne hinterlegt –</option>}
                {lernziele.map((w) => (
                  <option key={w.id} value={w.id}>
                    Baustein {w.baustein} · {w.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {lernziel ? (
            <div className="text-xs -mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Lehrplan: {lernziel.ausbildungsbaustein} · Lernziel: {lernziel.abschnitt.titel}
            </div>
          ) : (
            <div className="text-xs -mt-2 px-3 py-2 rounded" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }} role="note">
              Für dieses Berufsfeld sind noch keine Lehrpläne hinterlegt. Bitte ein Berufsfeld mit Lehrplan wählen (Lagerlogistik, Gastronomie oder Metalltechnik).
            </div>
          )}

          <div>
            <label htmlFor="ki-thema" className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
              THEMA / TITEL <span className="opacity-60">(optional)</span>
            </label>
            <input
              id="ki-thema"
              type="text"
              placeholder="z.B. Sicherheitsregeln beim Gabelstapler"
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="ki-erwartungen" className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
              ERWARTUNGEN AN DAS ARBEITSBLATT <span className="opacity-60">(optional)</span>
            </label>
            <textarea
              id="ki-erwartungen"
              placeholder={'Was sollen die Teilnehmer lernen oder üben?\nWelche Schwerpunkte sind wichtig?\nGibt es besondere Anforderungen?'}
              value={erwartungen}
              onChange={(e) => setErwartungen(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded text-sm outline-none resize-none"
              style={{ ...inputStyle, lineHeight: 1.6 }}
            />
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Je detaillierter die Beschreibung, desto passgenauer das Ergebnis. Beides geht als Zusatzwunsch in den Prompt.
            </div>
          </div>

          <WebSearchSection thema={thema} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
                NIVEAUSTUFEN <span className="opacity-60">(mehrere möglich)</span>
              </div>
              <LevelPicker size="compact" selected={levels} onToggle={(l) => setLevels((prev) => toggleKeepOne(prev, l))} />
            </div>
            <div>
              <div className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
                SPRACHFORMAT
              </div>
              <SpracheToggle value={sprache} onChange={setSprache} />
            </div>
          </div>

          <div>
            <div className={`${labelClass} mb-2`} style={{ color: 'var(--muted-foreground)' }}>
              BARRIEREFREIHEITS-FORMATE <span className="opacity-60">(mehrere möglich)</span>
            </div>
            <FormatPicker selected={formats} onToggle={(f) => setFormats((prev) => toggleKeepOne(prev, f))} />
          </div>

          <VariantSummary
            levels={levels}
            formats={formats}
            extras={
              <>
                {' · '}
                <strong style={{ color: 'var(--foreground)' }}>{berufsbild}</strong>
                {' · '}
                <strong style={{ color: 'var(--foreground)' }}>{sprache}</strong>
              </>
            }
          >
            {lernziel && (
              <div style={{ color: 'var(--foreground)' }}>
                Lernziel: <span style={{ color: 'var(--muted-foreground)' }}>{lernziel.title}</span>
              </div>
            )}
            {trimmedErwartungen && (
              <div style={{ color: 'var(--foreground)' }}>
                Erwartungen:{' '}
                <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                  {trimmedErwartungen.slice(0, 80)}
                  {trimmedErwartungen.length > 80 ? '…' : ''}
                </span>
              </div>
            )}
          </VariantSummary>

          {lernziel ? (
            <GenerateButton
              type="submit"
              running={running}
              count={levels.length * formats.length}
              verb="generieren"
              runningText={progress ? `Variante ${progress.current} von ${progress.total} wird erstellt…` : 'Wird generiert…'}
            />
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 px-5 py-3 rounded font-medium text-sm opacity-50 cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              ✦ Generieren nicht möglich – kein Lehrplan für dieses Berufsfeld
            </button>
          )}

          {progress && (
            <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }} role="status">
              Variante {progress.current} von {progress.total} … {progress.label}
            </div>
          )}
        </form>
      </section>

      {generated && <GeneratedVariants generated={generated} results={results} progress={progress} error={error} />}
    </div>
  )
}

type GeneratedVariantsProps = {
  generated: Generated
  results: ArbeitsblattResult[]
  progress: Progress | null
  error: GenerationError | null
}

function GeneratedVariants({ generated, results, progress, error }: GeneratedVariantsProps) {
  const finished = progress === null
  const anyMocked = results.some((r) => r.meta.mocked)

  let status: string
  if (!finished) status = `Variante ${progress.current} von ${progress.total} wird erstellt…`
  else if (results.length === generated.total) status = `✓ ${variantenLabel(results.length)} erstellt`
  else status = `${results.length} von ${generated.total} Varianten erstellt`

  return (
    <section className="rounded-lg overflow-hidden" style={{ border: '1px solid #2A7A4B' }} aria-label="Erstellte Varianten">
      <div className="px-5 py-3.5" style={{ backgroundColor: '#F0FBF4', borderBottom: '1px solid #C3E6CB' }}>
        <div className="text-sm font-semibold" style={{ color: '#1A5C32' }} role="status">
          {status}
        </div>
        <div className="text-xs font-mono mt-0.5" style={{ color: '#2A7A4B' }}>
          „{generated.thema || generated.lernziel.title}" · {generated.berufsbild} · {generated.sprache}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3" style={{ backgroundColor: '#FFFEF9' }}>
        {anyMocked && (
          <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }} role="note">
            ⚠ Kein API-Key – Beispielantwort (Mock). Mit GEMINI_API_KEY in apps/backend/.env antwortet Gemini.
          </div>
        )}

        {error && (
          <div className="text-xs px-3 py-2 rounded flex flex-col gap-1" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }} role="alert">
            <div className="font-semibold">
              ✗ Fehler bei Variante {error.current} von {error.total} ({error.variant})
            </div>
            <div>{error.message}</div>
            {error.current < error.total && <div>Die übrigen Varianten wurden nicht erstellt.</div>}
            <div>Die Eingaben im Formular bleiben erhalten – einfach erneut auf „Generieren" klicken.</div>
          </div>
        )}

        {results.map((result) => (
          <GeneratedWorksheetCard key={`${result.worksheet.stufe}-${result.worksheet.format}`} result={result} />
        ))}
      </div>
    </section>
  )
}
