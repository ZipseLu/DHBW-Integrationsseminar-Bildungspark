import { useEffect, useState, type CSSProperties } from 'react'
import { AUFGABEN_TYP_LABEL, PIKTOGRAMM_SYMBOL } from '@/data/aufgaben'
import { LEVEL_STYLES, formatOption } from '@/data/constants'
import { fetchArbeitsblatt, type Arbeitsblatt, type Aufgabe } from '@/lib/api'
import { versetztePaare } from '@/lib/druck'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'

/**
 * FE-22: preview of a saved worksheet with its real content – same structure as
 * the Word export and the print view (lib/druck.ts), shown as a white page.
 */

const smallCaps: CSSProperties = { fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 9, color: '#1E3A5F' }
const muted = '#6B6354'
const border = '#D5CEBB'

function Absaetze({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) =>
          /^achtung:/i.test(line) ? (
            <p key={i} style={{ backgroundColor: '#FFF3CD', color: '#7A5C00', fontWeight: 700, padding: '3px 6px', margin: '0 0 6px' }}>
              {line}
            </p>
          ) : (
            <p key={i} style={{ margin: '0 0 6px' }}>
              {line}
            </p>
          ),
        )}
    </>
  )
}

function AufgabeInhalt({ aufgabe }: { aufgabe: Aufgabe }) {
  const optionen = aufgabe.optionen ?? []
  switch (aufgabe.typ) {
    case 'reihenfolge':
    case 'ankreuzen':
      return (
        <ul style={{ listStyle: 'none', margin: '0 0 6px', padding: '0 0 0 10px' }}>
          {optionen.map((o, i) => (
            <li key={i}>☐ {o}</li>
          ))}
        </ul>
      )
    case 'zuordnen':
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '2px 0 6px' }}>
          <tbody>
            {versetztePaare(optionen).map(([links, rechts], i) => (
              <tr key={i}>
                <td style={{ width: '50%', textAlign: 'right', padding: '3px 6px' }}>{links}</td>
                <td style={{ width: '50%', padding: '3px 6px' }}>☐ {rechts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'malen':
      return <div aria-label="Malrahmen" style={{ height: 120, border: `1px solid ${border}`, margin: '4px 0 8px' }} />
    case 'praxis':
      return <p style={{ margin: '0 0 6px 10px' }}>( ) Ja &nbsp;&nbsp;&nbsp; ( ) Nein</p>
    default:
      return (
        <div aria-label="Schreiblinien">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ borderBottom: `1px solid ${border}`, height: 20 }} />
          ))}
        </div>
      )
  }
}

/** The worksheet as a white page (used in the preview tab) */
export function ArbeitsblattSeite({ arbeitsblatt: w }: { arbeitsblatt: Arbeitsblatt }) {
  const farbe = LEVEL_STYLES[w.stufe] ?? LEVEL_STYLES.T
  const bausteinInfo = [w.berufsfeld, w.baustein !== undefined ? `Baustein ${w.baustein}` : null, w.ausbildungsbaustein].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col items-center" style={{ backgroundColor: '#C8C0B4', padding: '20px 8px', minHeight: '100%', margin: '0 -24px' }}>
      <article
        aria-label={`Vorschau ${w.titel}`}
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
          padding: '36px 40px 44px',
          fontFamily: 'Calibri, "Segoe UI", sans-serif',
          color: '#1A1714',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <div style={{ ...smallCaps, fontSize: 8.5 }}>Bildungspark Heilbronn-Franken</div>
        <h3 style={{ fontSize: 19, fontWeight: 700, margin: '6px 0 2px', lineHeight: 1.25 }}>{w.titel}</h3>
        <div style={{ fontSize: 10.5, color: muted }}>{bausteinInfo}</div>
        <div style={{ fontSize: 10.5, color: muted, margin: '4px 0 12px' }}>
          <span style={{ backgroundColor: farbe.bg, color: farbe.text, fontWeight: 700, padding: '1px 6px' }}>Stufe {w.stufe}</span> &nbsp;
          {formatOption(w.format)?.label ?? w.format} · {w.sprache}
        </div>

        <div style={smallCaps}>Lernziel</div>
        <p style={{ margin: '2px 0 10px' }}>{w.lernziel}</p>
        <div style={smallCaps}>Darum geht es</div>
        <div style={{ marginTop: 2 }}>
          <Absaetze text={w.einleitung} />
        </div>

        {w.aufgaben.map((aufgabe) => (
          <section key={aufgabe.nr} style={{ marginTop: 12 }}>
            <h4 style={{ fontSize: 12.5, fontWeight: 700, margin: '0 0 4px', padding: '2px 6px', backgroundColor: farbe.bg, color: farbe.text }}>
              {aufgabe.piktogramm && <span aria-hidden="true">{PIKTOGRAMM_SYMBOL[aufgabe.piktogramm] ?? ''} </span>}
              Aufgabe {aufgabe.nr}: {AUFGABEN_TYP_LABEL[aufgabe.typ] ?? aufgabe.typ}
            </h4>
            <Absaetze text={aufgabe.anweisung} />
            <AufgabeInhalt aufgabe={aufgabe} />
          </section>
        ))}

        {w.woerterbuch.length > 0 && (
          <>
            <div style={{ ...smallCaps, marginTop: 14 }}>Kleines Wörter-Buch</div>
            {w.woerterbuch.map((e) => (
              <p key={e.wort} style={{ margin: '2px 0 2px 10px' }}>
                <strong>{e.wort}:</strong> {e.erklaerung}
              </p>
            ))}
          </>
        )}

        {w.hinweisAnleiter && (
          <>
            <div style={{ ...smallCaps, marginTop: 14 }}>Hinweis für die Lehrkraft</div>
            <p style={{ fontSize: 10.5, color: muted, fontStyle: 'italic', backgroundColor: '#FFFEF9', border: `1px solid ${border}`, padding: '6px 8px', margin: '2px 0 0' }}>
              {w.hinweisAnleiter}
            </p>
          </>
        )}
      </article>
    </div>
  )
}

type Zustand = { art: 'laden' } | { art: 'fehler'; text: string } | { art: 'bereit'; arbeitsblatt: Arbeitsblatt }

/**
 * Loads the content of a saved worksheet (GET /api/arbeitsblaetter/:id) and shows it.
 * `version` reloads the preview after the worksheet was saved in the editor.
 */
export function GespeicherteVorschau({ backendId, version }: { backendId: string; version: number }) {
  const [zustand, setZustand] = useState<Zustand>({ art: 'laden' })
  const [versuch, setVersuch] = useState(0)

  useEffect(() => {
    let aktiv = true
    setZustand({ art: 'laden' })
    fetchArbeitsblatt(backendId)
      .then((blatt) => aktiv && setZustand({ art: 'bereit', arbeitsblatt: blatt.inhalt }))
      .catch((error: unknown) => aktiv && setZustand({ art: 'fehler', text: fehlertext(error) }))
    return () => {
      aktiv = false
    }
  }, [backendId, version, versuch])

  if (zustand.art === 'laden') {
    return (
      <div role="status" className="py-10 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
        Vorschau wird geladen …
      </div>
    )
  }
  if (zustand.art === 'fehler') {
    return (
      <div role="alert" className="rounded-lg px-4 py-3 text-sm flex items-start gap-3" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
        <span className="flex-1">Die Vorschau konnte nicht geladen werden: {zustand.text}</span>
        <button type="button" onClick={() => setVersuch((n) => n + 1)} className="text-xs underline flex-shrink-0">
          Erneut laden
        </button>
      </div>
    )
  }
  return <ArbeitsblattSeite arbeitsblatt={zustand.arbeitsblatt} />
}
