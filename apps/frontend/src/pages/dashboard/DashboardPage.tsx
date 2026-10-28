import { useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { StatCard } from '@/components/Widgets'
import { FORMAT_BADGE_COLORS, FORMAT_OPTIONS, LEVELS, LEVEL_STYLES, PERSONA_MAP } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import type { Level, NavItem, Participant } from '@/types'

/** Kurzbeschreibung des Bedarfs je Barrierefreiheits-Format (Persona-Karten) */
const FORMAT_NEEDS: Record<string, string> = {
  text: 'Liest selbstständig – keine zusätzlichen Symbole oder Anpassungen nötig.',
  piktogramm: 'Versteht Aufgaben besser durch Bilder und Symbole statt reinem Text.',
  mathefrei: 'Hat Schwierigkeiten mit Zahlen – Rechenaufgaben werden qualitativ ersetzt.',
  'piktogramm-mathefrei': 'Kombinierter Bedarf: Symbole und keine Rechenschritte für maximale Barrierefreiheit.',
}

type Props = {
  participants: readonly Participant[]
  onNavigate: (item: NavItem) => void
}

export function DashboardPage({ participants, onNavigate }: Props) {
  const [openLevels, setOpenLevels] = useState<Set<Level>>(new Set())

  const berufsfelder = new Set(WORKSHEETS.map((w) => w.berufsbild)).size
  const aiCount = WORKSHEETS.filter((w) => w.aiGenerated).length
  const recent = [...WORKSHEETS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  function toggleLevel(level: Level) {
    setOpenLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Arbeitsblätter gesamt" value={WORKSHEETS.length} sub={`${berufsfelder} Berufsfelder`} accent />
        <StatCard label="KI-generiert" value={aiCount} sub={`von insgesamt ${WORKSHEETS.length}`} />
        <StatCard label="Aktive Teilnehmende" value={participants.length} sub="anonymisiert" />
      </div>

      <section className="rounded-lg p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Niveaustufen-Verteilung">
        <h2 className="font-display text-lg font-semibold mb-4">Niveaustufen-Verteilung</h2>
        <div className="flex gap-6">
          {LEVELS.map((level) => {
            const count = WORKSHEETS.filter((w) => Boolean(w.abschnitt.niveaus[level]?.kompetenz)).length
            const pct = WORKSHEETS.length === 0 ? 0 : Math.round((count / WORKSHEETS.length) * 100)
            const s = LEVEL_STYLES[level]
            return (
              <div key={level} className="flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <LevelBadge level={level} />
                  <span className="text-sm font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {count} AB
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--muted)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: s.text }} />
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Anonyme Teilnehmende">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-display text-lg font-semibold">Anonyme Teilnehmende</h2>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Aufgeteilt nach Niveaustufe und Barrierefreiheitsbedarf · § 60 SGB IX
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('teilnehmer')} className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--accent)' }}>
            Alle Teilnehmenden →
          </button>
        </div>

        <div className="flex flex-col p-4 gap-2">
          {LEVELS.map((level) => {
            const s = LEVEL_STYLES[level]
            const isOpen = openLevels.has(level)
            const letters = FORMAT_OPTIONS.map((f) => PERSONA_MAP[level][f.id])
            return (
              <div key={level} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isOpen ? s.text : 'var(--border)'}` }}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleLevel(level)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-90"
                  style={{ backgroundColor: isOpen ? s.bg : 'var(--muted)' }}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-mono font-bold flex-shrink-0"
                      style={{ backgroundColor: s.text, color: 'white' }}
                    >
                      {level}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: s.text }}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs leading-snug flex-1" style={{ color: 'var(--muted-foreground)' }}>
                    {s.beschreibung}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
                      Personas {letters[0]}–{letters[letters.length - 1]}
                    </span>
                    <span
                      className="text-xs font-mono"
                      aria-hidden="true"
                      style={{ color: s.text, display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    >
                      ▾
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-2 gap-2 p-3" style={{ borderTop: `1px solid ${s.text}20` }}>
                    {FORMAT_OPTIONS.map((fmt) => {
                      const letter = PERSONA_MAP[level][fmt.id]
                      const fc = FORMAT_BADGE_COLORS[fmt.id]
                      return (
                        <div key={fmt.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                          <div className="px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: 'var(--muted)' }}>
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: s.bg, color: s.text, border: `1.5px solid ${s.text}` }}
                            >
                              {letter}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold">Persona {letter}</div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <span className="text-xs font-mono font-bold" style={{ color: s.text }}>
                                  {level} – {s.label}
                                </span>
                                <span style={{ color: 'var(--border)' }}>·</span>
                                <span className="text-xs font-mono" style={{ color: fc.color }}>
                                  {fmt.icon} {fmt.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="px-3 py-2.5 flex flex-col gap-1.5">
                            <NeedLine marker="N" bg={s.bg} color={s.text} text={s.beschreibung} />
                            <NeedLine marker="B" bg={fc.bg} color={fc.color} text={FORMAT_NEEDS[fmt.id]} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          <div className="rounded px-4 py-3 text-xs" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            <strong style={{ color: 'var(--foreground)' }}>N</strong> = Niveaustufe · <strong style={{ color: 'var(--foreground)' }}>B</strong> = Barrierefreiheitsbedarf · Alle
            Personas sind anonymisiert nach § 60 SGB IX.
          </div>
        </div>
      </section>

      <section className="rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Zuletzt bearbeitet">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display text-lg font-semibold">Zuletzt bearbeitet</h2>
          <button type="button" className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--accent)' }} onClick={() => onNavigate('arbeitsblaetter')}>
            Alle anzeigen →
          </button>
        </div>
        <ul>
          {recent.map((w, i) => (
            <li key={w.id} style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <button
                type="button"
                onClick={() => onNavigate('arbeitsblaetter')}
                className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:opacity-80 transition-opacity"
              >
                <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  BS {w.baustein}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{w.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {w.ausbildungsbaustein} · {w.berufsbild}
                  </div>
                </div>
                {w.aiGenerated && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}>
                    KI
                  </span>
                )}
                <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  {w.date}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function NeedLine({ marker, bg, color, text }: { marker: string; bg: string; color: string; text: string }) {
  return (
    <div className="flex gap-1.5 items-start">
      <span
        className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold mt-0.5"
        style={{ backgroundColor: bg, color, fontSize: 7 }}
        aria-hidden="true"
      >
        {marker}
      </span>
      <p className="text-xs leading-snug" style={{ color: 'var(--foreground)' }}>
        {text}
      </p>
    </div>
  )
}
