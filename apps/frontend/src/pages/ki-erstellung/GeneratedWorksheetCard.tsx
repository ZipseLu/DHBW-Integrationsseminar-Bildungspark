import { useState } from 'react'
import { LEVEL_STYLES, formatOption } from '@/data/constants'
import { ApiError, downloadArbeitsblattDocx, type ArbeitsblattResult, type Aufgabe, type AufgabeTyp } from '@/lib/api'

const TYP_LABEL: Record<AufgabeTyp, string> = {
  offen: 'Nach-denken',
  reihenfolge: 'Reihenfolge',
  zuordnen: 'Zuordnen',
  ankreuzen: 'Ankreuzen',
  malen: 'Malen',
  praxis: 'Praxis-Übung',
}

/** Symbole der Piktogramm-Whitelist – Kopie von PIKTOGRAMME in apps/backend/src/arbeitsblatt/schema.js */
const PIKTOGRAMM_SYMBOL: Record<string, string> = {
  denken: '💭', lesen: '📖', schreiben: '✏️', sprechen: '🗣️', fragen: '❓', anleiter: '🧑‍🏫', reihenfolge: '🔢',
  verbinden: '🔗', ankreuzen: '☑️', malen: '🎨', zaehlen: '🧮', uhr: '⏰', achtung: '⚠️', stopp: '🛑', haende: '🤲',
  handschuhe: '🧤', helm: '⛑️', schutzbrille: '🥽', werkzeug: '🔧', messer: '🔪', paket: '📦', lkw: '🚚', hubwagen: '🛒',
  regal: '🗄️', waage: '⚖️', liste: '📋', computer: '💻', besen: '🧹', topf: '🍲', teller: '🍽️', kuehlschrank: '🧊', pflanze: '🌱',
}

const mutedText = { color: 'var(--muted-foreground)' }

function AufgabeBlock({ aufgabe, accent }: { aufgabe: Aufgabe; accent: string }) {
  const optionen = aufgabe.optionen ?? []
  const symbol = aufgabe.piktogramm ? PIKTOGRAMM_SYMBOL[aufgabe.piktogramm] ?? '' : ''

  return (
    <li className="flex flex-col gap-1.5">
      <div className="text-sm font-semibold" style={{ color: accent }}>
        {symbol && (
          <span className="mr-1.5" aria-label={`Piktogramm ${aufgabe.piktogramm}`}>
            {symbol}
          </span>
        )}
        Aufgabe {aufgabe.nr}: {TYP_LABEL[aufgabe.typ] ?? aufgabe.typ}
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-line">{aufgabe.anweisung}</div>

      {(aufgabe.typ === 'reihenfolge' || aufgabe.typ === 'ankreuzen') && optionen.length > 0 && (
        <ul className="text-sm flex flex-col gap-1 pl-1">
          {optionen.map((option) => (
            <li key={option}>☐ {option}</li>
          ))}
        </ul>
      )}

      {aufgabe.typ === 'zuordnen' && optionen.length > 0 && (
        <ul className="text-sm flex flex-col gap-1 pl-1">
          {optionen.map((option) => {
            const [links, rechts = ''] = option.split('|').map((s) => s.trim())
            return (
              <li key={option} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)' }}>
                  {links}
                </span>
                <span style={mutedText}>⟷</span>
                <span>☐ {rechts}</span>
              </li>
            )
          })}
        </ul>
      )}

      {aufgabe.typ === 'malen' && (
        <div className="rounded text-xs flex items-center justify-center" style={{ border: '1px dashed var(--border)', height: 56, ...mutedText }}>
          Rahmen zum Malen
        </div>
      )}

      {aufgabe.typ === 'praxis' && <div className="text-sm font-mono">( ) Ja &nbsp;&nbsp; ( ) Nein</div>}

      {aufgabe.loesung && (
        <div className="text-xs" style={mutedText}>
          Lösung (für den Anleiter): {aufgabe.loesung}
        </div>
      )}
    </li>
  )
}

/** Anzeige eines KI-generierten Arbeitsblatts mit Validator-Hinweisen und Word-Download */
export function GeneratedWorksheetCard({ result, onVorschau }: { result: ArbeitsblattResult; onVorschau: () => void }) {
  const { worksheet, meta } = result
  const s = LEVEL_STYLES[worksheet.stufe]
  const opt = formatOption(worksheet.format)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadArbeitsblattDocx(worksheet)
    } catch (error) {
      setDownloadError(error instanceof ApiError ? error.message : 'Download fehlgeschlagen.')
    } finally {
      setDownloading(false)
    }
  }

  const einleitung = worksheet.einleitung.split(/\n+/).filter((line) => line.trim())
  const dauer = `${(meta.durationMs / 1000).toFixed(1).replace('.', ',')} s`

  return (
    <article className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${s.text}`, backgroundColor: 'var(--card)' }} aria-label={`${worksheet.stufe} ${opt.label}: ${worksheet.titel}`}>
      <div className="px-3 py-2 flex items-center justify-between gap-2" style={{ backgroundColor: s.bg }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold" style={{ color: s.text }}>
            {worksheet.stufe}
          </span>
          <span className="text-xs" style={{ color: s.text }}>
            {s.label}
          </span>
          <span className="text-xs" style={{ color: s.text }}>
            · {opt.icon} {opt.label}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: s.text }}>
          {meta.mocked ? 'Mock' : `${meta.provider}${meta.model ? ` · ${meta.model}` : ''}`} · {dauer}
        </span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">{worksheet.titel}</h3>
          <div className="text-xs mt-1" style={mutedText}>
            Lernziel: {worksheet.lernziel} · {worksheet.sprache}
          </div>
        </div>

        <div className="text-sm leading-relaxed flex flex-col gap-1.5">
          {einleitung.map((line, index) => {
            const warn = /^achtung:/i.test(line.trim())
            return (
              <p key={index} className={warn ? 'px-2 py-1 rounded font-medium' : ''} style={warn ? { backgroundColor: '#FFF3CD', color: '#7A5C00' } : undefined}>
                {line}
              </p>
            )
          })}
        </div>

        <ol className="flex flex-col gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }} aria-label="Aufgaben">
          {worksheet.aufgaben.map((aufgabe) => (
            <AufgabeBlock key={aufgabe.nr} aufgabe={aufgabe} accent={s.text} />
          ))}
        </ol>

        {worksheet.woerterbuch.length > 0 && (
          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-xs font-mono font-medium mb-1" style={mutedText}>
              KLEINES WÖRTER-BUCH
            </div>
            <dl className="text-sm flex flex-col gap-0.5">
              {worksheet.woerterbuch.map((eintrag) => (
                <div key={eintrag.wort}>
                  <dt className="inline font-semibold">{eintrag.wort}: </dt>
                  <dd className="inline">{eintrag.erklaerung}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {worksheet.hinweisAnleiter && (
          <div className="text-xs rounded px-3 py-2" style={{ backgroundColor: 'var(--muted)', ...mutedText }}>
            <span className="font-semibold">Hinweis für die Lehrkraft:</span> {worksheet.hinweisAnleiter}
          </div>
        )}

        <div
          className="text-xs rounded px-3 py-2"
          style={meta.validation.ok ? { backgroundColor: '#F0FBF4', color: '#1A5C32' } : { backgroundColor: '#FFF3CD', color: '#7A5C00' }}
          role="status"
        >
          {meta.validation.ok ? (
            '✓ Validator: keine Hinweise'
          ) : (
            <>
              <div className="font-semibold mb-1">⚠ Validator: {meta.validation.hinweise.length} Hinweise (bitte vor der Freigabe prüfen)</div>
              <ul className="flex flex-col gap-0.5 list-disc pl-4">
                {meta.validation.hinweise.map((hinweis) => (
                  <li key={hinweis}>{hinweis}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs font-mono" style={mutedText}>
            Prompt v{meta.promptVersion} · {meta.attempts === 0 ? 'ohne KI-Aufruf' : `${meta.attempts} ${meta.attempts === 1 ? 'Versuch' : 'Versuche'}`}
            {meta.usage?.totalTokens ? ` · ${meta.usage.totalTokens} Tokens` : ''}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <button type="button" onClick={onVorschau} className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: s.bg, color: s.text }}>
                👁 Vorschau
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="text-xs px-3 py-1.5 rounded font-medium disabled:opacity-60"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--background)' }}
              >
                {downloading ? 'Wird erstellt…' : '📄 .docx'}
              </button>
            </div>
            {downloadError && (
              <span className="text-xs" style={{ color: '#7A2E00' }} role="alert">
                {downloadError}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
