import { useEffect, useState } from 'react'
import { CloseButton, SlideOver } from '@/components/SlideOver'
import { HISTORY_ACTION_STYLES, LEVEL_STYLES, niveausOf } from '@/data/constants'
import { WORKSHEET_HISTORY } from '@/data/worksheets'
import { fetchArbeitsblattVerlauf } from '@/lib/api'
import { fehlertext, historyAusVerlauf } from '@/lib/gespeicherteArbeitsblaetter'
import type { HistoryEntry, Worksheet } from '@/types'

export type DetailTab = 'vorschau' | 'verlauf'

type Props = {
  worksheet: Worksheet
  tab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onClose: () => void
  onAdapt: () => void
  onDownload: () => void
}

/** Seitenpanel mit Word-Vorschau und Versionsverlauf eines Arbeitsblatts */
export function WorksheetDetailPanel({ worksheet: w, tab, onTabChange, onClose, onAdapt, onDownload }: Props) {
  return (
    <SlideOver label={`Arbeitsblatt ${w.title}`} width={540} onClose={onClose}>
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
            </div>
            <h2 className="font-display text-lg font-semibold leading-snug">{w.title}</h2>
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {w.ausbildungsbaustein}
              {w.backend ? ` · Version ${w.backend.version}` : ` · ${w.participants} Teilnehmer`}
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="flex gap-1" role="tablist">
          {(['vorschau', 'verlauf'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTabChange(t)}
              className="px-4 py-1.5 rounded text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === t ? 'var(--primary)' : 'transparent',
                color: tab === t ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              }}
            >
              {t === 'vorschau' ? '👁 Vorschau' : '🕓 Verlauf'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5" role="tabpanel">
        {tab === 'vorschau' ? <WordPreview worksheet={w} /> : <HistoryTimeline worksheet={w} />}
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
  }, [backendId])

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
                  </span>
                </div>
                <div className="text-sm font-medium mb-0.5">{entry.author}</div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  {entry.note}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
