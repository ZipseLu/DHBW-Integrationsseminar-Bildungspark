import { useState, type FormEvent } from 'react'
import { FormatPicker, LevelPicker, SpracheToggle } from '@/components/Pickers'
import { GenerateButton, VariantSummary } from '@/components/VariantSummary'
import { BERUFSBILDER, LEVEL_STYLES, formatOption } from '@/data/constants'
import { toggleKeepOne, variantenLabel } from '@/lib/selection'
import { useSimulatedTask } from '@/lib/simulation'
import type { Format, Level, Sprache } from '@/types'
import { WebSearchSection } from './WebSearchSection'

const labelClass = 'block text-xs font-mono font-medium mb-1.5'
const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

/** Ergebnis der letzten Generierung – bleibt stehen, auch wenn das Formular danach geaendert wird */
type Generated = { thema: string; berufsbild: string; sprache: Sprache; levels: Level[]; formats: Format[] }

export function KiErstellungPage() {
  const [thema, setThema] = useState('')
  const [erwartungen, setErwartungen] = useState('')
  const [berufsbild, setBerufsbild] = useState(BERUFSBILDER[0])
  const [sprache, setSprache] = useState<Sprache>('Leichte Sprache')
  const [levels, setLevels] = useState<Level[]>(['A'])
  const [formats, setFormats] = useState<Format[]>(['text'])
  const [generated, setGenerated] = useState<Generated | null>(null)

  const task = useSimulatedTask('kiErstellung')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const snapshot: Generated = { thema: thema.trim(), berufsbild, sprache, levels: [...levels], formats: [...formats] }
    setGenerated(null)
    task.start(() => setGenerated(snapshot))
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
          <div>
            <label htmlFor="ki-thema" className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
              THEMA / TITEL
            </label>
            <input
              id="ki-thema"
              type="text"
              placeholder="z.B. Sicherheitsregeln beim Gabelstapler"
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label htmlFor="ki-erwartungen" className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
              ERWARTUNGEN AN DAS ARBEITSBLATT
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
              Je detaillierter die Beschreibung, desto passgenauer das Ergebnis.
            </div>
          </div>

          <WebSearchSection thema={thema} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ki-berufsbild" className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
                BERUFSBILD
              </label>
              <select
                id="ki-berufsbild"
                value={berufsbild}
                onChange={(e) => setBerufsbild(e.target.value)}
                className="w-full px-3 py-2.5 rounded text-sm outline-none"
                style={inputStyle}
              >
                {BERUFSBILDER.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <div className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
                NIVEAUSTUFEN <span className="opacity-60">(mehrere möglich)</span>
              </div>
              <LevelPicker size="compact" selected={levels} onToggle={(l) => setLevels((prev) => toggleKeepOne(prev, l))} />
            </div>
          </div>

          <div>
            <div className={labelClass} style={{ color: 'var(--muted-foreground)' }}>
              SPRACHFORMAT
            </div>
            <SpracheToggle value={sprache} onChange={setSprache} />
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

          <GenerateButton type="submit" running={task.running} count={levels.length * formats.length} verb="generieren" runningText="Wird generiert…" />
        </form>
      </section>

      {generated && <GeneratedVariants result={generated} />}
    </div>
  )
}

function GeneratedVariants({ result }: { result: Generated }) {
  const count = result.levels.length * result.formats.length

  return (
    <section className="rounded-lg overflow-hidden" style={{ border: '1px solid #2A7A4B' }} aria-label="Erstellte Varianten">
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ backgroundColor: '#F0FBF4', borderBottom: '1px solid #C3E6CB' }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: '#1A5C32' }} role="status">
            ✓ {variantenLabel(count)} erstellt
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: '#2A7A4B' }}>
            „{result.thema || 'Neues Arbeitsblatt'}" · {result.berufsbild} · {result.sprache}
          </div>
        </div>
        <button type="button" className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: '#2A7A4B', color: 'white' }}>
          Alle zur Bibliothek hinzufügen
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: '#FFFEF9' }}>
        {result.levels.flatMap((l) =>
          result.formats.map((f) => {
            const s = LEVEL_STYLES[l]
            const opt = formatOption(f)
            return (
              <div key={`${l}-${f}`} className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${s.text}` }}>
                <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: s.bg }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold" style={{ color: s.text }}>
                      {l}
                    </span>
                    <span className="text-xs" style={{ color: s.text }}>
                      {s.label}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: s.text }}>
                    {opt.icon} {opt.label}
                  </span>
                </div>
                <div className="px-3 py-2.5" style={{ backgroundColor: 'var(--card)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    {result.thema || 'Neues Arbeitsblatt'} · {result.sprache}
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" className="flex-1 text-xs py-1 rounded font-medium" style={{ backgroundColor: s.bg, color: s.text }}>
                      👁 Vorschau
                    </button>
                    <button type="button" className="flex-1 text-xs py-1 rounded font-medium" style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      📄 .docx
                    </button>
                  </div>
                </div>
              </div>
            )
          }),
        )}
      </div>
    </section>
  )
}
