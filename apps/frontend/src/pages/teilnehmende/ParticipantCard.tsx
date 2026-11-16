import { useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { ProgressBar } from '@/components/Widgets'
import { LEVEL_STYLES, formatOption } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import { activeStation, doneCount, stationsStand, stationsStandText, worksheetsFor } from '@/lib/participants'
import type { Lernstand, Zuordnung, ZuordnungStatus } from '@/lib/api'
import type { StationsStand } from '@/lib/participants'
import type { BerufStation, Participant } from '@/types'
import { LernstandListe } from './LernstandListe'

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
  /** FE-30: closes the station with this index; returns an error message or null */
  onAbschliessen?: (index: number, erledigt: number) => Promise<string | null>
  /**
   * FE-11: learning progress from the backend. Without it (sample data) the card
   * keeps the prototype list of the sample worksheets.
   */
  lernstand?: {
    daten: Lernstand | null
    onStatus: (zuordnung: Zuordnung, status: ZuordnungStatus) => Promise<string | null>
    onEntfernen: (zuordnung: Zuordnung) => Promise<string | null>
  }
}

export function ParticipantCard({ participant: p, expanded, onToggleExpand, onAssign, onEdit, onDelete, onAbschliessen, lernstand }: Props) {
  const [listCollapsed, setListCollapsed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const active = activeStation(p)
  const finished = p.berufsbilder.filter((b) => b.status === 'abgeschlossen').length
  const anzahl = lernstand?.daten?.anzahl ?? { erledigt: 0, offen: 0, gesamt: 0 }
  const naechstes = lernstand?.daten?.alsNaechstes ?? null
  // FE-30: one source for all numbers – the learning progress from the backend if available
  const daten = lernstand ? lernstand.daten : undefined
  const balken = active ? stationsStand(active, daten, WORKSHEETS).fortschritt : p.progress
  const erledigtText = lernstand ? `${anzahl.erledigt} von ${anzahl.gesamt} Arbeitsblättern erledigt` : active ? `${doneCount(active, WORKSHEETS)} Arbeitsblätter erledigt` : ''

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
              <span className="ml-2">{erledigtText}</span>
              {naechstes && <span className="ml-2">· als Nächstes: {naechstes.arbeitsblatt.titel}</span>}
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-1.5" role="group" aria-label="Lernweg">
          {p.berufsbilder.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <StationChip station={b} />
              {i < p.berufsbilder.length - 1 && (
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }} aria-hidden="true">
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
        <div style={{ height: 3, width: `${balken}%`, backgroundColor: balken === 100 ? DONE_STRONG : 'var(--primary)', transition: 'width 0.3s' }} />
      </div>

      {lernstand && <LernstandListe lernstand={lernstand.daten} onStatus={lernstand.onStatus} onEntfernen={lernstand.onEntfernen} />}

      {!lernstand && active && worksheetsFor(WORKSHEETS, active.berufsbild).length > 0 && (
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
                <TimelineEntry
                  key={i}
                  station={b}
                  index={i}
                  isLast={i === p.berufsbilder.length - 1}
                  stand={stationsStand(b, daten, WORKSHEETS)}
                  naechster={p.berufsbilder.find((x, j) => j > i && x.status === 'ausstehend')?.berufsbild ?? null}
                  onAbschliessen={onAbschliessen && b.status === 'aktiv' ? (erledigt) => onAbschliessen(i, erledigt) : undefined}
                />
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Abgeschlossen', value: `${finished} von ${p.berufsbilder.length}` },
              {
                label: 'Arbeitsblätter',
                value: lernstand ? `${anzahl.erledigt} von ${anzahl.gesamt} erledigt` : `${p.berufsbilder.reduce((sum, b) => sum + doneCount(b, WORKSHEETS), 0)} erledigt`,
              },
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
              style={{ border: '1px solid var(--primary-text)', color: 'var(--primary-text)' }}
            >
              ✎ Bearbeiten
            </button>
            {confirmDelete ? (
              <>
                <span className="text-xs" style={{ color: 'var(--danger)' }}>
                  Wirklich löschen?
                </span>
                <button type="button" onClick={onDelete} className="text-xs px-3 py-2 rounded font-medium" style={{ backgroundColor: '#C53030', color: 'white' }}>
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
                style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}
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
      title={`${b.berufsbild} · Stufe ${b.level} · ${formatOption(b.format).label} · ${b.status}`}
      style={{ backgroundColor: bg, color, border: b.status === 'ausstehend' ? '1px dashed var(--border)' : '1px solid transparent' }}
    >
      <span className={b.status === 'aktiv' ? 'inline-block animate-pulse' : undefined}>{icon}</span>
      <span>{shortName(b.berufsbild)}</span>
      <span
        className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center font-bold"
        style={{ fontSize: 9, backgroundColor: b.status === 'abgeschlossen' ? DONE_TEXT : ls.text, color: 'white' }}
      >
        {b.level}
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
          {formatOption(station.format).label}
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
                style={{
                  backgroundColor: isDone ? 'var(--tint-success)' : isCurrent ? 'var(--card)' : 'transparent',
                  border: isCurrent ? `1px solid ${s.text}` : '1px solid transparent',
                }}
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold"
                  style={
                    isDone || isCurrent
                      ? { backgroundColor: isDone ? DONE_STRONG : s.text, color: 'white', fontSize: 9 }
                      : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', fontSize: 9 }
                  }
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
                  <span className="flex-shrink-0 text-xs font-mono" style={{ color: 'var(--success)' }}>
                    ✓ erledigt
                  </span>
                )}
                {isCurrent && (
                  <span className="flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
                    <span className="inline-block animate-pulse" aria-hidden="true">●</span> aktuell
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

type TimelineProps = {
  station: BerufStation
  index: number
  isLast: boolean
  stand: StationsStand
  /** next pending Berufsfeld, started when this one is closed */
  naechster: string | null
  onAbschliessen?: (erledigt: number) => Promise<string | null>
}

function TimelineEntry({ station: b, index, isLast, stand, naechster, onAbschliessen }: TimelineProps) {
  const [open, setOpen] = useState(false)
  const [frage, setFrage] = useState(false)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState('')

  async function abschliessen() {
    if (!onAbschliessen) return
    setSpeichert(true)
    const meldung = await onAbschliessen(stand.erledigt)
    setSpeichert(false)
    setFehler(meldung ?? '')
    if (!meldung) setFrage(false)
  }
  const ls = LEVEL_STYLES[b.level]
  const list = stand.blaetter
  const badge = STATUS_BADGE[b.status](ls.text)
  const opt = formatOption(b.format)

  return (
    <li className="flex items-start gap-3">
      <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: 20 }}>
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: b.status === 'abgeschlossen' ? DONE_STRONG : b.status === 'aktiv' ? ls.text : 'var(--muted)',
            color: b.status === 'ausstehend' ? 'var(--muted-foreground)' : 'white',
            border: b.status === 'ausstehend' ? '1px solid var(--border)' : 'none',
          }}
        >
          {b.status === 'abgeschlossen' ? '✓' : index + 1}
        </div>
        {!isLast && <div style={{ width: 1, height: 20, backgroundColor: 'var(--border)', marginTop: 2 }} />}
      </div>

      <div
        className="flex-1 rounded-lg p-3"
        style={{
          border: b.status === 'aktiv' ? `1.5px solid ${ls.text}` : b.status === 'ausstehend' ? '1px dashed var(--border)' : '1px solid var(--border)',
          backgroundColor: 'var(--card)',
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
                <span>
                  {opt.icon} {opt.label}
                </span>
              </span>
            )}
          </div>
          <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
            {stationsStandText(stand)}
          </span>
        </div>

        {b.status !== 'ausstehend' && (
          <>
            <ProgressBar value={stand.fortschritt} label={`Fortschritt ${b.berufsbild}`} />
            <div className="flex items-center justify-between mt-1.5 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
              <span>Start: {b.startDate}</span>
              <span>{b.endDate ? `Abschluss: ${b.endDate}` : `${stand.fortschritt} % erledigt`}</span>
            </div>
            {list.length > 0 && (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="mt-2 text-xs font-mono flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--primary-text)' }}
              >
                <span aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
                  ▶
                </span>
                {open ? 'Arbeitsblätter ausblenden' : `${list.length} ${list.length === 1 ? 'Arbeitsblatt' : 'Arbeitsblätter'} anzeigen`}
              </button>
            )}
            {open && (
              <ul className="mt-2 flex flex-col gap-1">
                {list.map((w, i) => {
                  const isDone = w.erledigt
                  return (
                    <li
                      key={w.key}
                      className="flex items-center gap-2 py-1 px-2 rounded text-xs"
                      style={{ backgroundColor: isDone ? 'var(--tint-success)' : 'var(--muted)' }}
                    >
                      <span style={{ color: isDone ? 'var(--success)' : 'var(--muted-foreground)', fontWeight: 700 }}>{isDone ? '✓' : i + 1}</span>
                      <span className="flex-1 truncate">{w.titel}</span>
                      {w.baustein !== null && (
                        <span className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>
                          BS {w.baustein}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {onAbschliessen && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {frage ? (
                  <>
                    <span className="text-xs">
                      „{b.berufsbild}“ abschließen?{naechster ? ` Danach ist „${naechster}“ aktiv.` : ' Es folgt kein weiterer Bereich.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void abschliessen()}
                      disabled={speichert}
                      className="text-xs px-3 py-1.5 rounded font-medium disabled:opacity-60"
                      style={{ backgroundColor: DONE_STRONG, color: 'white' }}
                    >
                      {speichert ? 'Wird gespeichert …' : 'Ja, abschließen'}
                    </button>
                    <button type="button" onClick={() => setFrage(false)} className="text-xs px-3 py-1.5 rounded" style={{ border: '1px solid var(--border)' }}>
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFrage(true)}
                    className="text-xs px-3 py-1.5 rounded font-medium hover:opacity-80"
                    style={{ border: `1px solid ${DONE_STRONG}`, color: DONE_TEXT }}
                  >
                    ✓ Bereich abschließen
                  </button>
                )}
              </div>
            )}
            {fehler && (
              <div role="alert" className="mt-2 text-xs rounded px-3 py-2" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
                {fehler}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  )
}
