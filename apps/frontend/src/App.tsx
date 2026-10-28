import { useEffect, useState } from 'react'
import { NAV_ITEMS } from '@/data/constants'
import { PARTICIPANTS } from '@/data/participants'
import { CURRENT_USER, STAFF_USERS } from '@/data/users'
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
 * dem Backend, alle anderen Seiten arbeiten mit lokalen Beispieldaten.
 * Es gibt noch keine Anmeldung.
 *
 * Seitenuebergreifende Daten (Teilnehmende, Mitarbeiterkonten, gespeicherte
 * Dokumente, Einstellungen) liegen hier, damit sie beim Seitenwechsel erhalten bleiben.
 */
export default function App() {
  const user = CURRENT_USER
  const [activeNav, setActiveNav] = useState<NavItem>('arbeitsblaetter')
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([])
  const [participants, setParticipants] = useState<Participant[]>(PARTICIPANTS)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([...STAFF_USERS])
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  // Lernziel, das von der Seite Lehrpläne an die KI-Erstellung uebergeben wird
  const [kiVorauswahl, setKiVorauswahl] = useState<KiVorauswahl | null>(null)

  function navigate(item: NavItem) {
    setKiVorauswahl(null)
    setActiveNav(item)
  }

  function createFromLehrplan(vorauswahl: KiVorauswahl) {
    setKiVorauswahl(vorauswahl)
    setActiveNav('ki-erstellung')
  }

  useEffect(() => {
    applyTheme(settings)
  }, [settings])

  function handleSaveSettings(next: AppSettings) {
    setSettings(next)
    saveSettings(next)
  }

  const title = NAV_ITEMS.find((item) => item.id === activeNav)?.title ?? ''

  return (
    <div className="flex min-h-screen relative" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <Sidebar user={user} active={activeNav} onNavigate={navigate} compact={settings.sidebarCompact} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} onCreate={() => navigate('ki-erstellung')} />

        <main className="flex-1 p-8 overflow-auto" data-page={activeNav}>
          {activeNav === 'dashboard' && <DashboardPage participants={participants} onNavigate={navigate} />}
          {activeNav === 'lehrplaene' && <LehrplaenePage onCreateWorksheet={createFromLehrplan} />}
          {activeNav === 'arbeitsblaetter' && (
            <ArbeitsblaetterPage user={user} savedDocs={savedDocs} onSavedDocsChange={setSavedDocs} />
          )}
          {activeNav === 'ki-erstellung' && (
            <KiErstellungPage key={kiVorauswahl ? `${kiVorauswahl.berufsfeld}-${kiVorauswahl.titel}` : 'neu'} vorauswahl={kiVorauswahl} />
          )}
          {activeNav === 'teilnehmer' && (
            <TeilnehmendePage participants={participants} onChange={setParticipants} defaultBerufsbild={settings.defaultBerufsbild} />
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
