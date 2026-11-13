import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { apiFetch, fetchArbeitsblatt, downloadGespeichertesDocx, type GespeichertesArbeitsblatt, type GespeichertesArbeitsblattMitInhalt, type LernzielInput } from '@/lib/api'
import { fehlertext } from '@/lib/gespeicherteArbeitsblaetter'

/** FE-19 uses the existing saved-worksheet search; no invented online links. */
export function MaterialSuggestions({ goal }: { goal: LernzielInput }) {
  const [state, setState] = useState<{ loading: boolean; items: GespeichertesArbeitsblatt[]; error: string }>({ loading: true, items: [], error: '' })
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<GespeichertesArbeitsblatt | null>(null)
  const [preview, setPreview] = useState<GespeichertesArbeitsblattMitInhalt | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController()
    setState({ loading: true, items: [], error: '' })
    const params = new URLSearchParams({ q: goal.titel, berufsfeld: goal.berufsfeld, proSeite: '5' })
    apiFetch(`/api/arbeitsblaetter?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body) => {
        if (!Array.isArray(body?.eintraege)) throw new Error('Ungültige Materialliste')
        if (!controller.signal.aborted) setState({ loading: false, items: body.eintraege, error: '' })
      })
      .catch(() => { if (!controller.signal.aborted) setState({ loading: false, items: [], error: 'Vorhandene Materialien konnten nicht geladen werden.' }) })
    return () => controller.abort()
  }, [goal.titel, goal.berufsfeld, retry])
  useEffect(() => {
    let active = true
    setPreview(null); setPreviewError(''); setDownloading(false)
    if (selected) fetchArbeitsblatt(selected.id)
      .then((sheet) => {
        if (!sheet?.inhalt || !Array.isArray(sheet.inhalt.aufgaben) || !Array.isArray(sheet.inhalt.woerterbuch)) throw new Error('Ungültiger Arbeitsblattinhalt')
        if (active) setPreview(sheet)
      })
      .catch((error) => { if (active) setPreviewError(fehlertext(error)) })
    return () => { active = false }
  }, [selected])
  async function download() {
    if (!selected || downloading) return
    setDownloading(true); setPreviewError('')
    try { await downloadGespeichertesDocx(selected) }
    catch (error) { if (mounted.current) setPreviewError(fehlertext(error)) }
    finally { if (mounted.current) setDownloading(false) }
  }
  return (
    <section className="rounded-lg p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)' }} aria-label="Materialvorschläge">
      <h3 className="text-sm font-semibold">Vorhandenes Material zum Lernziel</h3>
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{goal.titel}</p>
      {state.loading && <p role="status" className="text-sm">Passende Arbeitsblätter werden geladen …</p>}
      {state.error && <div role="alert" className="text-sm"><p>{state.error}</p><button type="button" className="underline py-2" onClick={() => setRetry((n) => n + 1)}>Erneut laden</button></div>}
      {!state.loading && !state.error && !state.items.length && <p role="status" className="text-sm">Zu diesem Lernziel sind noch keine passenden Arbeitsblätter gespeichert.</p>}
      <ul className="flex flex-col gap-2">
        {state.items.map((sheet) => <li key={sheet.id} className="flex flex-wrap justify-between gap-2 text-sm">
          <div><span>{sheet.titel}</span><p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Bibliothek · Stufe {sheet.stufe} · {sheet.berufsfeld}</p></div>
          <button type="button" className="underline py-2" onClick={() => setSelected(sheet)} aria-label={`${sheet.titel} öffnen`}>Öffnen</button>
        </li>)}
      </ul>
      {selected && <Modal title={selected.titel} onClose={() => setSelected(null)}>
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {previewError && <p role="alert">{previewError}</p>}
          {!preview && !previewError && <p role="status">Arbeitsblatt wird geladen …</p>}
          {preview && <>
            <p>{preview.inhalt.einleitung}</p>
            <ol className="list-decimal pl-5 flex flex-col gap-3">{preview.inhalt.aufgaben.map((task) => <li key={task.nr}><p>{task.anweisung}</p>{task.optionen && <ul className="list-disc pl-4">{task.optionen.map((o, i) => <li key={i}>{o}</li>)}</ul>}</li>)}</ol>
            {!!preview.inhalt.woerterbuch.length && <dl>{preview.inhalt.woerterbuch.map((word, i) => <div key={i}><dt className="font-semibold">{word.wort}</dt><dd>{word.erklaerung}</dd></div>)}</dl>}
            {preview.inhalt.hinweisAnleiter && <p className="text-sm">Hinweis für die Anleitung: {preview.inhalt.hinweisAnleiter}</p>}
            <button type="button" disabled={downloading} className="self-start rounded px-4 py-2 text-sm disabled:opacity-50" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }} onClick={() => void download()}>{downloading ? 'Wird geladen …' : 'Word herunterladen'}</button>
          </>}
        </div>
      </Modal>}
    </section>
  )
}
