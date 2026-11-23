import { useState } from 'react'
import { LEVEL_STYLES, formatOption } from '@/data/constants'
import type { Lernstand, Zuordnung, ZuordnungStatus } from '@/lib/api'

type Props = {
  lernstand: Lernstand | null
  /** Each returns an error message or null */
  onStatus: (zuordnung: Zuordnung, status: ZuordnungStatus) => Promise<string | null>
  onEntfernen: (zuordnung: Zuordnung) => Promise<string | null>
}

/**
 * FE-11: assigned worksheets per Berufsfeld from the backend (BE-04), in the order
 * of the learning path. Open sheets can be ticked off, done ones reopened, and an
 * assignment can be removed (the worksheet itself stays).
 */
export function LernstandListe({ lernstand, onStatus, onEntfernen }: Props) {
  const [laeuft, setLaeuft] = useState<string | null>(null)
  const [fehler, setFehler] = useState('')

  const felder = lernstand?.berufsfelder.filter((b) => b.anzahl.gesamt > 0) ?? []

  async function ausfuehren(z: Zuordnung, aktion: () => Promise<string | null>) {
    setLaeuft(z.id)
    setFehler((await aktion()) ?? '')
    setLaeuft(null)
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
      {fehler && (
        <div role="alert" className="text-xs rounded px-3 py-2" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
          {fehler}
        </div>
      )}
      {felder.length === 0 && (
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Noch keine Arbeitsblätter zugeordnet. Unter „Details“ mit „✦ Arbeitsblatt zuweisen“ ein gespeichertes Arbeitsblatt zuordnen.
        </div>
      )}
      {felder.map((feld) => {
        const s = LEVEL_STYLES[feld.station?.stufe ?? 'T']
        const zeilen = [...feld.offen, ...feld.erledigt]
        return (
          <section key={feld.berufsfeld} aria-label={`Arbeitsblätter ${feld.berufsfeld}`}>
            <div className="flex items-center gap-2 text-xs font-medium mb-1.5 flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
              <span>Arbeitsblätter</span>
              <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>
                {feld.berufsfeld}
                {feld.station ? ` · ${feld.station.stufe}` : ' · nicht im Lernweg'}
              </span>
              <span className="ml-auto">
                {feld.anzahl.erledigt} von {feld.anzahl.gesamt} erledigt · {feld.fortschritt} %
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {zeilen.map((z) => {
                const erledigt = z.status === 'erledigt'
                const archiviert = z.arbeitsblatt.status === 'archiviert'
                const naechstes = feld.alsNaechstes?.id === z.id
                return (
                  <li
                    key={z.id}
                    className="flex items-center gap-2.5 py-1.5 px-2.5 rounded flex-wrap"
                    style={{
                      backgroundColor: erledigt ? 'var(--tint-success)' : naechstes ? 'var(--card)' : 'transparent',
                      border: naechstes ? `1px solid ${s.text}` : '1px solid transparent',
                      opacity: archiviert ? 0.55 : 1,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium block truncate">{z.arbeitsblatt.titel}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        Stufe {z.arbeitsblatt.stufe} · {formatOption(z.arbeitsblatt.format)?.label ?? z.arbeitsblatt.format}
                        {erledigt && z.erledigtAm ? ` · erledigt am ${new Date(z.erledigtAm).toLocaleDateString('de-DE')}` : ''}
                        {archiviert ? ' · archiviert' : ''}
                      </span>
                    </div>
                    {naechstes && (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: s.bg, color: s.text }}>
                        ● als Nächstes
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={laeuft === z.id}
                      aria-label={erledigt ? `${z.arbeitsblatt.titel} wieder öffnen` : `${z.arbeitsblatt.titel} als erledigt markieren`}
                      onClick={() => void ausfuehren(z, () => onStatus(z, erledigt ? 'offen' : 'erledigt'))}
                      className="text-xs px-2 py-1 rounded flex-shrink-0 disabled:opacity-50"
                      style={erledigt ? { border: '1px solid var(--border)' } : { backgroundColor: '#2A7A4B', color: 'white' }}
                    >
                      {erledigt ? 'Wieder öffnen' : '✓ Erledigt'}
                    </button>
                    <button
                      type="button"
                      disabled={laeuft === z.id}
                      aria-label={`Zuordnung ${z.arbeitsblatt.titel} entfernen`}
                      title="Zuordnung entfernen (das Arbeitsblatt bleibt gespeichert)"
                      onClick={() => void ausfuehren(z, () => onEntfernen(z))}
                      className="text-xs px-1.5 py-1 rounded flex-shrink-0 hover:opacity-60 disabled:opacity-50"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
