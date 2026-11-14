import { useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Spinner } from '@/components/VariantSummary'
import { BERUFSBILDER } from '@/data/constants'
import { ApiError, saveEingefuegtenText, updateUpload, uploadArbeitsblatt, type UploadAntwort, type UploadMitText } from '@/lib/api'
import type { KiVorauswahl } from '@/lib/lehrplaene'
import { formatGroesse, themaAusDateiname } from '@/lib/vorlage'

/** Same limits as the backend (apps/backend/src/uploads/dateityp.js) – checked here first for a quick message */
export const MAX_DATEI_BYTES = 20 * 1024 * 1024
export const ERLAUBTE_ENDUNGEN = ['.pdf', '.doc', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg']

type Props = {
  savedBy: string
  /** Called after every successful upload, so the list below can reload */
  onUploaded: (upload: UploadMitText) => void
  /** Opens the KI-Erstellung with the uploaded text as template */
  onKiAnpassen: (vorauswahl: KiVorauswahl) => void
}

type Phase = { art: 'bereit' } | { art: 'laeuft'; name: string } | { art: 'fertig'; antwort: UploadAntwort }

const feldStil = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }
const labelKlasse = 'text-xs font-mono font-medium mb-1 block'

/** Readable message for upload errors, with the backend's own text where there is one */
export function uploadFehlertext(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'network_error' || error.code === 'db_unavailable') {
      return `Der Upload ist gerade nicht möglich: ${error.message}`
    }
    return error.message
  }
  return 'Der Upload ist fehlgeschlagen.'
}

/** Client-side pre-check; returns an error message or null */
export function pruefeDatei(datei: File): string | null {
  const punkt = datei.name.lastIndexOf('.')
  const endung = punkt > 0 ? datei.name.slice(punkt).toLowerCase() : ''
  if (!ERLAUBTE_ENDUNGEN.includes(endung)) return `Dateityp „${endung || 'ohne Endung'}“ wird nicht unterstützt. Erlaubt sind PDF, Word, Text oder Bild.`
  if (datei.size === 0) return 'Die Datei ist leer.'
  if (datei.size > MAX_DATEI_BYTES) return 'Die Datei ist größer als 20 MB.'
  return null
}

/**
 * FE-05: upload an existing worksheet (or paste its text), store it in the backend
 * (POST /api/uploads) and hand it to the KI-Erstellung for adapting it to the levels.
 */
export function UploadSection({ savedBy, onUploaded, onKiAnpassen }: Props) {
  const [modus, setModus] = useState<'datei' | 'text'>('datei')
  const [dragging, setDragging] = useState(false)
  const [berufsfeld, setBerufsfeld] = useState('')
  const [thema, setThema] = useState('')
  const [eingefuegt, setEingefuegt] = useState('')
  const [phase, setPhase] = useState<Phase>({ art: 'bereit' })
  const [fehler, setFehler] = useState('')

  function zuruecksetzen() {
    setPhase({ art: 'bereit' })
    setFehler('')
    setThema('')
    setEingefuegt('')
  }

  async function speichere(name: string, aufruf: () => Promise<UploadAntwort>) {
    setFehler('')
    setPhase({ art: 'laeuft', name })
    try {
      const antwort = await aufruf()
      setPhase({ art: 'fertig', antwort })
      onUploaded(antwort.upload)
    } catch (error) {
      setPhase({ art: 'bereit' })
      setFehler(uploadFehlertext(error))
    }
  }

  function starteUpload(datei: File) {
    const problem = pruefeDatei(datei)
    if (problem) {
      setFehler(problem)
      return
    }
    void speichere(datei.name, () =>
      uploadArbeitsblatt(datei, { berufsfeld, thema: thema.trim() || themaAusDateiname(datei.name), hochgeladenVon: savedBy }),
    )
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const datei = event.dataTransfer.files[0]
    if (datei) starteUpload(datei)
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0]
    if (datei) starteUpload(datei)
    event.target.value = ''
  }

  function handleTextSubmit(event: FormEvent) {
    event.preventDefault()
    if (!eingefuegt.trim()) {
      setFehler('Bitte zuerst den Text des Arbeitsblatts einfügen.')
      return
    }
    const titel = thema.trim() || 'Eingefügter Text'
    void speichere(titel, () => saveEingefuegtenText(eingefuegt, { titel, berufsfeld, hochgeladenVon: savedBy }))
  }

  return (
    <section className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }} aria-labelledby="upload-titel">
      <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--accent-text)' }} aria-hidden="true">
          ↑
        </span>
        <h2 id="upload-titel" className="font-display text-base font-semibold">
          Vorhandenes Arbeitsblatt hochladen & anpassen
        </h2>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {phase.art !== 'fertig' && (
          <>
            <div className="flex gap-1" role="tablist" aria-label="Art des Uploads">
              {(
                [
                  ['datei', '📄 Datei hochladen'],
                  ['text', '📋 Text einfügen'],
                ] as const
              ).map(([wert, label]) => (
                <button
                  key={wert}
                  type="button"
                  role="tab"
                  aria-selected={modus === wert}
                  onClick={() => {
                    setModus(wert)
                    setFehler('')
                  }}
                  className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: modus === wert ? 'var(--primary)' : 'transparent',
                    color: modus === wert ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="upload-berufsfeld" className={labelKlasse} style={{ color: 'var(--muted-foreground)' }}>
                  BERUFSFELD <span className="font-normal">(optional)</span>
                </label>
                <select id="upload-berufsfeld" value={berufsfeld} onChange={(e) => setBerufsfeld(e.target.value)} className="w-full px-3 py-2 rounded text-sm" style={feldStil}>
                  <option value="">– nicht zugeordnet –</option>
                  {BERUFSBILDER.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="upload-thema" className={labelKlasse} style={{ color: 'var(--muted-foreground)' }}>
                  THEMA <span className="font-normal">({modus === 'datei' ? 'sonst aus dem Dateinamen' : 'optional'})</span>
                </label>
                <input
                  id="upload-thema"
                  value={thema}
                  maxLength={200}
                  onChange={(e) => setThema(e.target.value)}
                  placeholder="z. B. Gabelstapler Sicherheit"
                  className="w-full px-3 py-2 rounded text-sm"
                  style={feldStil}
                />
              </div>
            </div>

            {phase.art === 'laeuft' ? (
              <div className="rounded-lg p-4 flex items-center gap-3" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }} role="status">
                <Spinner className="text-sm" />
                <span className="text-sm">„{phase.name}“ wird gespeichert …</span>
              </div>
            ) : modus === 'datei' ? (
              <label
                className="flex flex-col items-center justify-center gap-3 rounded-lg cursor-pointer transition-colors select-none"
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                  backgroundColor: dragging ? 'var(--muted)' : 'var(--background)',
                  padding: '2rem 1rem',
                  minHeight: 130,
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <input type="file" accept={ERLAUBTE_ENDUNGEN.join(',')} className="sr-only" onChange={handleInput} aria-label="Arbeitsblatt hochladen" />
                <div className="text-3xl" aria-hidden="true">
                  📄
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Datei hierher ziehen oder klicken</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    PDF, Word, Text oder Bild · max. 20 MB
                  </div>
                </div>
                <div className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                  Datei auswählen
                </div>
              </label>
            ) : (
              <form onSubmit={handleTextSubmit} className="flex flex-col gap-2">
                <label htmlFor="upload-text" className={labelKlasse} style={{ color: 'var(--muted-foreground)' }}>
                  TEXT DES ARBEITSBLATTS
                </label>
                <textarea
                  id="upload-text"
                  value={eingefuegt}
                  onChange={(e) => setEingefuegt(e.target.value)}
                  rows={6}
                  placeholder="Text aus dem vorhandenen Arbeitsblatt hier einfügen (Strg + V)"
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ ...feldStil, lineHeight: 1.6 }}
                />
                <button type="submit" className="self-start px-4 py-2 rounded text-sm font-medium" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                  Text speichern
                </button>
              </form>
            )}

            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              🔒 Bitte nur leere Vorlagen hochladen – keine ausgefüllten Blätter mit Namen von Teilnehmenden.
            </p>
          </>
        )}

        {fehler && (
          <div role="alert" className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF2F2', color: '#A61B1B', border: '1px solid #FECACA' }}>
            {fehler}
          </div>
        )}

        {phase.art === 'fertig' && (
          <UploadErgebnis
            antwort={phase.antwort}
            onTextGespeichert={(upload) => {
              setPhase({ art: 'fertig', antwort: { upload, hinweise: [] } })
              // The list below shows "kein Text" / "✓ Text vorhanden" – reload it too
              onUploaded(upload)
            }}
            onKiAnpassen={onKiAnpassen}
            onNeu={zuruecksetzen}
          />
        )}
      </div>
    </section>
  )
}

/** Result card after an upload: text status, adding text by hand, hand-over to the KI */
function UploadErgebnis({
  antwort,
  onTextGespeichert,
  onKiAnpassen,
  onNeu,
}: {
  antwort: UploadAntwort
  onTextGespeichert: (upload: UploadMitText) => void
  onKiAnpassen: (vorauswahl: KiVorauswahl) => void
  onNeu: () => void
}) {
  const { upload, hinweise } = antwort
  const [text, setText] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState('')
  const hatText = Boolean(upload.text)

  async function textSpeichern() {
    if (!text.trim()) return
    setSpeichert(true)
    setFehler('')
    try {
      onTextGespeichert(await updateUpload(upload.id, { text }))
    } catch (error) {
      setFehler(uploadFehlertext(error))
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg p-4 flex items-start gap-4" style={{ border: '1px solid #2A7A4B', backgroundColor: '#F0FBF4', color: '#1A5C32' }} role="status">
        <div className="text-2xl mt-0.5" aria-hidden="true">
          📄
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">✓ „{upload.dateiname}“ gespeichert</div>
          <div className="text-xs font-mono mt-1">
            {upload.dateityp.toUpperCase()} · {formatGroesse(upload.groesse)}
            {upload.berufsfeld ? ` · ${upload.berufsfeld}` : ''}
            {upload.thema ? ` · ${upload.thema}` : ''}
          </div>
          <div className="text-xs mt-1">{hatText ? `Text gelesen: ${upload.textLaenge.toLocaleString('de-DE')} Zeichen` : 'Noch kein Text vorhanden'}</div>
        </div>
      </div>

      {hinweise.map((h) => (
        <div key={h} className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }}>
          {h}
        </div>
      ))}

      {!hatText && (
        <div className="flex flex-col gap-2">
          <label htmlFor="upload-text-nachtragen" className={labelKlasse} style={{ color: 'var(--muted-foreground)' }}>
            TEXT ERGÄNZEN <span className="font-normal">(damit die KI das Blatt anpassen kann)</span>
          </label>
          <textarea
            id="upload-text-nachtragen"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Text aus der Datei hier einfügen"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ ...feldStil, lineHeight: 1.6 }}
          />
          <button
            type="button"
            disabled={!text.trim() || speichert}
            onClick={() => void textSpeichern()}
            className="self-start px-4 py-2 rounded text-sm font-medium disabled:cursor-not-allowed"
            style={
              text.trim() && !speichert
                ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
            }
          >
            {speichert ? 'Wird gespeichert …' : 'Text speichern'}
          </button>
          {fehler && (
            <div role="alert" className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF2F2', color: '#A61B1B', border: '1px solid #FECACA' }}>
              {fehler}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!hatText}
          onClick={() =>
            onKiAnpassen({
              berufsfeld: upload.berufsfeld ?? BERUFSBILDER[0],
              thema: upload.thema ?? themaAusDateiname(upload.dateiname),
              vorlage: { name: upload.dateiname, text: upload.text ?? '' },
            })
          }
          className="flex-1 py-2 rounded text-sm font-medium disabled:cursor-not-allowed"
          style={hatText ? { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' } : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
          title={hatText ? undefined : 'Erst den Text ergänzen'}
        >
          ✦ Mit KI an Niveaustufen anpassen
        </button>
        <button type="button" onClick={onNeu} className="px-4 py-2 rounded text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          Weiteres Arbeitsblatt hochladen
        </button>
      </div>
    </div>
  )
}
