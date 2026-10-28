/** Berichte: im Mockup ein Platzhalter für einen späteren Sprint */
export function BerichtePage() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-lg p-8 text-center" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
        <h2 className="font-display text-2xl font-semibold mb-2">Berichte & Auswertungen</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
          Dieser Bereich wird in einem späteren Sprint implementiert.
        </p>
        <span className="inline-block text-xs font-mono px-3 py-1.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          SOLL – geplant für einen späteren Sprint
        </span>
      </div>
    </div>
  )
}
