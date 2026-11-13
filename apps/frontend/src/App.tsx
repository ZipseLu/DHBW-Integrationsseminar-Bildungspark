import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { NAV_ITEMS } from '@/data/constants'
import { PARTICIPANTS } from '@/data/participants'
import { STAFF_USERS } from '@/data/users'
import { getSession, setSession, subscribeSession } from '@/lib/session'
import { LoginPage } from '@/pages/anmeldung/LoginPage'
import { Header } from '@/layout/Header'
import { Sidebar } from '@/layout/Sidebar'
import type { KiVorauswahl } from '@/lib/lehrplaene'
import { applyTheme, loadSettings, saveSettings } from '@/lib/settings'
import { ArbeitsblaetterPage } from '@/pages/arbeitsblaetter/ArbeitsblaetterPage'
import { BenutzerverwaltungPage } from '@/pages/benutzerverwaltung/BenutzerverwaltungPage'
import { BerichtePage } from '@/pages/berichte/BerichtePage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { EinstellungenPage } from '@/pages/einstellungen/EinstellungenPage'
import { KiErstellungPage } from '@/pages/ki-erstellung/KiErstellungPage'
import { LehrplaenePage } from '@/pages/lehrplaene/LehrplaenePage'
import { TeilnehmendePage } from '@/pages/teilnehmende/TeilnehmendePage'
import type { AppSettings, NavItem, Participant, SavedDocument, StaffUser } from '@/types'

/**
 * Prototyp-Frontend der Arbeitsblattverwaltung.
 *
 * Alle Seiten des Figma-Mockups sind vorhanden. Die KI-Erstellung spricht mit
 * dem Backend. Die Anmeldung erwartet den in docs/adi-frontend.md beschriebenen
 * BE-01-Vertrag; Mitarbeiter- und Teilnehmerlisten bleiben im Prototyp lokal.
 *
 * Seitenuebergreifende Daten (Teilnehmende, Mitarbeiterkonten, gespeicherte
 * Dokumente, Einstellungen) liegen hier, damit sie beim Seitenwechsel erhalten bleiben.
 */
export default function App() {
  const session = useSyncExternalStore(subscribeSession, getSession)
  return session ? <AuthenticatedApp key={`${session.user.id}-${session.expiresAt}`} user={session.user} onLogout={() => setSession(null)} /> : <LoginPage />
}

export function AuthenticatedApp({ user, onLogout, initialPage = 'dashboard' }: { user: StaffUser; onLogout: () => void; initialPage?: NavItem }) {
  const [activeNav, setActiveNav] = useState<NavItem>(initialPage === 'benutzerverwaltung' && user.role !== 'admin' ? 'dashboard' : initialPage)
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([])
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [participants, setParticipants] = useState<Participant[]>(PARTICIPANTS)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([...STAFF_USERS])
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  // Lernziel, das von der Seite Lehrpläne an die KI-Erstellung uebergeben wird
  const [kiVorauswahl, setKiVorauswahl] = useState<KiVorauswahl | null>(null)

  // Content column is exactly one screen high: only <main> scrolls, sidebar and header stay in place
  const inhaltRef = useRef<HTMLDivElement>(null)

  /** Switches the page and starts the new page at the top */
  function zeigeSeite(item: NavItem) {
    setActiveNav(item)
    const main = inhaltRef.current?.querySelector('main')
    if (main) main.scrollTop = 0
  }

  function navigate(item: NavItem) {
    if (item === 'benutzerverwaltung' && user.role !== 'admin') return
    setKiVorauswahl(null)
    zeigeSeite(item)
  }

  function createFromLehrplan(vorauswahl: KiVorauswahl) {
    setKiVorauswahl(vorauswahl)
    zeigeSeite('ki-erstellung')
  }

  useEffect(() => {
    applyTheme(settings)
  }, [settings])

  function handleSaveSettings(next: AppSettings) {
    setSettings(next)
    saveSettings(next)
  }

  const title = NAV_ITEMS.find((item) => item.id === activeNav)?.title ?? ''

  // Seitentitel im Browser-Tab, damit Screenreader den Seitenwechsel ansagen (FE-15)
  useEffect(() => {
    document.title = title ? `${title} – Arbeitsblattverwaltung` : 'Arbeitsblattverwaltung'
  }, [title])

  return (
    <div className="flex min-h-screen relative" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <a href="#inhalt" className="sprunglink">
        Zum Inhalt springen
      </a>
      <Sidebar user={user} active={activeNav} onNavigate={navigate} compact={settings.sidebarCompact} onLogout={onLogout} />

      <div ref={inhaltRef} className="flex-1 flex flex-col min-w-0 h-screen" data-testid="inhalt-spalte">
        <Header title={title} onCreate={() => navigate('ki-erstellung')} />

        <main id="inhalt" tabIndex={-1} className="flex-1 p-8 overflow-auto focus:outline-none" data-page={activeNav}>
          {activeNav === 'dashboard' && <DashboardPage participants={participants} onNavigate={navigate} />}
          {activeNav === 'lehrplaene' && <LehrplaenePage onCreateWorksheet={createFromLehrplan} />}
          {activeNav === 'arbeitsblaetter' && (
            <ArbeitsblaetterPage
              user={user}
              savedDocs={savedDocs}
              onSavedDocsChange={setSavedDocs}
              favoriteIds={favoriteIds}
              onFavoriteIdsChange={setFavoriteIds}
            />
          )}
          {activeNav === 'ki-erstellung' && (
            <KiErstellungPage key={kiVorauswahl ? `${kiVorauswahl.berufsfeld}-${kiVorauswahl.titel}` : 'neu'} vorauswahl={kiVorauswahl} />
          )}
          {activeNav === 'teilnehmer' && (
            <TeilnehmendePage participants={participants} onChange={setParticipants} defaultBerufsbild={settings.defaultBerufsbild} role={user.role} />
          )}
          {activeNav === 'berichte' && <BerichtePage />}
          {activeNav === 'benutzerverwaltung' && user.role === 'admin' && (
            <BenutzerverwaltungPage currentUser={user} users={staffUsers} onChange={setStaffUsers} />
          )}
          {activeNav === 'einstellungen' && <EinstellungenPage currentUser={user} settings={settings} onSave={handleSaveSettings} />}
        </main>
      </div>
    </div>
  )
}
