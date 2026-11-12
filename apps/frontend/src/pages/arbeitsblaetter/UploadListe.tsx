import { useEffect, useState } from 'react'
import { BERUFSBILDER } from '@/data/constants'
import { deleteUpload, downloadUploadDatei, fetchUpload, fetchUploads, uploadDateiUrl, type Upload } from '@/lib/api'
import type { KiVorauswahl } from '@/lib/lehrplaene'
import { formatGroesse, themaAusDateiname } from '@/lib/vorlage'
import { uploadFehlertext } from './UploadSection'

type Props = {
  /** Changes after each upload, so the list reloads */
  reloadKey: number
  onKiAnpassen: (vorauswahl: KiVorauswahl) => void
}

type Zustand = { art: 'laden' } | { art: 'fehler'; text: string } | { art: 'bereit'; uploads: Upload[] }

const ICONS: Record<Upload['dateityp'], string> = { pdf: '📕', docx: '📘', doc: '📘', txt: '📄', md: '📄', png: '🖼', jpg: '🖼' }
/** Types the browser can show itself; everything else is downloaded */
const ANZEIGBAR: Upload['dateityp'][] = ['pdf', 'png', 'jpg']

/**
 * FE-05: uploaded worksheets from the backend (GET /api/uploads) with open,
 * adapt via KI and delete. Replaces the former local "Gespeicherte Dokumente".
 */
export function UploadListe({ reloadKey, onKiAnpassen }: Props) {
  const [zustand, setZustand] = useState<Zustand>({ art: 'laden' })
  const [meldung, setMeldung] = useState<{ id: string; text: string } | null>(null)
  const [loeschen, setLoeschen] = useState<string | null>(null)

  useEffect(() => {
    let aktiv = true
    fetchUploads()
      .then((uploads) => aktiv && setZustand({ art: 'bereit', uploads: Array.isArray(uploads) ? uploads : [] }))
      .catch((error: unknown) => aktiv && setZustand({ art: 'fehler', text: uploadFehlertext(error) }))
    return () => {
      aktiv = false
    }
  }, [reloadKey])

  if (zustand.art === 'laden') return null
  if (zustand.art === 'fehler') {
    return (
      <p className="text-xs px-1" style={{ color: 'var(--muted-foreground)' }} role="status">
        Hochgeladene Dokumente können gerade nicht angezeigt werden. {zustand.text}
      </p>
    )
  }
  if (zustand.uploads.length === 0) return null

  const entferne = (id: string) => setZustand({ art: 'bereit', uploads: zustand.uploads.filter((u) => u.id !== id) })

  async function oeffnen(upload: Upload) {
    setMeldung(null)
    if (ANZEIGBAR.includes(upload.dateityp)) {
      window.open(uploadDateiUrl(upload.id, { anzeigen: true }), '_blank', 'noopener')
      return
    }
    try {
      await downloadUploadDatei(upload)
    } catch (error) {
      setMeldung({ id: upload.id, text: uploadFehlertext(error) })
    }
  }

  async function anpassen(upload: Upload) {
    setMeldung(null)
    try {
      const voll = await fetchUpload(upload.id)
      if (!voll.text) {
        setMeldung({ id: upload.id, text: 'Zu diesem Dokument ist noch kein Text gespeichert (z. B. PDF oder Bild). Bitte das Dokument erneut als Text einfügen.' })
        return
      }
      onKiAnpassen({
        berufsfeld: voll.berufsfeld ?? BERUFSBILDER[0],
        thema: voll.thema ?? themaAusDateiname(voll.dateiname),
        vorlage: { name: voll.dateiname, text: voll.text },
      })
    } catch (error) {
      setMeldung({ id: upload.id, text: uploadFehlertext(error) })
    }
  }

  async function bestaetigeLoeschen(upload: Upload) {
    setLoeschen(null)
    try {
      await deleteUpload(upload.id)
      entferne(upload.id)
    } catch (error) {
      setMeldung({ id: upload.id, text: uploadFehlertext(error) })
    }
  }

  return (
    <section className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }} aria-labelledby="uploads-titel">
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">💾</span>
          <h2 id="uploads-titel" className="font-display text-base font-semibold">
            Hochgeladene Dokumente
          </h2>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            {zustand.uploads.length}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Originale, unverändert gespeichert
        </span>
      </div>
      <ul className="flex flex-col">
        {zustand.uploads.map((upload, index) => (
          <li key={upload.id} className="px-6 py-3.5 flex flex-col gap-2" style={{ borderTop: index === 0 ? 'none' : '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--muted)' }} aria-hidden="true">
                {ICONS[upload.dateityp]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{upload.dateiname}</div>
                <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
                  {upload.berufsfeld && (
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {upload.berufsfeld}
                    </span>
                  )}
                  {upload.thema && <span>{upload.thema}</span>}
                  <span className="font-mono">{formatGroesse(upload.groesse)}</span>
                  <span>{upload.textLaenge > 0 ? '✓ Text vorhanden' : 'kein Text'}</span>
                  <span className="font-mono">
                    {new Date(upload.hochgeladenAm).toLocaleDateString('de-DE')}
                    {upload.hochgeladenVon ? ` · ${upload.hochgeladenVon}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {upload.hatDatei && (
                  <button
                    type="button"
                    onClick={() => void oeffnen(upload)}
                    className="text-xs px-2.5 py-1.5 rounded hover:opacity-80 transition-opacity"
                    style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    aria-label={`${upload.dateiname} öffnen`}
                  >
                    Öffnen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void anpassen(upload)}
                  className="text-xs px-2.5 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                  aria-label={`${upload.dateiname} mit KI anpassen`}
                >
                  ✦ Anpassen
                </button>
                <button
                  type="button"
                  onClick={() => setLoeschen(upload.id)}
                  className="text-xs px-2 py-1.5 rounded hover:opacity-60 transition-opacity"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-label={`${upload.dateiname} löschen`}
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
            </div>

            {loeschen === upload.id && (
              <div className="flex items-center gap-3 text-xs rounded px-3 py-2" style={{ backgroundColor: '#FEF2F2', color: '#A61B1B' }} role="alert">
                <span className="flex-1">„{upload.dateiname}“ endgültig löschen?</span>
                <button type="button" onClick={() => void bestaetigeLoeschen(upload)} className="px-2.5 py-1 rounded font-medium" style={{ backgroundColor: '#A61B1B', color: '#FFFFFF' }}>
                  Löschen
                </button>
                <button type="button" onClick={() => setLoeschen(null)} className="underline">
                  Abbrechen
                </button>
              </div>
            )}

            {meldung?.id === upload.id && (
              <div className="text-xs rounded px-3 py-2" style={{ backgroundColor: '#FFF3CD', color: '#7A5C00' }} role="alert">
                {meldung.text}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
