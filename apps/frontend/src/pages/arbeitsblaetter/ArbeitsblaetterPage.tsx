import { useEffect, useMemo, useState } from 'react'
import { WORKSHEETS } from '@/data/worksheets'
import { downloadGespeichertesDocx, updateArbeitsblatt } from '@/lib/api'
import { downloadWorksheetDocx } from '@/lib/docx'
import { fehlertext, ladeGespeicherteArbeitsblaetter, worksheetAusGespeichertem } from '@/lib/gespeicherteArbeitsblaetter'
import { EMPTY_FILTER, ausbildungsbausteinOptions, bausteinOptions, filterWorksheets, type WorksheetFilter } from '@/lib/worksheetFilter'
import type { SavedDocument, StaffUser, Worksheet } from '@/types'
import { SavedDocumentsList } from './SavedDocumentsList'
import { TransformPanel, type TransformSource } from './TransformPanel'
import { UploadSection } from './UploadSection'
import { WorksheetCard } from './WorksheetCard'
import { WorksheetDetailPanel, type DetailTab } from './WorksheetDetailPanel'
import { WorksheetFilters } from './WorksheetFilters'

type Props = {
  user: StaffUser
  savedDocs: SavedDocument[]
  onSavedDocsChange: (docs: SavedDocument[]) => void
  favoriteIds: number[]
  onFavoriteIdsChange: (ids: number[]) => void
}

/**
 * Woher die Liste kommt:
 *  - 'laden'    Anfrage an GET /api/arbeitsblaetter läuft
 *  - 'backend'  gespeicherte Blätter aus der Datenbank
 *  - 'beispiel' Backend oder Datenbank nicht erreichbar → Beispieldaten, mit Hinweis
 */
type Quelle = { art: 'laden' } | { art: 'backend' } | { art: 'beispiel'; grund: string }

async function download(w: Worksheet) {
  try {
    if (w.backend) await downloadGespeichertesDocx({ id: w.backend.id, titel: w.title })
    else await downloadWorksheetDocx(w)
  } catch (error) {
    console.error('Word-Export fehlgeschlagen', error)
    window.alert('Die Word-Datei konnte nicht erstellt werden.')
  }
}

export function ArbeitsblaetterPage({ user, savedDocs, onSavedDocsChange, favoriteIds, onFavoriteIdsChange }: Props) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [quelle, setQuelle] = useState<Quelle>({ art: 'laden' })
  const [ladeVersuch, setLadeVersuch] = useState(0)
  const [aktionsFehler, setAktionsFehler] = useState<string | null>(null)
  const [filter, setFilter] = useState<WorksheetFilter>(EMPTY_FILTER)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ worksheet: Worksheet; tab: DetailTab } | null>(null)
  const [transformSource, setTransformSource] = useState<TransformSource | null>(null)

  useEffect(() => {
    let aktiv = true
    setQuelle({ art: 'laden' })
    ladeGespeicherteArbeitsblaetter()
      .then((blaetter) => {
        if (!aktiv) return
        setWorksheets(blaetter.map((b, i) => worksheetAusGespeichertem(b, i + 1)))
        setQuelle({ art: 'backend' })
      })
      .catch((error: unknown) => {
        if (!aktiv) return
        setWorksheets([...WORKSHEETS])
        setQuelle({ art: 'beispiel', grund: fehlertext(error) })
      })
    return () => {
      aktiv = false
    }
  }, [ladeVersuch])

  const isFavorite = (w: Worksheet) => (w.backend ? w.backend.favorit : favoriteIds.includes(w.id))

  const filtered = useMemo(() => filterWorksheets(worksheets, filter), [worksheets, filter])
  const visible = useMemo(
    () => (onlyFavorites ? filtered.filter((w) => (w.backend ? w.backend.favorit : favoriteIds.includes(w.id))) : filtered),
    [filtered, onlyFavorites, favoriteIds],
  )
  const bausteine = useMemo(() => bausteinOptions(worksheets), [worksheets])
  const ausbildungsbausteine = useMemo(() => ausbildungsbausteinOptions(worksheets, filter.berufsbild), [worksheets, filter.berufsbild])

  function setFavorit(id: number, favorit: boolean) {
    setWorksheets((alle) => alle.map((w) => (w.id === id && w.backend ? { ...w, backend: { ...w.backend, favorit } } : w)))
  }

  async function toggleFavorite(w: Worksheet) {
    if (!w.backend) {
      onFavoriteIdsChange(favoriteIds.includes(w.id) ? favoriteIds.filter((x) => x !== w.id) : [...favoriteIds, w.id])
      return
    }
    // Sofort anzeigen, bei Fehler zurücksetzen
    const neu = !w.backend.favorit
    setAktionsFehler(null)
    setFavorit(w.id, neu)
    try {
      await updateArbeitsblatt(w.backend.id, { favorit: neu, autor: user.name })
    } catch (error) {
      setFavorit(w.id, !neu)
      setAktionsFehler(`Favorit konnte nicht gespeichert werden: ${fehlertext(error)}`)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadSection savedBy={user.name} onSave={(doc) => onSavedDocsChange([doc, ...savedDocs])} />

      <WorksheetFilters
        filter={filter}
        onChange={setFilter}
        bausteine={bausteine}
        ausbildungsbausteine={ausbildungsbausteine}
        onlyFavorites={onlyFavorites}
        onOnlyFavoritesChange={setOnlyFavorites}
        resultCount={visible.length}
      />

      {quelle.art === 'beispiel' && (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 text-sm flex items-start gap-3"
          style={{ backgroundColor: '#FFF3CD', color: '#7A5C00', border: '1px solid #E8D48A' }}
        >
          <div className="flex-1">
            <div className="font-semibold">Gespeicherte Arbeitsblätter konnten nicht geladen werden – es werden Beispieldaten angezeigt.</div>
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

      {aktionsFehler && (
        <div role="alert" className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#FAD9C8', color: '#7A2E00' }}>
          {aktionsFehler}
        </div>
      )}

      <div className="flex flex-col gap-2" aria-busy={quelle.art === 'laden'}>
        {quelle.art === 'laden' && (
          <div role="status" className="py-10 text-center text-sm rounded-lg" style={leerStil}>
            Arbeitsblätter werden geladen …
          </div>
        )}

        {quelle.art !== 'laden' &&
          visible.map((w) => (
            <WorksheetCard
              key={w.backend?.id ?? w.id}
              worksheet={w}
              expanded={expandedId === w.id}
              isFavorite={isFavorite(w)}
              onToggleFavorite={() => void toggleFavorite(w)}
              onToggleExpand={() => setExpandedId(expandedId === w.id ? null : w.id)}
              onPreview={() => setDetail({ worksheet: w, tab: 'vorschau' })}
              onHistory={() => setDetail({ worksheet: w, tab: 'verlauf' })}
              onDownload={() => void download(w)}
              onAdapt={() => setTransformSource(w)}
            />
          ))}

        {quelle.art === 'backend' && worksheets.length === 0 && (
          <div className="py-10 text-center text-sm rounded-lg" style={leerStil}>
            Noch keine Arbeitsblätter gespeichert. Erstelle das erste in der KI-Erstellung.
          </div>
        )}

        {quelle.art !== 'laden' && worksheets.length > 0 && visible.length === 0 && (
          <div className="py-10 text-center text-sm rounded-lg" style={leerStil}>
            Keine Arbeitsblätter gefunden.
          </div>
        )}
      </div>

      <SavedDocumentsList
        documents={savedDocs}
        onAdapt={(doc) => setTransformSource({ title: doc.thema, berufsbild: doc.berufsbild, ausbildungsbaustein: doc.name })}
        onRemove={(id) => onSavedDocsChange(savedDocs.filter((d) => d.id !== id))}
      />

      {detail && (
        <WorksheetDetailPanel
          worksheet={detail.worksheet}
          tab={detail.tab}
          onTabChange={(tab) => setDetail({ ...detail, tab })}
          onClose={() => setDetail(null)}
          onAdapt={() => {
            setDetail(null)
            setTransformSource(detail.worksheet)
          }}
          onDownload={() => void download(detail.worksheet)}
        />
      )}

      {transformSource && <TransformPanel source={transformSource} onClose={() => setTransformSource(null)} />}
    </div>
  )
}

const leerStil = { backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }
