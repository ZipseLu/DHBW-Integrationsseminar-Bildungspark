import { useState } from 'react'
import { NAV_ITEMS } from '@/data/constants'
import { CURRENT_USER } from '@/data/users'
import { Header } from '@/layout/Header'
import { Sidebar } from '@/layout/Sidebar'
import { ArbeitsblaetterPage } from '@/pages/arbeitsblaetter/ArbeitsblaetterPage'
import { KiErstellungPage } from '@/pages/ki-erstellung/KiErstellungPage'
import type { NavItem, SavedDocument } from '@/types'

/**
 * Prototyp-Frontend der Arbeitsblattverwaltung.
 *
 * Umgesetzt sind die Seiten "Arbeitsblätter" und "KI-Erstellung".
 * Die uebrigen Menuepunkte sind vorhanden, ihre Seiten bleiben leer.
 * Alle Daten sind lokale Beispieldaten, es gibt noch keine Backend-Anbindung
 * und keine Anmeldung.
 */
export default function App() {
  const user = CURRENT_USER
  const [activeNav, setActiveNav] = useState<NavItem>('arbeitsblaetter')
  // Liegt hier statt in der Seite, damit gespeicherte Dokumente beim Seitenwechsel erhalten bleiben
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([])

  const title = NAV_ITEMS.find((item) => item.id === activeNav)?.title ?? ''

  return (
    <div className="flex min-h-screen relative" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar user={user} active={activeNav} onNavigate={setActiveNav} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} onCreate={() => setActiveNav('ki-erstellung')} />

        <main className="flex-1 p-8 overflow-auto" data-page={activeNav}>
          {activeNav === 'arbeitsblaetter' && (
            <ArbeitsblaetterPage user={user} savedDocs={savedDocs} onSavedDocsChange={setSavedDocs} />
          )}
          {activeNav === 'ki-erstellung' && <KiErstellungPage />}
          {/* Dashboard, Teilnehmende, Berichte, Benutzerverwaltung, Einstellungen: noch leer */}
        </main>
      </div>
    </div>
  )
}
