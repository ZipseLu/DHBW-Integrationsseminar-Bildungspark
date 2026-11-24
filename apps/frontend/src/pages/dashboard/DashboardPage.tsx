import { useEffect, useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { ProgressBar, StatCard } from '@/components/Widgets'
import { LEVELS, LEVEL_STYLES, PERSONA_MAP, formatOption } from '@/data/constants'
import { WORKSHEETS } from '@/data/worksheets'
import { dashboardAusBeispielen, dashboardAusGespeicherten, type DashboardDaten } from '@/lib/dashboardDaten'
import { fehlertext, loadSavedWorksheets } from '@/lib/gespeicherteArbeitsblaetter'
import { useLernstand } from '@/lib/lernstand'
import { activeStation, stationsStand } from '@/lib/participants'
import { PersonaUebersicht } from './PersonaUebersicht'
import type { NavItem, Participant } from '@/types'

type Props = {
  participants: readonly Participant[]
  onNavigate: (item: NavItem) => void
  /** FE-30: participants come from the backend, so their learning progress can be loaded */
  lernstandAktiv?: boolean
}

/** How many people the overview lists before "Alle Teilnehmenden" */
const MAX_ZEILEN = 8

/** Woher die Zahlen kommen – wie auf der Seite Arbeitsblätter (FE-01) */
type Quelle = { art: 'laden' } | { art: 'backend' } | { art: 'beispiel'; grund: string }

const STATUS_LABEL = { entwurf: 'Entwurf', freigegeben: 'Freigegeben', archiviert: 'Archiviert' } as const
const STATUS_FARBE = {
  entwurf: { bg: '#DCEAF7', color: '#00487A' },
  freigegeben: { bg: '#D4EDDA', color: '#1A5C32' },
  archiviert: { bg: '#FAD9C8', color: '#7A2E00' },
} as const

export function DashboardPage({ participants, onNavigate, lernstandAktiv = false }: Props) {
  const lernstand = useLernstand(lernstandAktiv)
  const [quelle, setQuelle] = useState<Quelle>({ art: 'laden' })
  const [daten, setDaten] = useState<DashboardDaten | null>(null)
  const [ladeVersuch, setLadeVersuch] = useState(0)

  // FE-06: Kennzahlen aus GET /api/arbeitsblaetter, sonst Beispieldaten mit Hinweis
  useEffect(() => {
    let aktiv = true
    setQuelle({ art: 'laden' })
    loadSavedWorksheets()
      .then((blaetter) => {
        if (!aktiv) return
        setDaten(dashboardAusGespeicherten(blaetter))
        setQuelle({ art: 'backend' })
      })
      .catch((error: unknown) => {
        if (!aktiv) return
        setDaten(dashboardAusBeispielen(WORKSHEETS))
        setQuelle({ art: 'beispiel', grund: fehlertext(error) })
      })
    return () => {
      aktiv = false
    }
  }, [ladeVersuch])

  const laedt = quelle.art === 'laden' || daten === null
  const gesamt = daten?.gesamt ?? 0

  return (
    <div className="flex flex-col gap-8">
      {quelle.art === 'beispiel' && (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 text-sm flex items-start gap-3 -mb-4"
          style={{ backgroundColor: '#FFF3CD', color: '#7A5C00', border: '1px solid #E8D48A' }}
        >
          <div className="flex-1">
            <div className="font-semibold">Zahlen aus Beispieldaten – die gespeicherten Arbeitsblätter konnten nicht geladen werden.</div>
            <div className="text-xs mt-1">{quelle.grund}</div>
          </div>
          <button
            type="button"
            onClick={() => setLadeVersuch((n) => n + 1)}
            className="text-xs px-2.5 py-1.5 rounded font-medium flex-shrink-0"
            style={{ backgroundColor: '#7A5C00', color: '#FFFFFF' }}
          >
            Erneut laden
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4" aria-busy={laedt}>
        <StatCard label="Arbeitsblätter gesamt" value={laedt ? '…' : gesamt} sub={laedt ? 'wird geladen' : `${daten.berufsfelder} Berufsfelder`} accent />
        <StatCard
          label="KI-generiert"
          value={laedt ? '…' : daten.ki}
          sub={laedt ? 'wird geladen' : daten.freigegeben === null ? `von insgesamt ${gesamt}` : `von ${gesamt} · ${daten.freigegeben} freigegeben`}
        />
        <StatCard label="Aktive Teilnehmende" value={participants.length} sub="anonymisiert" />
      </div>

      <section className="rounded-lg p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Niveaustufen-Verteilung">
        <h2 className="font-display text-lg font-semibold mb-4">Niveaustufen-Verteilung</h2>
        <div className="flex gap-6">
          {LEVELS.map((level) => {
            const count = daten?.proStufe[level] ?? 0
            const pct = gesamt === 0 ? 0 : Math.round((count / gesamt) * 100)
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

      <LernstandUebersicht participants={participants} lernstand={lernstand} onNavigate={onNavigate} />

      <PersonaUebersicht participants={participants} />

      <section className="rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Zuletzt bearbeitet">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display text-lg font-semibold">Zuletzt bearbeitet</h2>
          <button type="button" className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--accent-text)' }} onClick={() => onNavigate('arbeitsblaetter')}>
            Alle anzeigen →
          </button>
        </div>
        {laedt && (
          <div role="status" className="px-6 py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Wird geladen …
          </div>
        )}
        {!laedt && daten.zuletzt.length === 0 && (
          <div className="px-6 py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Noch keine Arbeitsblätter gespeichert. Erstelle das erste in der KI-Erstellung.
          </div>
        )}
        <ul>
          {!laedt &&
            daten.zuletzt.map((w, i) => (
              <li key={w.key} style={{ borderBottom: i < daten.zuletzt.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('arbeitsblaetter')}
                  className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:opacity-80 transition-opacity"
                >
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                    BS {w.baustein ?? '–'}
                  </span>
                  {w.stufe && <LevelBadge level={w.stufe} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{w.titel}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {w.untertitel}
                    </div>
                  </div>
                  {w.status && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: STATUS_FARBE[w.status].bg, color: STATUS_FARBE[w.status].color }}>
                      {STATUS_LABEL[w.status]}
                    </span>
                  )}
                  {w.ki && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}>
                      KI
                    </span>
                  )}
                  <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {w.datum}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}

type ZeileDaten = {
  p: Participant
  offen: number
  erledigt: number
  gesamt: number | null
  fortschritt: number
  naechstes: string | null
}

/**
 * FE-30: "Lernstand der Teilnehmenden" – who has open worksheets and what is next.
 * Same numbers as on the page Teilnehmende (learning progress from the backend);
 * with sample data the stored progress of the active station is shown.
 */
function LernstandUebersicht({
  participants,
  lernstand,
  onNavigate,
}: {
  participants: readonly Participant[]
  lernstand: ReturnType<typeof useLernstand>
  onNavigate: (item: NavItem) => void
}) {
  const ausBackend = lernstand.quelle.art === 'bereit'
  const zeilen: ZeileDaten[] = participants.map((p) => {
    const station = activeStation(p)
    const daten = ausBackend ? (lernstand.je[p.id] ?? null) : undefined
    const stand = station ? stationsStand(station, daten, WORKSHEETS) : null
    return {
      p,
      offen: daten?.anzahl.offen ?? 0,
      erledigt: ausBackend ? (daten?.anzahl.erledigt ?? 0) : (stand?.erledigt ?? 0),
      gesamt: ausBackend ? (daten?.anzahl.gesamt ?? 0) : null,
      fortschritt: stand?.fortschritt ?? 0,
      naechstes: daten?.alsNaechstes?.arbeitsblatt.titel ?? null,
    }
  })
  // People without an open worksheet first – they need a new one
  const sortiert = ausBackend ? [...zeilen].sort((a, b) => Number(a.offen > 0) - Number(b.offen > 0)) : zeilen
  const ohneOffene = zeilen.filter((z) => z.offen === 0).length

  return (
    <section className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} aria-label="Lernstand der Teilnehmenden">
      <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="font-display text-lg font-semibold">Lernstand der Teilnehmenden</h2>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {ausBackend
              ? `${ohneOffene} von ${zeilen.length} ohne offenes Arbeitsblatt · anonymisiert nach § 60 SGB IX`
              : 'Aktiver Bereich im Lernweg · anonymisiert nach § 60 SGB IX'}
          </div>
        </div>
        <button type="button" onClick={() => onNavigate('teilnehmer')} className="text-xs font-medium hover:opacity-70 flex-shrink-0" style={{ color: 'var(--accent-text)' }}>
          Alle Teilnehmenden →
        </button>
      </div>

      {lernstand.quelle.art === 'laden' && (
        <div role="status" className="px-6 py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Lernstand wird geladen …
        </div>
      )}
      {lernstand.quelle.art === 'fehler' && (
        <div role="alert" className="mx-6 my-4 rounded px-3 py-2 text-sm flex items-center gap-3" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }}>
          <span className="flex-1">Der Lernstand konnte nicht geladen werden: {lernstand.quelle.grund}</span>
          <button type="button" onClick={lernstand.neuLaden} className="text-xs underline flex-shrink-0">
            Erneut laden
          </button>
        </div>
      )}
      {lernstand.quelle.art !== 'laden' && zeilen.length === 0 && (
        <div className="px-6 py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Noch keine Teilnehmenden angelegt.
        </div>
      )}

      {lernstand.quelle.art !== 'laden' && zeilen.length > 0 && (
        <ul>
          {sortiert.slice(0, MAX_ZEILEN).map((z, i) => (
            <LernstandZeile key={z.p.id} zeile={z} ausBackend={ausBackend} letzte={i === Math.min(sortiert.length, MAX_ZEILEN) - 1} />
          ))}
        </ul>
      )}
      {sortiert.length > MAX_ZEILEN && (
        <div className="px-6 py-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          und {sortiert.length - MAX_ZEILEN} weitere unter „Teilnehmende“
        </div>
      )}
    </section>
  )
}

function LernstandZeile({ zeile: z, ausBackend, letzte }: { zeile: ZeileDaten; ausBackend: boolean; letzte: boolean }) {
  const station = activeStation(z.p)
  const zahlen = z.gesamt === null ? `${z.erledigt} AB erledigt` : z.gesamt === 0 ? 'noch keine AB zugeordnet' : `${z.erledigt} von ${z.gesamt} erledigt`
  return (
    <li className="px-6 py-3 flex items-center gap-4" style={{ borderBottom: letzte ? 'none' : '1px solid var(--border)' }} aria-label={`Lernstand ${z.p.id}`}>
      <div className="w-40 flex-shrink-0">
        <div className="text-sm font-mono font-medium">{z.p.id}</div>
        {station && (
          <div className="flex items-center gap-1 mt-0.5">
            <LevelBadge level={station.level} />
            {/* FE-43: persona letter, explained in the section "Personas A–P" below */}
            <span
              className="text-xs px-1.5 rounded font-medium"
              style={{ border: `1px solid ${LEVEL_STYLES[station.level].text}`, color: LEVEL_STYLES[station.level].text }}
              title={`Persona ${PERSONA_MAP[station.level][station.format]}: ${station.level} · ${formatOption(station.format).label}`}
            >
              Persona {PERSONA_MAP[station.level][station.format]}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">
          {station ? (
            <>
              {station.berufsbild}
              <span style={{ color: 'var(--muted-foreground)' }}> · {formatOption(station.format).label}</span>
            </>
          ) : (
            <span style={{ color: 'var(--muted-foreground)' }}>Kein aktiver Bereich im Lernweg</span>
          )}
        </div>
        <div className="mt-1 max-w-xs">
          <ProgressBar value={z.fortschritt} label={`Fortschritt ${z.p.id}`} />
        </div>
      </div>
      <div className="w-64 flex-shrink-0 text-right">
        <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
          {zahlen} · {z.fortschritt} %
        </div>
        {ausBackend && (
          <div className="text-xs mt-1 truncate" style={{ color: z.naechstes ? 'var(--foreground)' : '#7A5C00' }}>
            {z.naechstes ? `als Nächstes: ${z.naechstes}` : 'kein Blatt offen – neues zuweisen'}
          </div>
        )}
      </div>
    </li>
  )
}
