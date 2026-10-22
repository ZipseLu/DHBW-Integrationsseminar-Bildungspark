import { useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { FieldLabel, FormatPicker, LevelPicker, SpracheToggle } from '@/components/Pickers'
import { CloseButton, SlideOver } from '@/components/SlideOver'
import { GenerateButton, VariantSummary } from '@/components/VariantSummary'
import { LEVELS, LEVEL_STYLES, formatOption } from '@/data/constants'
import { TRANSFORM_PREVIEWS, piktoPreviewFor } from '@/data/previews'
import { toggleKeepOne, variantenLabel } from '@/lib/selection'
import { useSimulatedTask } from '@/lib/simulation'
import type { Format, Level, Sprache } from '@/types'

/** Was das Panel ueber das Ausgangsdokument wissen muss */
export type TransformSource = {
  title: string
  berufsbild: string
  ausbildungsbaustein: string
  baustein?: number
}

type Props = {
  source: TransformSource
  onClose: () => void
}

/** Seitenpanel "KI-Anpassung": erzeugt (simuliert) Varianten nach Niveau × Format */
export function TransformPanel({ source, onClose }: Props) {
  const [levels, setLevels] = useState<Level[]>([...LEVELS])
  const [formats, setFormats] = useState<Format[]>(['text'])
  const [sprache, setSprache] = useState<Sprache>('Leichte Sprache')
  const task = useSimulatedTask('varianten')

  const count = levels.length * formats.length

  return (
    <SlideOver label={`KI-Anpassung ${source.title}`} width={480} onClose={onClose}>
      <div className="px-6 py-5 flex items-start justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: 'var(--accent)' }}>
            ✦ KI-Anpassung
          </div>
          <h2 className="font-display text-lg font-semibold leading-snug" style={{ maxWidth: 360 }}>
            {source.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            {source.baustein !== undefined && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                BS {source.baustein}
              </span>
            )}
            <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
              {source.berufsbild} · Original
            </span>
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">
        <div className="rounded px-3 py-2.5" style={{ backgroundColor: 'var(--muted)' }}>
          <div className="text-xs font-mono mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
            ORIGINAL
          </div>
          <div className="text-sm font-medium">{source.title}</div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {source.berufsbild} · {source.ausbildungsbaustein}
          </div>
        </div>

        <div>
          <FieldLabel hint="mehrere möglich">ZIELNIVEAUS</FieldLabel>
          <LevelPicker
            selected={levels}
            onToggle={(l) => {
              setLevels((prev) => toggleKeepOne(prev, l))
              task.reset()
            }}
          />
          <div className="mt-2 px-3 py-2 rounded text-xs font-mono" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            {levels.length === 1 ? TRANSFORM_PREVIEWS[levels[0]].hinweis : `${levels.length} Niveaus ausgewählt: ${levels.join(', ')}`}
          </div>
        </div>

        <div>
          <FieldLabel hint="mehrere möglich">BARRIEREFREIHEITS-FORMATE</FieldLabel>
          <FormatPicker
            layout="list"
            selected={formats}
            onToggle={(f) => {
              setFormats((prev) => toggleKeepOne(prev, f))
              task.reset()
            }}
          />
        </div>

        <div>
          <FieldLabel>SPRACHFORMAT</FieldLabel>
          <SpracheToggle
            value={sprache}
            onChange={(value) => {
              setSprache(value)
              task.reset()
            }}
          />
        </div>

        <VariantSummary levels={levels} formats={formats} extras={<> · {sprache}</>} />

        {!task.done && <GenerateButton running={task.running} count={count} onClick={() => task.start()} />}

        {task.done && (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-mono font-semibold" style={{ color: '#1A5C32' }} role="status">
              ✓ {variantenLabel(count)} bereit
            </div>
            <div className="flex flex-col gap-2">
              {levels.flatMap((l) =>
                formats.map((f) => {
                  const opt = formatOption(f)
                  const s = LEVEL_STYLES[l]
                  const pikto = f === 'piktogramm' || f === 'piktogramm-mathefrei' ? piktoPreviewFor(source.berufsbild) : null
                  return (
                    <div key={`${l}-${f}`} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: s.bg }}>
                        <LevelBadge level={l} />
                        <span className="text-xs font-medium" style={{ color: s.text }}>
                          {opt.icon} {opt.label}
                        </span>
                        <span className="ml-auto text-xs font-mono" style={{ color: s.text, opacity: 0.7 }}>
                          {sprache}
                        </span>
                      </div>
                      <div className="px-3 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#FFFEF9' }}>
                        {pikto ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xl" aria-hidden="true">
                              {pikto.icon}
                            </span>
                            <span className="text-xs truncate">{pikto.task}</span>
                          </div>
                        ) : (
                          <span className="text-xs truncate flex-1" style={{ color: 'var(--muted-foreground)' }}>
                            {TRANSFORM_PREVIEWS[l].aufgaben[0]}
                          </span>
                        )}
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button type="button" className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: s.bg, color: s.text }}>
                            Öffnen
                          </button>
                          <button type="button" className="text-xs px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }),
              )}
            </div>
            <button
              type="button"
              className="w-full text-xs py-2.5 rounded font-medium"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Alle zur Bibliothek hinzufügen
            </button>
            <button type="button" onClick={task.reset} className="text-xs text-center hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>
              Andere Einstellungen wählen
            </button>
          </div>
        )}
      </div>
    </SlideOver>
  )
}
