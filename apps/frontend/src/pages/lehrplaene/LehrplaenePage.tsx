import { useEffect, useMemo, useState } from 'react'
import { LevelBadge } from '@/components/LevelBadge'
import { CloseButton, SlideOver } from '@/components/SlideOver'
import { LEVELS, LEVEL_STYLES } from '@/data/constants'
import { fetchLehrplaene, type LernzielInput } from '@/lib/api'
import { downloadLehrplanDocx } from '@/lib/lehrplanDocx'
import { bausteinLabel, beispielLernziele, fieldStyle, filterLehrplaene, groupLehrplaene, type KiVorauswahl, type LehrplanDokument, vorauswahlFor } from '@/lib/lehrplaene'

type Props = {
  /** Wechselt zur KI-Erstellung mit vorausgewähltem Lernziel */
  onCreateWorksheet: (vorauswahl: KiVorauswahl) => void
}

async function download(doc: LehrplanDokument) {
  try {
    await downloadLehrplanDocx(doc)
  } catch (error) {
    console.error('Word-Export fehlgeschlagen', error)
    window.alert('Die Word-Datei konnte nicht erstellt werden.')
  }
}

/**
 * Lehrpläne (Figma-Mockup, Version 41): Curriculum-Bibliothek mit Filter nach
 * Berufsfeld, Suche, Online-Vorschau, Word-Download und "Arbeitsblatt daraus erstellen".
 * Daten: importierte Lehrpläne (GET /api/lehrplaene), sonst die Beispiel-Lernziele.
 */
export function LehrplaenePage({ onCreateWorksheet }: Props) {
  const [docs, setDocs] = useState<LehrplanDokument[]>(() => groupLehrplaene(beispielLernziele()))
  const [quelle, setQuelle] = useState<'beispiele' | 'import'>('beispiele')
  const [filter, setFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LehrplanDokument | null>(null)

  useEffect(() => {
    let active = true
    fetchLehrplaene()
      .then((liste) => {
        if (!active || liste.length === 0) return
        setDocs(groupLehrplaene(liste))
        setQuelle('import')
      })
      .catch(() => {
        // Backend nicht erreichbar -> Beispiel-Lernziele bleiben
      })
    return () => {
      active = false
    }
  }, [])

  const fields = useMemo(() => [...new Set(docs.map((d) => d.berufsfeld))], [docs])
  const visible = filterLehrplaene(docs, filter, search)
  const lernzielCount = docs.reduce((sum, d) => sum + d.lernziele.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }} aria-label="Curriculum-Bibliothek">
        <div className="p-7 flex items-start justify-between gap-8">
          <div className="max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest mb-3 opacity-60">Curriculum-Bibliothek</div>
            <h2 className="font-display text-3xl font-semibold leading-tight">Binnendifferenzierte Lehrpläne</h2>
            <p className="text-sm leading-relaxed mt-3 opacity-75">
              Greifen Sie auf die verbindlichen Lehrpläne für Lager, Metall und Gastronomie zu. Alle Inhalte bilden die Niveaustufen T, A, F und B mit konkreten
              Praxisbeispielen ab.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <HeroStat value={docs.length} label="Dokumente" />
            <HeroStat value={LEVELS.length} label="Niveaustufen" />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Berufsfeld">
          {[null, ...fields].map((field) => {
            const count = field ? docs.filter((d) => d.berufsfeld === field).length : docs.length
            const active = filter === field
            return (
              <button
                key={field ?? 'alle'}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(field)}
                className="px-3 py-2 rounded text-xs font-medium transition-all"
                style={{
                  backgroundColor: active ? 'var(--primary)' : 'var(--card)',
                  color: active ? 'var(--primary-foreground)' : 'var(--foreground)',
                  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                }}
              >
                {field ?? 'Alle Berufsbilder'} <span className="ml-1 opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="relative w-72 flex-shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--muted-foreground)' }} aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            aria-label="Lehrplan durchsuchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lehrplan durchsuchen …"
            className="w-full pl-9 pr-3 py-2 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>
      </div>

      <div className="text-xs font-mono -mt-3" style={{ color: 'var(--muted-foreground)' }}>
        {quelle === 'import'
          ? `${lernzielCount} Lernziele aus den importierten Lehrplänen`
          : `Beispieldaten: ${lernzielCount} Lernziele (vollständig nach Import mit npm run import:lehrplaene im Backend)`}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {visible.map((doc) => (
          <LehrplanCard
            key={doc.id}
            doc={doc}
            onPreview={() => setSelected(doc)}
            onDownload={() => void download(doc)}
            onCreate={() => onCreateWorksheet(vorauswahlFor(doc))}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="rounded-lg py-14 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="font-display text-lg font-semibold">Kein Lehrplan gefunden</div>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Passen Sie den Suchbegriff oder den Berufsbereich an.
          </p>
        </div>
      )}

      {selected && (
        <LehrplanPreview
          doc={selected}
          onClose={() => setSelected(null)}
          onDownload={() => void download(selected)}
          onCreate={(ziel) => onCreateWorksheet(vorauswahlFor(selected, ziel))}
        />
      )}
    </div>
  )
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-5 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div className="font-display text-2xl font-semibold">{value}</div>
      <div className="text-xs opacity-60 mt-1">{label}</div>
    </div>
  )
}

function LehrplanCard({ doc, onPreview, onDownload, onCreate }: { doc: LehrplanDokument; onPreview: () => void; onDownload: () => void; onCreate: () => void }) {
  const field = fieldStyle(doc.berufsfeld)
  const count = doc.lernziele.length
  const description = doc.lernziele
    .slice(0, 3)
    .map((l) => l.titel)
    .join(' · ')

  return (
    <article
      aria-label={`Lehrplan ${doc.ausbildungsbaustein} ${bausteinLabel(doc)}`}
      className="rounded-lg p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-14 rounded flex items-center justify-center flex-shrink-0 font-display text-lg font-semibold"
          style={{ backgroundColor: field.bg, color: field.color, border: `1px solid ${field.color}22` }}
          aria-hidden="true"
        >
          {field.mark}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-mono font-medium" style={{ color: field.color }}>
              {doc.berufsfeld} · {bausteinLabel(doc)}
            </span>
            <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
              {count} {count === 1 ? 'Lernziel' : 'Lernziele'}
            </span>
          </div>
          <h3 className="font-display text-lg font-semibold mt-1 leading-snug">{doc.ausbildungsbaustein}</h3>
          <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {doc.tq}
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--muted-foreground)' }}>
        {description}
        {count > 3 ? ' …' : ''}
      </p>
      <div className="flex items-center gap-1.5">
        {LEVELS.map((level) => (
          <LevelBadge key={level} level={level} />
        ))}
        <span className="ml-1 text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
          Niveaustufen mit Praxisbeispielen
        </span>
      </div>
      <div className="pt-3 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={onPreview}
          className="px-3 py-2 rounded text-xs font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          Online ansehen
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="px-3 py-2 rounded text-xs font-medium text-center hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          ↓ Herunterladen
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="col-span-2 px-3 py-2 rounded text-xs font-medium hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          ✦ Arbeitsblatt daraus erstellen
        </button>
      </div>
    </article>
  )
}

function LehrplanPreview({
  doc,
  onClose,
  onDownload,
  onCreate,
}: {
  doc: LehrplanDokument
  onClose: () => void
  onDownload: () => void
  onCreate: (ziel: LernzielInput) => void
}) {
  return (
    <SlideOver label={`Lehrplan ${doc.ausbildungsbaustein}`} width={680} onClose={onClose}>
      <div className="px-6 py-5 flex items-start justify-between gap-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: 'var(--accent)' }}>
            ONLINE-VORSCHAU · LEHRPLAN
          </div>
          <h2 className="font-display text-xl font-semibold leading-snug">{doc.ausbildungsbaustein}</h2>
          <div className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
            {doc.berufsfeld} · {bausteinLabel(doc)} · {doc.tq}
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg px-6 py-7 min-h-full flex flex-col gap-6" style={{ backgroundColor: '#FFFEF9', border: '1px solid var(--border)', color: '#1A1714' }}>
          {doc.lernziele.map((ziel, index) => (
            <section key={`${index}-${ziel.titel}`} aria-label={`Lernziel ${index + 1}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold leading-snug">
                  {index + 1}. {ziel.titel}
                </h3>
                <button
                  type="button"
                  onClick={() => onCreate(ziel)}
                  className="text-xs px-2 py-1 rounded font-medium flex-shrink-0 hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                  title="Arbeitsblatt zu diesem Lernziel erstellen"
                >
                  ✦ Arbeitsblatt
                </button>
              </div>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#EBE5D6' }}>
                    <th className="text-left px-2 py-1.5 font-mono" style={{ width: 48 }}>
                      Stufe
                    </th>
                    <th className="text-left px-2 py-1.5">Binnendifferenzierung</th>
                    <th className="text-left px-2 py-1.5">Beispiel</th>
                  </tr>
                </thead>
                <tbody>
                  {LEVELS.map((level) => {
                    const s = LEVEL_STYLES[level]
                    const row = ziel.niveaus[level]
                    return (
                      <tr key={level} style={{ borderTop: '1px solid #D5CEBB' }}>
                        <td className="px-2 py-1.5 align-top">
                          <span className="font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }} title={s.label}>
                            {level}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 align-top leading-snug">{row?.kompetenz || '–'}</td>
                        <td className="px-2 py-1.5 align-top leading-snug italic" style={{ color: '#6B6354' }}>
                          {row?.beispiel || '–'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 flex items-center gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
        <button
          type="button"
          onClick={() => onCreate(doc.lernziele[0])}
          className="flex-1 px-4 py-2.5 rounded text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          ✦ Arbeitsblatt daraus erstellen
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="px-4 py-2.5 rounded text-sm font-medium hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          Word herunterladen
        </button>
      </div>
    </SlideOver>
  )
}
