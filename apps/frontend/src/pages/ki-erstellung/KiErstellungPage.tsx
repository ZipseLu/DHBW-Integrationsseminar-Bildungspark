import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CloseButton, SlideOver } from '@/components/SlideOver'
import { FormatPicker, LevelPicker, SpracheToggle } from '@/components/Pickers'
import { GenerateButton, VariantSummary } from '@/components/VariantSummary'
import { BERUFSBILDER, LEVEL_STYLES, formatOption } from '@/data/constants'
import { TRANSFORM_PREVIEWS } from '@/data/previews'
import { CURRENT_USER } from '@/data/users'
import { WORKSHEETS } from '@/data/worksheets'
import {
  ApiError,
  fetchLehrplaene,
  generateArbeitsblatt,
  lernzielFromWorksheet,
  saveArbeitsblatt,
  type ArbeitsblattResult,
  type LernzielInput,
} from '@/lib/api'
import type { KiVorauswahl } from '@/lib/lehrplaene'
import { toggleKeepOne, variantenLabel } from '@/lib/selection'
import type { Format, Level, Sprache } from '@/types'
import { GeneratedWorksheetCard, type SpeicherZustand } from './GeneratedWorksheetCard'
import { WebSearchSection } from './WebSearchSection'

const labelClass = 'block text-xs font-mono font-medium mb-1.5'
const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

/** Ein waehlbares Lernziel: aus dem Lehrplan-Import oder aus den lokalen Beispieldaten */
type LernzielOption = LernzielInput & { key: string; kurztitel: string }

const kurz = (text: string, max = 70) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** Fallback ohne Import: die 12 Beispiel-Lernziele aus den Lehrplaenen */
const LOKALE_LERNZIELE: LernzielOption[] = WORKSHEETS.map((w) => ({ ...lernzielFromWorksheet(w), key: `lokal-${w.id}`, kurztitel: w.title }))

/** Eckdaten der letzten Generierung – bleiben stehen, auch wenn das Formular danach geaendert wird */
type Generated = { nr: number; thema: string; berufsbild: string; sprache: Sprache; lernziel: LernzielOption; total: number }

type Progress = { current: number; total: number; label: string }

type GenerationError = { message: string; variant: string; current: number; total: number }

/**
 * KI-Erstellung: Lernziel aus dem Lehrplan waehlen, Stufen und Formate
 * ankreuzen, Backend ruft je Variante Gemini auf (ohne Key: Mock).
 * Die Varianten werden nacheinander erzeugt, weil der Gemini-Free-Tier
 * nur wenige Anfragen pro Minute erlaubt.
 */
/** vorauswahl: Lernziel, das auf der Seite Lehrpläne mit "Arbeitsblatt daraus erstellen" gewählt wurde */
export function KiErstellungPage({ vorauswahl = null }: { vorauswahl?: KiVorauswahl | null } = {}) {
  const [thema, setThema] = useState('')
  const [erwartungen, setErwartungen] = useState('')
  const [berufsbild, setBerufsbild] = useState(vorauswahl?.berufsfeld ?? BERUFSBILDER[0])
  const [lernzielKey, setLernzielKey] = useState<string | null>(null)
  const [katalog, setKatalog] = useState<LernzielOption[]>(LOKALE_LERNZIELE)
  const [katalogQuelle, setKatalogQuelle] = useState<'beispiele' | 'import'>('beispiele')
  const [sprache, setSprache] = useState<Sprache>('Leichte Sprache')
  const [levels, setLevels] = useState<Level[]>(['A'])
  const [formats, setFormats] = useState<Format[]>(['text'])

  const [progress, setProgress] = useState<Progress | null>(null)
  const [results, setResults] = useState<ArbeitsblattResult[]>([])
  const [error, setError] = useState<GenerationError | null>(null)
  const [generated, setGenerated] = useState<Generated | null>(null)

  // Importierte Lehrplaene laden (GET /api/lehrplaene); ohne Import bleiben die Beispiel-Lernziele
  useEffect(() => {
    let active = true
    fetchLehrplaene()
      .then((liste) => {
        if (!active || liste.length === 0) return
        setKatalog(liste.map((l) => ({ ...l, key: `lehrplan-${l.id}`, kurztitel: kurz(l.titel) })))
        setKatalogQuelle('import')
      })
      .catch(() => {
        // Backend nicht erreichbar oder Fehler -> Beispiel-Lernziele bleiben
      })
    return () => {
      active = false
    }
  }, [])

  // Lernziele des gewaehlten Berufsbilds
  const lernziele = katalog.filter((l) => l.berufsfeld === berufsbild)
  // Ohne eigene Auswahl: Vorauswahl aus den Lehrplaenen (gleiches Lernziel, sonst gleicher Baustein)
  const vorausgewaehlt =
    vorauswahl && vorauswahl.berufsfeld === berufsbild
      ? (lernziele.find((l) => l.baustein === vorauswahl.baustein && l.titel === vorauswahl.titel) ?? lernziele.find((l) => l.baustein === vorauswahl.baustein))
      : undefined
  const lernziel = lernziele.find((l) => l.key === lernzielKey) ?? vorausgewaehlt ?? lernziele[0] ?? null
  const running = progress !== null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!lernziel || running) return

    const variants = levels.flatMap((level) => formats.map((format) => ({ level, format })))
    const snapshot: Generated = { nr: (generated?.nr ?? 0) + 1, thema: thema.trim(), berufsbild, sprache, lernziel, total: variants.length }
    const { key: _key, kurztitel: _kurztitel, ...request } = lernziel
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
    <div className="flex flex-col gap-6">
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
                  setLernzielKey(null)
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
                value={lernziel?.key ?? ''}
                onChange={(e) => setLernzielKey(e.target.value)}
                disabled={lernziele.length === 0}
                className="w-full px-3 py-2.5 rounded text-sm outline-none disabled:opacity-50"
                style={inputStyle}
              >
                {lernziele.length === 0 && <option value="">– keine Lehrpläne hinterlegt –</option>}
                {lernziele.map((l) => (
                  <option key={l.key} value={l.key}>
                    Baustein {l.baustein} · {l.kurztitel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {lernziel ? (
            <div className="text-xs -mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Lehrplan: {lernziel.ausbildungsbaustein} · Lernziel: {lernziel.titel}
              <span className="opacity-70">
                {' '}
                · Quelle: {katalogQuelle === 'import' ? `${katalog.length} importierte Lernziele` : `${katalog.length} Beispiel-Lernziele (Import mit npm run import:lehrplaene)`}
              </span>
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
                Lernziel: <span style={{ color: 'var(--muted-foreground)' }}>{lernziel.kurztitel}</span>
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

      {generated && (
        <GeneratedVariants key={generated.nr} generated={generated} results={results} progress={progress} error={error} erstelltVon={CURRENT_USER.name} />
      )}
    </div>
  )
}

type PreviewTarget = { level: Level; format: Format }

type GeneratedVariantsProps = {
  generated: Generated
  results: ArbeitsblattResult[]
  progress: Progress | null
  error: GenerationError | null
  /** Name der angemeldeten Person – steht als Ersteller im Verlauf */
  erstelltVon: string
}

const fehlerText = (caught: unknown) => (caught instanceof ApiError ? caught.message : 'Unbekannter Fehler beim Speichern.')

function GeneratedVariants({ generated, results, progress, error, erstelltVon }: GeneratedVariantsProps) {
  const finished = progress === null
  const anyMocked = results.some((r) => r.meta.mocked)
  const stufen = [...new Set(results.map((r) => r.worksheet.stufe))]
  const [preview, setPreview] = useState<PreviewTarget | null>(null)

  // FE-02: Speicherstand je Variante (Index in `results`). Die Ref spiegelt den State,
  // damit „Alle speichern" beim Durchlaufen immer den aktuellen Stand sieht.
  const [speicher, setSpeicher] = useState<Record<number, SpeicherZustand>>({})
  const speicherRef = useRef<Record<number, SpeicherZustand>>({})
  // Varianten einer Generierung gehören zusammen: das erste gespeicherte Blatt ist das Eltern-Blatt
  const elternIdRef = useRef<string | null>(null)
  const [alleLaeuft, setAlleLaeuft] = useState(false)

  function setZustand(index: number, zustand: SpeicherZustand) {
    speicherRef.current = { ...speicherRef.current, [index]: zustand }
    setSpeicher(speicherRef.current)
  }

  async function speichern(index: number): Promise<boolean> {
    const aktuell = speicherRef.current[index]
    if (aktuell?.art === 'gespeichert') return true
    if (aktuell?.art === 'speichert') return false
    const result = results[index]
    setZustand(index, { art: 'speichert' })
    try {
      const blatt = await saveArbeitsblatt({
        worksheet: result.worksheet,
        meta: result.meta,
        erstelltVon,
        elternId: elternIdRef.current,
        notiz: generated.thema ? `KI-Erstellung: ${generated.thema}` : 'KI-Erstellung',
      })
      elternIdRef.current ??= blatt.id
      setZustand(index, { art: 'gespeichert', id: blatt.id })
      return true
    } catch (caught) {
      setZustand(index, { art: 'fehler', text: fehlerText(caught) })
      return false
    }
  }

  async function alleSpeichern() {
    setAlleLaeuft(true)
    // Nacheinander, damit das erste Blatt Eltern-Blatt der übrigen wird
    for (let index = 0; index < results.length; index += 1) {
      await speichern(index)
    }
    setAlleLaeuft(false)
  }

  const anzahlGespeichert = results.filter((_, index) => speicher[index]?.art === 'gespeichert').length
  const alleGespeichert = results.length > 0 && anzahlGespeichert === results.length

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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs font-mono mt-0.5" style={{ color: '#2A7A4B' }}>
            „{generated.thema || generated.lernziel.kurztitel}" · {generated.berufsbild} · {generated.sprache}
          </div>
          {finished && results.length > 0 && (
            <div className="flex items-center gap-2">
              {anzahlGespeichert > 0 && !alleGespeichert && (
                <span className="text-xs font-mono" style={{ color: '#2A7A4B' }}>
                  {anzahlGespeichert} von {results.length} gespeichert
                </span>
              )}
              <button
                type="button"
                onClick={() => void alleSpeichern()}
                disabled={alleGespeichert || alleLaeuft}
                className="text-xs px-3 py-1.5 rounded font-medium disabled:opacity-70"
                style={{ backgroundColor: '#1A5C32', color: '#FFFFFF' }}
              >
                {alleGespeichert ? '✓ Alle in der Bibliothek' : alleLaeuft ? 'Wird gespeichert…' : '💾 Alle zur Bibliothek hinzufügen'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5" style={{ backgroundColor: '#FFFEF9' }}>
        {anyMocked && (
          <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }} role="note">
            ⚠ Kein API-Key – Beispielantwort (Mock). Mit GEMINI_API_KEY in der .env (Repo-Root) antwortet Gemini.
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

        {stufen.map((stufe) => {
          const s = LEVEL_STYLES[stufe]
          return (
            <div key={stufe} className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2 pb-1" style={{ borderBottom: `1.5px solid ${s.text}` }}>
                <span className="text-sm font-mono font-bold" style={{ color: s.text }}>
                  {stufe}
                </span>
                <span className="text-xs font-medium" style={{ color: s.text }}>
                  {s.label}
                </span>
              </div>
              {results
                .map((result, index) => ({ result, index }))
                .filter(({ result }) => result.worksheet.stufe === stufe)
                .map(({ result, index }) => (
                  <GeneratedWorksheetCard
                    key={index}
                    result={result}
                    onVorschau={() => setPreview({ level: result.worksheet.stufe, format: result.worksheet.format })}
                    speicherZustand={speicher[index] ?? { art: 'offen' }}
                    onSpeichern={finished ? () => void speichern(index) : undefined}
                  />
                ))}
            </div>
          )
        })}
      </div>

      {preview && <VariantPreview generated={generated} target={preview} onClose={() => setPreview(null)} />}
    </section>
  )
}

function VariantPreview({ generated, target, onClose }: { generated: Generated; target: PreviewTarget; onClose: () => void }) {
  const s = LEVEL_STYLES[target.level]
  const opt = formatOption(target.format)
  const hinweise = TRANSFORM_PREVIEWS[target.level]

  return (
    <SlideOver label={`Vorschau ${generated.thema || 'Neues Arbeitsblatt'}`} width={480} onClose={onClose}>
      <div className="px-6 py-5 flex items-start justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: s.text }}>
            {target.level} · {s.label} · {opt.icon} {opt.label}
          </div>
          <h2 className="font-display text-lg font-semibold leading-snug">{generated.thema || 'Neues Arbeitsblatt'}</h2>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {generated.berufsbild} · {generated.sprache}
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">
        <div className="rounded px-3 py-2.5 text-sm leading-snug" style={{ backgroundColor: s.bg, color: s.text }}>
          {hinweise.hinweis}
        </div>
        <div>
          <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
            BEISPIELAUFGABEN
          </div>
          <ol className="flex flex-col gap-2 pl-5 text-sm list-decimal">
            {hinweise.aufgaben.map((aufgabe) => (
              <li key={aufgabe}>{aufgabe}</li>
            ))}
          </ol>
        </div>
      </div>
    </SlideOver>
  )
}
