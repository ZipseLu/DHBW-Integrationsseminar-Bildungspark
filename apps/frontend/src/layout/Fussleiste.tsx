/**
 * FE-32: footer with the legal links of the Bildungspark.
 *
 * The addresses are set when the app is built (Vite reads VITE_* variables at build
 * time, see .env.example and apps/frontend/Dockerfile): VITE_IMPRESSUM_URL and
 * VITE_DATENSCHUTZ_URL. They are fixed at the handover (OPS-06); a link without an
 * address is not shown, so the footer never points to a wrong page.
 */
const LINKS = [
  { label: 'Impressum', url: import.meta.env.VITE_IMPRESSUM_URL as string | undefined },
  { label: 'Datenschutz', url: import.meta.env.VITE_DATENSCHUTZ_URL as string | undefined },
]

export function Fussleiste({ links = LINKS }: { links?: { label: string; url?: string }[] }) {
  const sichtbar = links.filter((l) => l.url?.trim())

  return (
    <footer className="mt-10 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
      <span>Bildungspark Heilbronn-Franken · Arbeitsblattverwaltung</span>
      {sichtbar.length > 0 && (
        <nav aria-label="Rechtliches" className="flex gap-4">
          {sichtbar.map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </footer>
  )
}
