import { useMemo, useState } from 'react'
import { WORKSHEETS } from '@/data/worksheets'
import { downloadWorksheetDocx } from '@/lib/docx'
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

async function download(w: Worksheet) {
  try {
    await downloadWorksheetDocx(w)
  } catch (error) {
    console.error('Word-Export fehlgeschlagen', error)
    window.alert('Die Word-Datei konnte nicht erstellt werden.')
  }
}

export function ArbeitsblaetterPage({ user, savedDocs, onSavedDocsChange, favoriteIds, onFavoriteIdsChange }: Props) {
  const [filter, setFilter] = useState<WorksheetFilter>(EMPTY_FILTER)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ worksheet: Worksheet; tab: DetailTab } | null>(null)
  const [transformSource, setTransformSource] = useState<TransformSource | null>(null)

  const filtered = useMemo(() => filterWorksheets(WORKSHEETS, filter), [filter])
  const visible = useMemo(
    () => (onlyFavorites ? filtered.filter((w) => favoriteIds.includes(w.id)) : filtered),
    [filtered, onlyFavorites, favoriteIds],
  )
  const bausteine = useMemo(() => bausteinOptions(WORKSHEETS), [])
  const ausbildungsbausteine = useMemo(() => ausbildungsbausteinOptions(WORKSHEETS, filter.berufsbild), [filter.berufsbild])

  function toggleFavorite(id: number) {
    onFavoriteIdsChange(favoriteIds.includes(id) ? favoriteIds.filter((x) => x !== id) : [...favoriteIds, id])
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

      <div className="flex flex-col gap-2">
        {visible.map((w) => (
          <WorksheetCard
            key={w.id}
            worksheet={w}
            expanded={expandedId === w.id}
            isFavorite={favoriteIds.includes(w.id)}
            onToggleFavorite={() => toggleFavorite(w.id)}
            onToggleExpand={() => setExpandedId(expandedId === w.id ? null : w.id)}
            onPreview={() => setDetail({ worksheet: w, tab: 'vorschau' })}
            onHistory={() => setDetail({ worksheet: w, tab: 'verlauf' })}
            onDownload={() => void download(w)}
            onAdapt={() => setTransformSource(w)}
          />
        ))}
        {visible.length === 0 && (
          <div
            className="py-10 text-center text-sm rounded-lg"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
          >
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
