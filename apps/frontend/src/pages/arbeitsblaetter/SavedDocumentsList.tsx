import type { SavedDocument } from '@/types'

type Props = {
  documents: SavedDocument[]
  onAdapt: (doc: SavedDocument) => void
  onRemove: (id: string) => void
}

export function SavedDocumentsList({ documents, onAdapt, onRemove }: Props) {
  if (documents.length === 0) return null

  return (
    <section className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">💾</span>
          <h2 className="font-display text-base font-semibold">Gespeicherte Dokumente</h2>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            {documents.length}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Hochgeladene Originaldokumente, unverändert gespeichert
        </span>
      </div>
      <ul className="flex flex-col">
        {documents.map((doc, index) => (
          <li
            key={doc.id}
            className="flex items-center gap-4 px-6 py-3.5"
            style={{ borderTop: index === 0 ? 'none' : '1px solid var(--border)' }}
          >
            <div className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--muted)' }} aria-hidden="true">
              📄
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{doc.name}</div>
              <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {doc.berufsbild}
                </span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{doc.thema}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span className="font-mono">
                  {doc.size} · {doc.pages} S.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                {doc.savedAt} · {doc.savedBy}
              </span>
              <button
                type="button"
                className="text-xs px-2.5 py-1.5 rounded hover:opacity-80 transition-opacity"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                Öffnen
              </button>
              <button
                type="button"
                onClick={() => onAdapt(doc)}
                className="text-xs px-2.5 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                ✦ Anpassen
              </button>
              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                className="text-xs px-2 py-1.5 rounded hover:opacity-60 transition-opacity"
                style={{ color: 'var(--muted-foreground)' }}
                aria-label={`${doc.name} entfernen`}
                title="Entfernen"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
