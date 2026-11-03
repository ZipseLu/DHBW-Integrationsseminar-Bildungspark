import { useCallback, useEffect, useState } from 'react'
import { CloseButton, SlideOver } from '@/components/SlideOver'
import { HISTORY_ACTION_STYLES, LEVEL_STYLES, niveausOf } from '@/data/constants'
import { WORKSHEET_HISTORY } from '@/data/worksheets'
import { fetchArbeitsblattVerlauf, updateArbeitsblatt, type ArbeitsblattStatus, type GespeichertesArbeitsblatt } from '@/lib/api'
import { LIMITS, darfStatusAendern, formatZeitpunkt, statusAktionen, type StatusAktion } from '@/lib/arbeitsblattBearbeiten'
import { fehlertext, historyAusVerlauf } from '@/lib/gespeicherteArbeitsblaetter'
import type { HistoryEntry, StaffUser, Worksheet } from '@/types'
import { StatusBadge } from './WorksheetCard'
import { WorksheetEditor } from './WorksheetEditor'

export type DetailTab = 'vorschau' | 'verlauf' | 'bearbeiten'

type Props = {
  worksheet: Worksheet
  tab: DetailTab
  user: StaffUser
  onTabChange: (tab: DetailTab) => void
  onClose: () => void
  onAdapt: () => void
  onDownload: () => void
  /** Called after content or status was saved in the backend (FE-10) */
  onChanged?: (blatt: GespeichertesArbeitsblatt) => void
}

const TAB_LABELS: Record<DetailTab, string> = { vorschau: '👁 Vorschau', verlauf: '🕓 Verlauf', bearbeiten: '✎ Bearbeiten' }

/** Side panel with Word preview, version history and – for saved worksheets – editing and status */
export function WorksheetDetailPanel({ worksheet: w, tab, user, onTabChange, onClose, onAdapt, onDownload, onChanged }: Props) {
  const tabs: DetailTab[] = w.backend ? ['vorschau', 'bearbeiten', 'verlauf'] : ['vorschau', 'verlauf']
  // Keep the editor mounted once opened, so switching tabs does not lose a draft
  const [editorGeoeffnet, setEditorGeoeffnet] = useState(tab === 'bearbeiten')
  const [ungespeichert, setUngespeichert] = useState(false)
  const [schliessenFragen, setSchliessenFragen] = useState(false)

  useEffect(() => {
    if (tab === 'bearbeiten') setEditorGeoeffnet(true)
  }, [tab])

  const schliessen = useCallback(() => {
    if (ungespeichert) setSchliessenFragen(true)
    else onClose()
  }, [ungespeichert, onClose])

  return (
    <SlideOver label={`Arbeitsblatt ${w.title}`} width={560} onClose={schliessen}>
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                BS {w.baustein}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                {w.berufsbild}
              </span>
              {w.backend && <StatusBadge status={w.backend.status} />}
            </div>
            <h2 className="font-display text-lg font-semibold leading-snug">{w.title}</h2>
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {w.ausbildungsbaustein}
              {w.backend
                ? ` · Version ${w.backend.version}${w.backend.geaendertAm ? ` · zuletzt geändert ${formatZeitpunkt(w.backend.geaendertAm)}` : ''}`
                : ` · ${w.participants} Teilnehmer`}
            </div>
          </div>
          <CloseButton onClick={schliessen} />
        </div>

        {schliessenFragen && (
          <div role="alert" className="rounded-lg px-3 py-2 mb-3 text-sm flex items-center gap-3" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }}>
            <span className="flex-1">Es gibt ungespeicherte Änderungen. Trotzdem schließen?</span>
            <button type="button" onClick={onClose} className="text-xs px-2.5 py-1.5 rounded font-medium" style={{ backgroundColor: '#7A5C00', color: '#FFFFFF' }}>
              Verwerfen und schließen
            </button>
            <button type="button" onClick={() => setSchliessenFragen(false)} className="text-xs underline">
              Weiter bearbeiten
            </button>
          </div>
        )}

        {w.backend && <StatusLeiste backendId={w.backend.id} status={w.backend.status} user={user} onChanged={onChanged} />}

        <div className="flex gap-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTabChange(t)}
              className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === t ? 'var(--primary)' : 'transparent',
                color: tab === t ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              }}
            >
              {TAB_LABELS[t]}
              {t === 'bearbeiten' && ungespeichert && <span aria-label="ungespeichert"> •</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5" role="tabpanel">
        {tab === 'vorschau' && <WordPreview worksheet={w} />}
        {tab === 'verlauf' && <HistoryTimeline worksheet={w} />}
        {w.backend && editorGeoeffnet && (
          <div hidden={tab !== 'bearbeiten'}>
            <WorksheetEditor
              backendId={w.backend.id}
              autor={user.name}
              onDirtyChange={setUngespeichert}
              onSaved={(blatt) => onChanged?.(blatt)}
            />
          </div>
        )}
      </div>

      <div className="px-6 py-4 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={onAdapt}
          className="flex-1 py-2 rounded text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          ✦ Anpassen
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="px-4 py-2 rounded text-sm font-medium hover:opacity-80 transition-opacity flex items-center gap-1.5"
          style={{ border: '1px solid var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--card)' }}
        >
          <span aria-hidden="true">📄</span> Als Word speichern
        </button>
      </div>
    </SlideOver>
  )
}

/**
 * Status actions (FE-10): release, back to draft, archive, restore.
 * Each change asks for confirmation and an optional note for the history.
 */
function StatusLeiste({
  backendId,
  status,
  user,
  onChanged,
}: {
  backendId: string
  status: ArbeitsblattStatus
  user: StaffUser
  onChanged?: (blatt: GespeichertesArbeitsblatt) => void
}) {
  const [aktion, setAktion] = useState<StatusAktion | null>(null)
  const [notiz, setNotiz] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  if (!darfStatusAendern(user.role)) {
    return (
      <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
        Freigeben und Archivieren dürfen nur Dozierende und Admins.
      </p>
    )
  }

  async function bestaetigen() {
    if (!aktion) return
    setLaeuft(true)
    setFehler(null)
    try {
      const blatt = await updateArbeitsblatt(backendId, { status: aktion.ziel, autor: user.name, ...(notiz.trim() ? { notiz: notiz.trim() } : {}) })
      setAktion(null)
      setNotiz('')
      onChanged?.(blatt)
    } catch (error) {
      setFehler(`Status konnte nicht geändert werden: ${fehlertext(error)}`)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-2">
      {!aktion && (
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Status ändern">
          {statusAktionen(status, user.role).map((a) => (
            <button
              key={a.ziel}
              type="button"
              onClick={() => setAktion(a)}
              className="text-xs px-3 py-1.5 rounded font-medium"
              style={
                a.gefaehrlich
                  ? { border: '1px solid #A61B1B', color: '#A61B1B', backgroundColor: '#FFFFFF' }
                  : a.ziel === 'freigegeben'
                    ? { backgroundColor: '#1A5C32', color: '#FFFFFF' }
                    : { border: '1px solid var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--card)' }
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {aktion && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
          <div className="text-sm font-medium">{aktion.frage}</div>
          <label className="text-xs" htmlFor="status-notiz">
            Notiz für den Verlauf (optional)
          </label>
          <input
            id="status-notiz"
            value={notiz}
            maxLength={LIMITS.notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder={aktion.ziel === 'freigegeben' ? 'z. B. Mit Gruppe 2 erprobt' : ''}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={laeuft}
              onClick={() => void bestaetigen()}
              className="text-xs px-3 py-1.5 rounded font-medium"
              style={aktion.gefaehrlich ? { backgroundColor: '#A61B1B', color: '#FFFFFF' } : { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {laeuft ? 'Wird gespeichert …' : 'Bestätigen'}
            </button>
            <button type="button" disabled={laeuft} onClick={() => setAktion(null)} className="text-xs px-3 py-1.5 rounded" style={{ border: '1px solid var(--border)' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {fehler && (
        <div role="alert" className="text-xs rounded px-3 py-2" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
          {fehler}
        </div>
      )}
    </div>
  )
}

/** Nachbildung einer Word-Seite – entspricht dem Aufbau des .docx-Exports */
function WordPreview({ worksheet: w }: { worksheet: Worksheet }) {
  const smallCaps = { fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }
  const levels = niveausOf(w)

  return (
    <div className="flex flex-col items-center" style={{ backgroundColor: '#C8C0B4', padding: '20px 8px', minHeight: '100%', margin: '0 -24px' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
          padding: '40px 44px 48px',
          fontFamily: 'Calibri, "Segoe UI", sans-serif',
          color: '#1A1714',
          lineHeight: 1.5,
        }}
      >
        <div style={{ ...smallCaps, fontSize: 9, color: '#1E3A5F', letterSpacing: '0.12em', marginBottom: 8 }}>Bildungspark Heilbronn-Franken</div>
        <div style={{ height: 2, backgroundColor: '#1E3A5F', marginBottom: 14 }} />
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, lineHeight: 1.25 }}>{w.title}</div>
        <div style={{ fontSize: 11, color: '#6B6354', marginBottom: 20 }}>
          {w.berufsbild} · Baustein {w.baustein} · {w.ausbildungsbaustein}
        </div>
        <div style={{ ...smallCaps, fontSize: 8.5, color: '#1E3A5F', marginBottom: 4 }}>Abschnitt</div>
        <div style={{ fontSize: 11, marginBottom: 24, lineHeight: 1.6 }}>{w.abschnitt.titel}</div>

        <div style={{ ...smallCaps, fontSize: 8.5, color: '#1E3A5F', marginBottom: 8 }}>Binnendifferenzierung nach Niveaustufen</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {levels.map((l) => {
                const s = LEVEL_STYLES[l]
                return (
                  <th key={l} style={{ width: `${100 / levels.length}%`, backgroundColor: s.bg, padding: '6px 8px', textAlign: 'center', borderBottom: `2px solid ${s.text}` }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.text, lineHeight: 1.1 }}>{l}</div>
                    <div style={{ fontSize: 9, color: s.text, fontWeight: 600 }}>{s.label}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              {levels.map((l) => {
                const s = LEVEL_STYLES[l]
                const row = w.abschnitt.niveaus[l]
                return (
                  <td key={l} style={{ verticalAlign: 'top', padding: 8, backgroundColor: '#FFFEF9', borderBottom: '1px solid #D5CEBB' }}>
                    <div style={{ ...smallCaps, fontSize: 7.5, color: '#6B6354', letterSpacing: '0.08em', marginBottom: 3 }}>Kompetenz</div>
                    <div style={{ fontSize: 10, marginBottom: 8, lineHeight: 1.45 }}>{row.kompetenz}</div>
                    {row.beispiel && (
                      <>
                        <div style={{ ...smallCaps, fontSize: 7.5, color: s.text, letterSpacing: '0.08em', marginBottom: 3 }}>Aufgabe / Beispiel</div>
                        <div style={{ fontSize: 10, color: s.text, fontStyle: 'italic', backgroundColor: s.bg, padding: '4px 6px', lineHeight: 1.45 }}>{row.beispiel}</div>
                      </>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>

        <div
          style={{
            marginTop: 40,
            paddingTop: 10,
            borderTop: '1px solid #D5CEBB',
            fontSize: 8.5,
            color: '#6B6354',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            {w.createdBy} · {w.date}
          </span>
          <span>{w.aiGenerated ? 'KI-generiert' : 'Manuell erstellt'}</span>
        </div>
      </div>
    </div>
  )
}

type VerlaufZustand = { art: 'laden' } | { art: 'fertig'; entries: HistoryEntry[] } | { art: 'fehler'; text: string }

function HistoryTimeline({ worksheet: w }: { worksheet: Worksheet }) {
  const backendId = w.backend?.id
  const version = w.backend?.version
  const [zustand, setZustand] = useState<VerlaufZustand>(() =>
    backendId ? { art: 'laden' } : { art: 'fertig', entries: WORKSHEET_HISTORY[w.id] ?? [] },
  )

  useEffect(() => {
    if (!backendId) return
    let aktiv = true
    setZustand({ art: 'laden' })
    fetchArbeitsblattVerlauf(backendId)
      .then((eintraege) => aktiv && setZustand({ art: 'fertig', entries: historyAusVerlauf(eintraege) }))
      .catch((error: unknown) => aktiv && setZustand({ art: 'fehler', text: fehlertext(error) }))
    return () => {
      aktiv = false
    }
  }, [backendId, version])

  if (zustand.art === 'laden') {
    return (
      <div role="status" className="text-sm py-10 text-center" style={{ color: 'var(--muted-foreground)' }}>
        Verlauf wird geladen …
      </div>
    )
  }

  if (zustand.art === 'fehler') {
    return (
      <div role="alert" className="text-sm rounded-lg px-4 py-3" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
        Der Verlauf konnte nicht geladen werden: {zustand.text}
      </div>
    )
  }

  const entries = zustand.entries
  if (entries.length === 0) {
    return (
      <div className="text-sm py-10 text-center" style={{ color: 'var(--muted-foreground)' }}>
        Für dieses Dokument gibt es noch keinen Verlauf.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-mono mb-2" style={{ color: 'var(--muted-foreground)' }}>
        {entries.length} Versionen · Neueste zuerst
      </div>
      <ol className="flex flex-col gap-3">
        {entries.map((entry, i) => {
          const ac = HISTORY_ACTION_STYLES[entry.action]
          return (
            <li key={entry.version} className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ac.bg, color: ac.text }} aria-hidden="true">
                  {ac.icon}
                </div>
                {i < entries.length - 1 && <div className="w-px flex-1 mt-1" style={{ backgroundColor: 'var(--border)', minHeight: 24 }} />}
              </div>
              <div className="flex-1 rounded-lg px-4 py-3 mb-1" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium" style={{ backgroundColor: ac.bg, color: ac.text }}>
                      {entry.action}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                      v{entry.version}
                    </span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {entry.date}
                    {entry.time ? `, ${entry.time}` : ''}
                  </span>
                </div>
                <div className="text-sm font-medium mb-0.5">{entry.author}</div>
                {entry.note && (
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {entry.note}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
