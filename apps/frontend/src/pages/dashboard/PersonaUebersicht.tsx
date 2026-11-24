import { useState } from 'react'
import { FORMAT_BADGE_COLORS, FORMAT_BEDARF, FORMAT_OPTIONS, LEVELS, LEVEL_STYLES, PERSONA_MAP } from '@/data/constants'
import { teilnehmendeJePersona } from '@/lib/participants'
import type { Level, Participant } from '@/types'

const anzahlText = (n: number) => `${n} Teilnehmende`

/**
 * FE-43: persona overview on the dashboard. Every combination of level (T/A/F/B) and
 * accessibility format is one persona A–P. Each level opens to its four personas with
 * what they need; the numbers show how many participants currently work like this in
 * their active area. Only counts – no names (§ 60 SGB IX).
 */
export function PersonaUebersicht({ participants }: { participants: readonly Participant[] }) {
  const [offen, setOffen] = useState<Set<Level>>(new Set())
  const anzahl = teilnehmendeJePersona(participants)

  const umschalten = (level: Level) =>
    setOffen((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })

  return (
    <section className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Personas">
      <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="font-display text-lg font-semibold">Personas A–P</h2>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Jede Kombination aus Niveaustufe und Barrierefreiheits-Format ist eine Persona · Zahlen nach aktivem Bereich, ohne Namen (§ 60 SGB IX)
          </div>
        </div>
      </div>

      <div className="flex flex-col p-4 gap-2">
        {LEVELS.map((level) => {
          const s = LEVEL_STYLES[level]
          const istOffen = offen.has(level)
          const buchstaben = FORMAT_OPTIONS.map((f) => PERSONA_MAP[level][f.id])
          const summe = buchstaben.reduce((n, b) => n + (anzahl[b] ?? 0), 0)
          return (
            <div key={level} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${istOffen ? s.text : 'var(--border)'}` }}>
              <button
                type="button"
                aria-expanded={istOffen}
                aria-controls={`personas-${level}`}
                onClick={() => umschalten(level)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-90"
                style={{ backgroundColor: istOffen ? s.bg : 'var(--muted)' }}
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: s.text, color: 'white' }}>
                  {level}
                </span>
                <span className="text-sm font-semibold w-28 flex-shrink-0" style={{ color: istOffen ? s.text : 'var(--foreground)' }}>
                  {s.label}
                </span>
                <span className="text-xs leading-snug flex-1" style={{ color: istOffen ? s.text : 'var(--muted-foreground)' }}>
                  {s.beschreibung}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.bg, color: s.text }}>
                  Personas {buchstaben[0]}–{buchstaben[buchstaben.length - 1]} · {anzahlText(summe)}
                </span>
                <span
                  aria-hidden="true"
                  className="text-xs flex-shrink-0"
                  style={{ display: 'inline-block', transform: istOffen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: istOffen ? s.text : 'var(--foreground)' }}
                >
                  ▾
                </span>
              </button>

              {istOffen && (
                <ul id={`personas-${level}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3" style={{ borderTop: `1px solid ${s.text}20` }} aria-label={`Personas der Stufe ${level}`}>
                  {FORMAT_OPTIONS.map((fmt) => {
                    const buchstabe = PERSONA_MAP[level][fmt.id]
                    const fc = FORMAT_BADGE_COLORS[fmt.id]
                    const n = anzahl[buchstabe] ?? 0
                    return (
                      <li key={fmt.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }} aria-label={`Persona ${buchstabe}`}>
                        <div className="px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: 'var(--muted)' }}>
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ backgroundColor: s.bg, color: s.text, border: `1.5px solid ${s.text}` }}
                            aria-hidden="true"
                          >
                            {buchstabe}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">Persona {buchstabe}</div>
                            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {level} – {s.label} · {fmt.icon} {fmt.label}
                            </div>
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                            style={n > 0 ? { backgroundColor: s.text, color: 'white' } : { backgroundColor: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                          >
                            {n > 0 ? anzahlText(n) : 'niemand'}
                          </span>
                        </div>
                        <div className="px-3 py-2.5 flex flex-col gap-1.5">
                          <Bedarf zeichen="N" titel="Niveaustufe" bg={s.bg} color={s.text} text={s.beschreibung} />
                          <Bedarf zeichen="B" titel="Barrierefreiheitsbedarf" bg={fc.bg} color={fc.color} text={FORMAT_BEDARF[fmt.id]} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
        <div className="rounded px-4 py-3 text-xs" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          <strong style={{ color: 'var(--foreground)' }}>N</strong> = Niveaustufe · <strong style={{ color: 'var(--foreground)' }}>B</strong> = Barrierefreiheitsbedarf ·
          Die Persona einer Person ergibt sich aus Stufe und Format ihres aktiven Bereichs im Lernweg.
        </div>
      </div>
    </section>
  )
}

function Bedarf({ zeichen, titel, bg, color, text }: { zeichen: string; titel: string; bg: string; color: string; text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-snug">
      <span className="w-5 h-5 rounded flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: bg, color }} title={titel} aria-label={titel}>
        {zeichen}
      </span>
      <span>{text}</span>
    </div>
  )
}
