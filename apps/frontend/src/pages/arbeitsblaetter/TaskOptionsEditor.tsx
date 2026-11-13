import type { Aufgabe } from '@/lib/api'
import { LIMITS } from '@/lib/arbeitsblattBearbeiten'

const fieldStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }

/** Keep the API's existing string-array format, including "links | rechts". */
export function TaskOptionsEditor({ task, taskNumber, onChange }: { task: Aufgabe; taskNumber: number; onChange: (options: string[]) => void }) {
  if (!['ankreuzen', 'reihenfolge', 'zuordnen'].includes(task.typ) && !task.optionen) return null
  const options = task.optionen ?? []
  const pair = task.typ === 'zuordnen'
  const update = (index: number, value: string) => onChange(options.map((o, i) => i === index ? value : o))
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-medium mb-2">{pair ? 'Zuordnungspaare' : task.typ === 'reihenfolge' ? 'Reihenfolge-Schritte' : 'Antwortmöglichkeiten'}</legend>
      {options.map((option, index) => {
        const [left, ...right] = option.split('|')
        return (
          <div key={index} className="flex flex-wrap items-center gap-2">
            {pair ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                <input aria-label={`Aufgabe ${taskNumber} Paar ${index + 1} links`} value={left} maxLength={LIMITS.option} onChange={(e) => update(index, `${e.target.value}|${right.join('|')}`)} className="w-full rounded px-3 py-2 text-sm" style={fieldStyle} />
                <input aria-label={`Aufgabe ${taskNumber} Paar ${index + 1} rechts`} value={right.join('|')} maxLength={LIMITS.option} onChange={(e) => update(index, `${left}|${e.target.value}`)} className="w-full rounded px-3 py-2 text-sm" style={fieldStyle} />
              </div>
            ) : <input aria-label={`Aufgabe ${taskNumber} Option ${index + 1}`} value={option} maxLength={LIMITS.option} onChange={(e) => update(index, e.target.value)} className="flex-1 min-w-0 rounded px-3 py-2 text-sm" style={fieldStyle} />}
            <button type="button" aria-label={`Aufgabe ${taskNumber} Option ${index + 1} entfernen`} onClick={() => onChange(options.filter((_, i) => i !== index))} className="rounded px-2 py-2 text-xs" style={fieldStyle}>Entfernen</button>
            {task.typ === 'reihenfolge' && <>
              <button type="button" disabled={index === 0} aria-label={`Schritt ${index + 1} nach oben`} className="px-2 py-2 disabled:opacity-40" onClick={() => { const next = [...options]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next) }}>↑</button>
              <button type="button" disabled={index === options.length - 1} aria-label={`Schritt ${index + 1} nach unten`} className="px-2 py-2 disabled:opacity-40" onClick={() => { const next = [...options]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(next) }}>↓</button>
            </>}
          </div>
        )
      })}
      <button type="button" disabled={options.length >= LIMITS.optionen} onClick={() => onChange([...options, pair ? '|' : ''])} className="self-start rounded px-3 py-2 text-xs disabled:opacity-40" style={fieldStyle}>{pair ? 'Paar hinzufügen' : 'Option hinzufügen'}</button>
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Höchstens zehn Einträge mit je 200 Zeichen{pair ? ' für beide Seiten zusammen.' : '.'}</p>
    </fieldset>
  )
}
