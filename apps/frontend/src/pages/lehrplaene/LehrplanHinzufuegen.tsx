import { useState, type FormEvent } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { Modal } from '@/components/Modal'
import { ErrorNote, fieldLabelClass, inputStyle } from '@/components/Widgets'
import { LEVELS } from '@/data/constants'
import { pruefeLehrplan, speichereLehrplan, type LehrplanVorschau } from '@/lib/api'
import { useBerufsfelder } from '@/lib/berufsfelder'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'

const ANDERES = '__anderes__'

type Props = {
  onClose: () => void
  /** Called after saving, with the number of learning goals and whether an older version was replaced */
  onGespeichert: (ergebnis: { anzahl: number; ersetzt: boolean; berufsfeld: string }) => void
}

/**
 * FE-34: dialog "Lehrplan hinzufügen".
 * 1. Word file and Berufsfeld  2. "Prüfen" shows what was recognised  3. "Speichern".
 * The server reads the file again when saving, the preview is only for checking.
 */
export function LehrplanHinzufuegen({ onClose, onGespeichert }: Props) {
  const berufsfelder = useBerufsfelder()
  const [datei, setDatei] = useState<File | null>(null)
  const [auswahl, setAuswahl] = useState('')
  const [eigenesFeld, setEigenesFeld] = useState('')
  const [vorschau, setVorschau] = useState<{ lehrplan: LehrplanVorschau; ersetzt: boolean } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState<'pruefen' | 'speichern' | null>(null)

  const berufsfeld = auswahl === ANDERES ? eigenesFeld.trim() : auswahl

  // Every change of the input invalidates the preview
  function zuruecksetzen() {
    setVorschau(null)
    setFehler(null)
  }

  async function pruefen(event: FormEvent) {
    event.preventDefault()
    if (!datei || laeuft) return
    if (auswahl === ANDERES && !berufsfeld) {
      setFehler('Bitte den Namen des Berufsfelds eingeben.')
      return
    }
    setLaeuft('pruefen')
    setFehler(null)
    try {
      setVorschau(await pruefeLehrplan(datei, berufsfeld))
    } catch (error) {
      setVorschau(null)
      setFehler(fehlertext(error))
    } finally {
      setLaeuft(null)
    }
  }

  async function speichern() {
    if (!datei || !vorschau || laeuft) return
    setLaeuft('speichern')
    setFehler(null)
    try {
      const ergebnis = await speichereLehrplan(datei, berufsfeld)
      onGespeichert({ ...ergebnis, berufsfeld: vorschau.lehrplan.berufsfeld })
    } catch (error) {
      setFehler(`Speichern fehlgeschlagen: ${fehlertext(error)}`)
      setLaeuft(null)
    }
  }

  const lehrplan = vorschau?.lehrplan
  const anzahl = lehrplan?.lernziele.length ?? 0

  return (
    <Modal title="Lehrplan hinzufügen" subtitle="Word-Datei eines binnendifferenzierten Lehrplans" width="max-w-2xl" onClose={onClose}>
      <div className="px-6 py-5 overflow-y-auto">
        <form onSubmit={pruefen} className="flex flex-col gap-4">
          <div>
            <label htmlFor="lehrplan-datei" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
              LEHRPLAN-DATEI (.DOCX)
            </label>
            <input
              id="lehrplan-datei"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                setDatei(e.target.files?.[0] ?? null)
                zuruecksetzen()
              }}
              className="w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lehrplan-berufsfeld" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
                BERUFSFELD
              </label>
              <select
                id="lehrplan-berufsfeld"
                value={auswahl}
                onChange={(e) => {
                  setAuswahl(e.target.value)
                  zuruecksetzen()
                }}
                className="w-full px-3 py-2 rounded text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Aus dem Dateinamen erkennen</option>
                {berufsfelder.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value={ANDERES}>Anderes Berufsfeld …</option>
              </select>
            </div>
            {auswahl === ANDERES && (
              <div>
                <label htmlFor="lehrplan-berufsfeld-neu" className={fieldLabelClass} style={{ color: 'var(--muted-foreground)' }}>
                  NAME DES BERUFSFELDS
                </label>
                <input
                  id="lehrplan-berufsfeld-neu"
                  value={eigenesFeld}
                  maxLength={120}
                  onChange={(e) => {
                    setEigenesFeld(e.target.value)
                    zuruecksetzen()
                  }}
                  placeholder="z. B. Garten- und Landschaftsbau"
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {fehler && <ErrorNote>{fehler}</ErrorNote>}

          {!vorschau && (
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded text-sm" style={{ border: '1px solid var(--border)' }}>
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!datei || laeuft !== null}
                className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                {laeuft === 'pruefen' ? 'Wird geprüft …' : 'Prüfen'}
              </button>
            </div>
          )}
        </form>

        {lehrplan && (
          <section aria-label="Vorschau des Lehrplans" className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <div className="font-display text-lg font-semibold" role="status">
                {anzahl} {anzahl === 1 ? 'Lernziel' : 'Lernziele'} erkannt
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {lehrplan.berufsfeld}
                {lehrplan.baustein !== null ? ` · Baustein ${lehrplan.baustein}` : ''}
                {lehrplan.ausbildungsbaustein ? ` · ${lehrplan.ausbildungsbaustein}` : ''}
              </div>
            </div>

            {vorschau.ersetzt && (
              <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FFF8E6', color: '#7A4B00', border: '1px solid #F5D9A0' }}>
                Es gibt schon einen Lehrplan aus der Datei „{lehrplan.quelle}“. Beim Speichern wird er durch diese Version ersetzt.
              </div>
            )}

            {lehrplan.hinweise.length > 0 && (
              <ul className="text-xs px-3 py-2 rounded list-disc pl-6" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }} aria-label="Hinweise zum Lehrplan">
                {lehrplan.hinweise.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}

            <ol className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1" aria-label="Erkannte Lernziele">
              {lehrplan.lernziele.map((ziel, index) => (
                <li key={`${index}-${ziel.titel}`} className="flex items-start gap-3 text-sm rounded px-3 py-2" style={{ border: '1px solid var(--border)' }}>
                  <span className="font-mono text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {index + 1}.
                  </span>
                  <span className="flex-1">{ziel.titel}</span>
                  <span className="flex gap-1 flex-shrink-0" aria-label={`Stufen: ${LEVELS.filter((l) => ziel.niveaus[l]?.kompetenz).join(', ') || 'keine'}`}>
                    {LEVELS.filter((l) => ziel.niveaus[l]?.kompetenz).map((l) => (
                      <LevelBadge key={l} level={l} />
                    ))}
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded text-sm" style={{ border: '1px solid var(--border)' }}>
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void speichern()}
                disabled={laeuft !== null}
                className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                {laeuft === 'speichern' ? 'Wird gespeichert …' : vorschau.ersetzt ? 'Ersetzen und speichern' : 'Lehrplan speichern'}
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
