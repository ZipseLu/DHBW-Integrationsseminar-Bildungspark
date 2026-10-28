import { useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { ProgressBar } from '@/components/Widgets'
import { LEVEL_STYLES, PERSONA_MAP, formatOption } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import { activeStation, doneCount, worksheetsFor } from '@/lib/participants'
import type { BerufStation, Participant } from '@/types'

const DONE_BG = '#D4EDDA'
const DONE_TEXT = '#1A5C32'
const DONE_STRONG = '#2A7A4B'

type Props = {
  participant: Participant
  expanded: boolean
  onToggleExpand: () => void
  onAssign: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ParticipantCard({ participant: p, expanded, onToggleExpand, onAssign, onEdit, onDelete }: Props) {
  const [listCollapsed, setListCollapsed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const active = activeStation(p)
  const finished = p.berufsbilder.filter((b) => b.status === 'abgeschlossen').length

  return (
    <article
      className="rounded-lg overflow-hidden"
      aria-label={`Teilnehmer ${p.id}`}
      style={{ border: expanded ? '1.5px solid var(--primary)' : '1px solid var(--border)', backgroundColor: 'var(--card)' }}
    >
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-medium">{p.id}</span>
            <LevelBadge level={p.level} />
            <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
              zuletzt aktiv {p.lastActive}
            </span>
          </div>
          {active && (
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Aktuell: <strong style={{ color: 'var(--foreground)' }}>{active.berufsbild}</strong>
              <span className="ml-2">{doneCount(active, WORKSHEETS)} Arbeitsblätter erledigt</span>
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-1.5" aria-label="Lernweg">
          {p.berufsbilder.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <StationChip station={b} />
              {i < p.berufsbilder.length - 1 && (
                <span className="text-xs" style={{ color: 'var(--border)' }} aria-hidden="true">
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono text-right" style={{ color: 'var(--muted-foreground)' }}>
            {finished} von {p.berufsbilder.length}
          </span>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggleExpand}
            className="text-xs px-3 py-1.5 rounded font-medium transition-all"
            style={{ backgroundColor: expanded ? 'var(--primary)' : 'var(--muted)', color: expanded ? 'var(--primary-foreground)' : 'var(--foreground)' }}
          >
            {expanded ? 'Schließen' : 'Details'}
          </button>
        </div>
      </div>

      <div style={{ height: 3, backgroundColor: 'var(--muted)' }}>
        <div style={{ height: 3, width: `${p.progress}%`, backgroundColor: p.progress === 100 ? DONE_STRONG : 'var(--primary)', transition: 'width 0.3s' }} />
      </div>

      {active && worksheetsFor(WORKSHEETS, active.berufsbild).length > 0 && (
        <ActiveWorksheets station={active} collapsed={listCollapsed} onToggle={() => setListCollapsed((c) => !c)} />
      )}

      {expanded && (
        <div className="px-4 py-4 flex flex-col gap-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
          <div>
            <div className="text-xs font-mono font-medium mb-3" style={{ color: 'var(--muted-foreground)' }}>
              LERNWEG — BERUFSBILDER
            </div>
            <ol className="flex flex-col gap-2">
              {p.berufsbilder.map((b, i) => (
                <TimelineEntry key={i} station={b} index={i} isLast={i === p.berufsbilder.length - 1} />
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Abgeschlossen', value: `${finished} von ${p.berufsbilder.length}` },
              { label: 'Arbeitsblätter', value: `${p.berufsbilder.reduce((sum, b) => sum + doneCount(b, WORKSHEETS), 0)} erledigt` },
              { label: 'Zuletzt aktiv', value: p.lastActive },
            ].map((s) => (
              <div key={s.label} className="rounded p-3 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  {s.label}
                </div>
                <div className="text-sm font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={onAssign}
              className="text-xs px-3 py-2 rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              ✦ Arbeitsblatt zuweisen
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="text-xs px-3 py-2 rounded font-medium ml-auto hover:opacity-80 transition-opacity"
              style={{ border: '1px solid var(--primary)', color: 'var(--primary)' }}
            >
              ✎ Bearbeiten
            </button>
            {confirmDelete ? (
              <>
                <span className="text-xs" style={{ color: '#E53E3E' }}>
                  Wirklich löschen?
                </span>
                <button type="button" onClick={onDelete} className="text-xs px-3 py-2 rounded font-medium" style={{ backgroundColor: '#E53E3E', color: 'white' }}>
                  Ja, löschen
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-2 rounded" style={{ border: '1px solid var(--border)' }}>
                  Abbrechen
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs px-3 py-2 rounded font-medium hover:opacity-80 transition-opacity"
                style={{ border: '1px solid #E53E3E', color: '#E53E3E' }}
              >
                ✕ Löschen
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

/** Kurzname fuer die Lernweg-Chips: erstes Wort, ohne Bindestrich am Ende ("Garten-" -> "Garten") */
export function shortName(berufsbild: string): string {
  return (berufsbild.split(/[\s,&]/)[0] ?? berufsbild).replace(/-$/, '')
}

function StationChip({ station: b }: { station: BerufStation }) {
  const ls = LEVEL_STYLES[b.level]
  const bg = b.status === 'abgeschlossen' ? DONE_BG : b.status === 'aktiv' ? ls.bg : 'var(--muted)'
  const color = b.status === 'abgeschlossen' ? DONE_TEXT : b.status === 'aktiv' ? ls.text : 'var(--muted-foreground)'
  const icon = b.status === 'abgeschlossen' ? '✓' : b.status === 'aktiv' ? '●' : '○'
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
      title={`${b.berufsbild} · ${b.status}`}
      style={{ backgroundColor: bg, color, opacity: b.status === 'ausstehend' ? 0.6 : 1 }}
    >
      <span className={b.status === 'aktiv' ? 'inline-block animate-pulse' : undefined}>{icon}</span>
      <span>{shortName(b.berufsbild)}</span>
      <span
        className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center font-bold"
        style={{ fontSize: 9, backgroundColor: b.status === 'abgeschlossen' ? DONE_TEXT : ls.text, color: 'white' }}
      >
        {PERSONA_MAP[b.level][b.format]}
      </span>
    </div>
  )
}

function ActiveWorksheets({ station, collapsed, onToggle }: { station: BerufStation; collapsed: boolean; onToggle: () => void }) {
  const list = worksheetsFor(WORKSHEETS, station.berufsbild)
  const s = LEVEL_STYLES[station.level]
  const done = doneCount(station, WORKSHEETS)

  return (
    <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={onToggle}
        className="w-full px-4 pt-3 pb-2 text-xs font-mono font-medium flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <span>ARBEITSBLÄTTER</span>
        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
          {station.berufsbild} · {station.level}
        </span>
        <span className="px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: s.text, color: 'white', fontSize: 10 }}>
          Persona {PERSONA_MAP[station.level][station.format]}
        </span>
        <span className="ml-auto">{done} erledigt</span>
        <span aria-hidden="true" style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
          ▾
        </span>
      </button>
      {!collapsed && (
        <ul className="px-4 pb-3 flex flex-col gap-1">
          {list.map((w, i) => {
            const isDone = i < done
            const isCurrent = i === done
            return (
              <li
                key={w.id}
                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded"
                style={{ backgroundColor: isDone ? '#F0FBF4' : isCurrent ? s.bg : 'transparent', opacity: !isDone && !isCurrent ? 0.5 : 1 }}
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: isDone ? DONE_STRONG : isCurrent ? s.text : 'var(--border)', color: 'white', fontSize: 9 }}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{w.title}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    BS {w.baustein} · {w.ausbildungsbaustein}
                  </span>
                </div>
                {isDone && (
                  <span className="flex-shrink-0 text-xs font-mono" style={{ color: DONE_STRONG }}>
                    ✓ erledigt
                  </span>
                )}
                {isCurrent && (
                  <span className="flex-shrink-0 text-xs font-mono animate-pulse" style={{ color: s.text }}>
                    ● aktuell
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const STATUS_BADGE: Record<BerufStation['status'], (levelText: string) => { bg: string; color: string }> = {
  aktiv: (levelText) => ({ bg: levelText, color: 'white' }),
  abgeschlossen: () => ({ bg: DONE_BG, color: DONE_TEXT }),
  ausstehend: () => ({ bg: 'var(--muted)', color: 'var(--muted-foreground)' }),
}

function TimelineEntry({ station: b, index, isLast }: { station: BerufStation; index: number; isLast: boolean }) {
  const [open, setOpen] = useState(false)
  const ls = LEVEL_STYLES[b.level]
  const list = worksheetsFor(WORKSHEETS, b.berufsbild)
  const done = doneCount(b, WORKSHEETS)
  const badge = STATUS_BADGE[b.status](ls.text)
  const opt = formatOption(b.format)

  return (
    <li className="flex items-start gap-3">
      <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: 20 }}>
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: b.status === 'abgeschlossen' ? DONE_STRONG : b.status === 'aktiv' ? ls.text : 'var(--border)',
            color: b.status === 'ausstehend' ? 'var(--muted-foreground)' : 'white',
          }}
        >
          {b.status === 'abgeschlossen' ? '✓' : index + 1}
        </div>
        {!isLast && <div style={{ width: 1, height: 20, backgroundColor: 'var(--border)', marginTop: 2 }} />}
      </div>

      <div
        className="flex-1 rounded-lg p-3"
        style={{
          border: `1px solid ${b.status === 'aktiv' ? ls.text : 'var(--border)'}`,
          backgroundColor: b.status === 'aktiv' ? ls.bg : 'var(--card)',
          opacity: b.status === 'ausstehend' ? 0.6 : 1,
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{b.berufsbild}</span>
            <LevelBadge level={b.level} />
            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: badge.bg, color: badge.color }}>
              {b.status}
            </span>
            {b.status !== 'ausstehend' && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ backgroundColor: ls.bg, color: ls.text, border: `1px solid ${ls.text}` }}
                title={`${ls.label} · ${opt.label}`}
              >
                <span style={{ fontWeight: 700 }}>Persona {PERSONA_MAP[b.level][b.format]}</span>
                <span style={{ opacity: 0.75 }}>
                  · {opt.icon} {opt.label}
                </span>
              </span>
            )}
          </div>
          <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
            {done} AB erledigt
          </span>
        </div>

        {b.status !== 'ausstehend' && (
          <>
            <ProgressBar value={b.progress} label={`Fortschritt ${b.berufsbild}`} />
            <div className="flex items-center justify-between mt-1.5 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
              <span>Start: {b.startDate}</span>
              <span>{b.endDate ? `Abschluss: ${b.endDate}` : `${b.progress}% abgeschlossen`}</span>
            </div>
            {list.length > 0 && (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="mt-2 text-xs font-mono flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                <span aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
                  ▶
                </span>
                {open ? 'Arbeitsblätter ausblenden' : `${list.length} Arbeitsblätter anzeigen`}
              </button>
            )}
            {open && (
              <ul className="mt-2 flex flex-col gap-1">
                {list.map((w, i) => {
                  const isDone = i < done
                  return (
                    <li
                      key={w.id}
                      className="flex items-center gap-2 py-1 px-2 rounded text-xs"
                      style={{ backgroundColor: isDone ? '#F0FBF4' : 'var(--muted)', opacity: isDone ? 1 : 0.6 }}
                    >
                      <span style={{ color: isDone ? DONE_STRONG : ls.text, fontWeight: 700 }}>{isDone ? '✓' : i + 1}</span>
                      <span className="flex-1 truncate">{w.title}</span>
                      <span className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>
                        BS {w.baustein}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  )
}
