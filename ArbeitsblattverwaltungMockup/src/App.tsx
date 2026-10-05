import { useState } from 'react'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel,
  convertInchesToTwip,
} from 'docx'
import { saveAs } from 'file-saver'

type Level = 'T' | 'A' | 'F' | 'B'
type NavItem = 'dashboard' | 'arbeitsblätter' | 'ki-erstellung' | 'teilnehmer' | 'berichte' | 'benutzerverwaltung' | 'einstellungen'
type Format = 'text' | 'piktogramm' | 'mathefrei' | 'piktogramm-mathefrei'

type StaffRole = 'admin' | 'dozent' | 'assistent'
type StaffUser = {
  id: string
  name: string
  initials: string
  role: StaffRole
  email: string
  password: string
  createdAt: string
}

const FORMAT_OPTIONS: { id: Format; label: string; icon: string; desc: string }[] = [
  { id: 'text', label: 'Standard-Text', icon: '𝐓', desc: 'Klassisches Textarbeitsblatt in Leichter oder Standardsprache' },
  { id: 'piktogramm', label: 'Mit Piktogrammen', icon: '◉', desc: 'Für Leseanfänger: Aufgaben durch Symbole & Bilder unterstützt' },
  { id: 'mathefrei', label: 'Ohne Rechnen', icon: '≠', desc: 'Für Rechenschwäche: Keine Rechenaufgaben, nur qualitatives Verstehen' },
  { id: 'piktogramm-mathefrei', label: 'Piktogramm + Mathefrei', icon: '◎', desc: 'Kombination: Symbole & keine Rechenschritte – maximale Barrierefreiheit' },
]

const PIKTO_PREVIEW: Record<string, { icon: string; label: string; task: string }[]> = {
  lager: [
    { icon: '📦', label: 'Paket', task: 'Zeige auf das Paket.' },
    { icon: '🏷️', label: 'Etikett', task: 'Klebe das Etikett auf das Paket.' },
    { icon: '🚚', label: 'LKW', task: 'Der LKW kommt. Was machst du?' },
    { icon: '✅', label: 'Haken', task: 'Hake ab, wenn das Paket fertig ist.' },
  ],
  kueche: [
    { icon: '🧼', label: 'Hände waschen', task: 'Erst Hände waschen!' },
    { icon: '🧤', label: 'Handschuhe', task: 'Ziehe Handschuhe an.' },
    { icon: '🍳', label: 'Kochen', task: 'Stelle die Pfanne auf den Herd.' },
    { icon: '🌡️', label: 'Temperatur', task: 'Kontrolliere die Temperatur.' },
  ],
  reinigung: [
    { icon: '🧹', label: 'Besen', task: 'Fege den Boden zuerst.' },
    { icon: '🪣', label: 'Eimer', task: 'Fülle den Eimer mit Wasser.' },
    { icon: '🧽', label: 'Schwamm', task: 'Wische die Oberfläche ab.' },
    { icon: '🚫', label: 'Stopp', task: 'Schild aufstellen: Rutschgefahr!' },
  ],
}

const LEVEL_STYLES: Record<Level, { bg: string; text: string; label: string }> = {
  T: { bg: '#D4EDDA', text: '#1A5C32', label: 'Talentstufe' },
  A: { bg: '#D0E4F7', text: '#1A3A5C', label: 'Aufbaustufe' },
  F: { bg: '#FFF3CD', text: '#7A5C00', label: 'Fachstufe' },
  B: { bg: '#FAD9C8', text: '#7A2E00', label: 'Berufsstufe' },
}

type NiveauRow = { kompetenz: string; beispiel: string }
type Abschnitt = { titel: string; niveaus: Record<Level, NiveauRow> }
type Worksheet = {
  id: number; title: string; berufsbild: string; baustein: number
  ausbildungsbaustein: string; abschnitt: Abschnitt
  createdBy: string; date: string; aiGenerated: boolean; participants: number
  format: Format
}
type SavedDocument = {
  id: string
  name: string
  size: string
  pages: number
  savedAt: string
  savedBy: string
  berufsbild: string
  thema: string
}

type HistoryEntry = {
  version: number
  date: string
  author: string
  action: 'erstellt' | 'bearbeitet' | 'KI-angepasst' | 'freigegeben' | 'archiviert'
  note: string
}

const WORKSHEET_HISTORY: Record<number, HistoryEntry[]> = {
  1: [
    { version: 3, date: '2025-09-24', author: 'C. Hager', action: 'freigegeben', note: 'Freigabe nach interner Prüfung' },
    { version: 2, date: '2025-09-22', author: 'KI-System', action: 'KI-angepasst', note: 'Niveaustufen T und A automatisch verfeinert' },
    { version: 1, date: '2025-09-18', author: 'C. Hager', action: 'erstellt', note: 'Erstentwurf erstellt' },
  ],
  2: [
    { version: 2, date: '2025-09-22', author: 'A. Mustajbegovic', action: 'bearbeitet', note: 'Beispielaufgaben für Niveaustufe B ergänzt' },
    { version: 1, date: '2025-09-15', author: 'A. Mustajbegovic', action: 'erstellt', note: 'Erstentwurf auf Basis Vorgabe erstellt' },
  ],
  3: [
    { version: 3, date: '2025-09-20', author: 'C. Hager', action: 'freigegeben', note: 'Gefahrgutinhalte geprüft und freigegeben' },
    { version: 2, date: '2025-09-19', author: 'KI-System', action: 'KI-angepasst', note: 'Gefahrgutbegriffe vereinfacht für Niveaustufe T' },
    { version: 1, date: '2025-09-10', author: 'C. Hager', action: 'erstellt', note: 'Erstversion nach Curriculum-Überarbeitung' },
  ],
  4: [
    { version: 2, date: '2025-09-18', author: 'KI-System', action: 'KI-angepasst', note: 'Piktogramm-Variante generiert' },
    { version: 1, date: '2025-09-12', author: 'T. Neumann', action: 'erstellt', note: 'Auf Basis Musterdokument erstellt' },
  ],
  5: [
    { version: 2, date: '2025-09-16', author: 'KI-System', action: 'KI-angepasst', note: 'Mathematische Begriffe durch Beschreibungen ersetzt (mathefrei)' },
    { version: 1, date: '2025-09-10', author: 'R. Mayer', action: 'erstellt', note: 'Erstversion Fügetechnik' },
  ],
  6: [
    { version: 3, date: '2025-09-14', author: 'R. Mayer', action: 'bearbeitet', note: 'DGUV-Vorschriften aktualisiert' },
    { version: 2, date: '2025-09-11', author: 'C. Hager', action: 'bearbeitet', note: 'Arbeitssicherheitshinweise ergänzt' },
    { version: 1, date: '2025-09-05', author: 'R. Mayer', action: 'erstellt', note: 'Erstversion Arbeitssicherheit Metallverarbeitung' },
  ],
  7: [
    { version: 2, date: '2025-09-10', author: 'KI-System', action: 'KI-angepasst', note: 'Barrierefreie Piktogramm-Version generiert' },
    { version: 1, date: '2025-09-03', author: 'K. Schmidt', action: 'erstellt', note: 'Hygieneartikel nach HACCP-Standard' },
  ],
  8: [
    { version: 3, date: '2025-09-08', author: 'K. Schmidt', action: 'freigegeben', note: 'Hygieneschulung abgestimmt und freigegeben' },
    { version: 2, date: '2025-09-07', author: 'C. Hager', action: 'bearbeitet', note: 'Reinigungsintervalle gemäß aktuellem Plan aktualisiert' },
    { version: 1, date: '2025-09-01', author: 'K. Schmidt', action: 'erstellt', note: 'Reinigung Küchengeräte nach Hygienekonzept' },
  ],
  9: [
    { version: 2, date: '2025-08-10', author: 'KI-System', action: 'KI-angepasst', note: 'Piktogramm-Variante erstellt' },
    { version: 1, date: '2025-08-01', author: 'C. Hager', action: 'erstellt', note: 'Erstentwurf Reinigungsmittel' },
  ],
  10: [
    { version: 1, date: '2025-08-05', author: 'C. Hager', action: 'erstellt', note: 'KI-generiertes Arbeitsblatt freigegeben' },
  ],
  11: [
    { version: 2, date: '2025-07-28', author: 'T. Neumann', action: 'bearbeitet', note: 'Beispiele für Bürogebäude konkretisiert' },
    { version: 1, date: '2025-07-20', author: 'T. Neumann', action: 'erstellt', note: 'Erstentwurf Unterhaltsreinigung' },
  ],
  12: [
    { version: 2, date: '2025-07-20', author: 'KI-System', action: 'KI-angepasst', note: 'Piktogramm-Version für Talentstufe generiert' },
    { version: 1, date: '2025-07-15', author: 'A. Mustajbegovic', action: 'erstellt', note: 'Sanitärhygiene nach HACCP-Grundlagen' },
  ],
}

const worksheets: Worksheet[] = [
  {
    id: 1, berufsbild: 'Lagerlogistik', baustein: 1,
    ausbildungsbaustein: 'Wareneingang', createdBy: 'C. Hager', date: '2025-09-24', aiGenerated: true, participants: 8, format: 'text' as Format,
    title: 'Begleitpapiere prüfen',
    abschnitt: {
      titel: 'Begleitpapiere unter Berücksichtigung von Zoll- und Gefahrgutvorschriften auf Richtigkeit und Vollständigkeit prüfen',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Prüfung auf Vollständigkeit', beispiel: 'Begleitpapier entgegennehmen und dem Anleiter übergeben' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Prüfung auf Vollständigkeit', beispiel: 'Begleitpapiere von bekannten Lieferungen entgegennehmen und kontrollieren. Bei Abweichungen den Anleiter informieren.' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte unter Berücksichtigung von Zoll- und Gefahrgutvorschriften und kann diese in bekannten Situationen anwenden', beispiel: 'Begleitpapiere von Lieferungen entgegennehmen und kontrollieren. Bei Abweichungen den Anleiter informieren.' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte und kann diese in neuen Situationen anwenden', beispiel: 'Begleitpapiere eingehender Lieferungen entgegennehmen und kontrollieren. Bei Abweichungen Maßnahmen ergreifen.' },
      },
    },
  },
  {
    id: 2, berufsbild: 'Lagerlogistik', baustein: 1,
    ausbildungsbaustein: 'Wareneingang', createdBy: 'A. Mustajbegovic', date: '2025-09-22', aiGenerated: false, participants: 12, format: 'piktogramm' as Format,
    title: 'Güter entladen',
    abschnitt: {
      titel: 'Güter entladen',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Entladung von Gütern', beispiel: 'Informiert den Anleiter, dass ein LKW zur Entladung bereit steht.' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Entladung von Gütern', beispiel: 'Übernimmt bei der Entladung von bekannten Gütern vorgegebene Aufgaben (z.B. mit dem Hubwagen abtransportieren).' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte bei der Entladung und kann diese in bekannten Situationen anwenden', beispiel: 'Kontrolliert den Lieferschein und übernimmt den innerbetrieblichen Transport.' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte bei der Entladung und kann diese in neuen Situationen anwenden', beispiel: 'Kontrolliert den Lieferschein, übernimmt den Transport und wählt das geeignete Transportmittel aus.' },
      },
    },
  },
  {
    id: 3, berufsbild: 'Lagerlogistik', baustein: 1,
    ausbildungsbaustein: 'Innerbetrieblicher Transport', createdBy: 'C. Hager', date: '2025-09-20', aiGenerated: true, participants: 6, format: 'text' as Format,
    title: 'Gesetzliche Vorschriften bei Verpackung und Transport',
    abschnitt: {
      titel: 'Gesetzliche und betriebliche Vorschriften bei Verpackung und Transport anwenden',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Handhabung von Verpackung und/oder Transport', beispiel: 'Transportiert schwere Güter mit Handwagen' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Handhabung von Verpackung und Transport', beispiel: 'Kennzeichnet bekannte verpackte Güter wie vorgegeben.' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte und wendet gesetzliche und betriebliche Vorschriften in bekannten Situationen an', beispiel: 'Kennzeichnet verschiedene immer wieder vorkommende Güter wie erlernt.' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte und kann diese in neuen Situationen anwenden', beispiel: 'Kennzeichnet Güter nach gesetzlicher und betrieblicher Vorgabe für den Versand.' },
      },
    },
  },
  {
    id: 4, berufsbild: 'Lagerlogistik', baustein: 3,
    ausbildungsbaustein: 'Lagerung von Gütern', createdBy: 'T. Neumann', date: '2025-09-18', aiGenerated: true, participants: 4, format: 'text' as Format,
    title: 'Güter auszeichnen und sortieren',
    abschnitt: {
      titel: 'Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden sowie zur Lagerung vorbereiten',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Auszeichnung und/oder Sortierung der Güter', beispiel: 'Güter auszeichnen und sortieren' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei Auszeichnung und/oder Sortierung', beispiel: 'Güter auszeichnen, sortieren und zu Lager- und Verkaufseinheiten bündeln' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte und kann diese in bekannten Situationen anwenden', beispiel: 'Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden sowie zur Lagerung vorbereiten' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte und kann diese in neuen Situationen anwenden', beispiel: 'Selbständig Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden, Güter zur Lagerung vorbereiten sowie Ladungsträger aussuchen' },
      },
    },
  },
  {
    id: 5, berufsbild: 'Metallverarbeitung', baustein: 1,
    ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', createdBy: 'S. Oturucu', date: '2025-09-17', aiGenerated: false, participants: 9, format: 'text' as Format,
    title: 'Planung der Herstellung durch Fügen',
    abschnitt: {
      titel: 'Planung der Herstellung von Bauteilen durch Fügen – Gesamtzeichnungen, Stücklisten, Montagepläne',
      niveaus: {
        T: { kompetenz: 'Beherrscht eine erlernte Anwendung einer Gesamtzeichnung, Stückliste, Montagepläne', beispiel: 'Teile nach Montageplan heraussuchen' },
        A: { kompetenz: 'Beherrscht eine vorgegebene bekannte Anwendung einer Gesamtzeichnung, Stückliste, Montagepläne', beispiel: 'Teile nach Montageplan kontrollieren' },
        F: { kompetenz: 'Beherrscht die erlernte Anfertigung und Anwendung und kann diese in neuen Situationen anwenden', beispiel: 'Montageplan auswählen und Bauteile nach Maß kontrollieren' },
        B: { kompetenz: 'Beherrscht die gängige Anfertigung und Anwendung und kann diese in neuen Situationen anwenden', beispiel: 'Montageplan auswählen und anwenden, Handskizzen zur Montage können erstellt werden' },
      },
    },
  },
  {
    id: 6, berufsbild: 'Metallverarbeitung', baustein: 1,
    ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', createdBy: 'C. Hager', date: '2025-09-15', aiGenerated: false, participants: 11, format: 'text' as Format,
    title: 'Einrichtung des Arbeitsplatzes / Arbeitssicherheit',
    abschnitt: {
      titel: 'Einrichtung des Arbeitsplatzes unter Berücksichtigung betrieblicher Vorgaben – Gefahren und Sicherheitsvorgaben',
      niveaus: {
        T: { kompetenz: 'Beherrscht eine erlernte Grundlage der Arbeitssicherheit', beispiel: 'Benennt die wichtigsten Arbeitsschutzzeichen' },
        A: { kompetenz: 'Beherrscht vorgegebene bekannte Gefahren- und Sicherheitsvorgaben und Maßnahmen zu ihrer Vermeidung', beispiel: 'Benennt Arbeitsschutzzeichen, ordnet direkte Gefährdungen zu und benutzt entsprechende PSA' },
        F: { kompetenz: 'Beherrscht die erlernten Gefahren- und Sicherheitsvorgaben und kann Maßnahmen in bekannten Situationen anwenden', beispiel: 'Benennt Zeichen und Inhalte, benutzt PSA und Sicherheitsvorrichtungen. Beseitigt Störungen unter Anleitung.' },
        B: { kompetenz: 'Beherrscht gängige Verfahren zur Feststellung der Gefährdung und kann Maßnahmen in neuen Situationen anwenden', beispiel: 'Kennt alle Arbeitsschutzzeichen, Gefahrstoffverordnungen, Gefährdungsbeurteilungen und kann Maßnahmen anwenden.' },
      },
    },
  },
  {
    id: 7, berufsbild: 'Küche & Gastronomie', baustein: 2,
    ausbildungsbaustein: 'Hygiene', createdBy: 'O. Oláh', date: '2025-09-12', aiGenerated: true, participants: 5, format: 'mathefrei' as Format,
    title: 'Personal- und Betriebshygiene',
    abschnitt: {
      titel: 'Vorschriften und Grundsätze zur Personal- und Betriebshygiene anwenden',
      niveaus: {
        T: { kompetenz: 'Beherrscht eine erlernte Vorschrift/Grundsatz zur Personal- und Betriebshygiene', beispiel: 'Wäscht und desinfiziert seine Hände nach Vorgabe' },
        A: { kompetenz: 'Beherrscht vorgegebene bekannte Vorschriften und Grundsätze zur Personal- und Betriebshygiene', beispiel: 'Wäscht und desinfiziert Hände nach Vorgabe und setzt ein Haarnetz auf' },
        F: { kompetenz: 'Beherrscht erlernte Vorschriften und kann diese in bekannten Situationen anwenden', beispiel: 'Wäscht und desinfiziert Hände, setzt Haarnetz auf und reinigt Arbeitsmittel nach Vorgabe' },
        B: { kompetenz: 'Beherrscht die gängigen Vorschriften und kann diese in neuen Situationen anwenden', beispiel: 'Alle Hygienemaßnahmen inklusive Produkthygiene werden vollständig eingehalten.' },
      },
    },
  },
  {
    id: 8, berufsbild: 'Küche & Gastronomie', baustein: 2,
    ausbildungsbaustein: 'Hygiene', createdBy: 'A. Mustajbegovic', date: '2025-09-10', aiGenerated: true, participants: 7, format: 'text' as Format,
    title: 'Geräte, Maschinen und Gebrauchsgüter reinigen',
    abschnitt: {
      titel: 'Geräte, Maschinen und Gebrauchsgüter reinigen und pflegen',
      niveaus: {
        T: { kompetenz: 'Beherrscht die erlernte Reinigung und Pflege eines Gerätes, einer Maschine oder eines Gebrauchsgutes', beispiel: 'Kann Schüsseln reinigen' },
        A: { kompetenz: 'Beherrscht die vorgegebene bekannte Reinigung und Pflege von Geräten, Maschinen oder Gebrauchsgütern', beispiel: 'Kann Schüsseln, Pfannen, Töpfe, Messer nach Vorgabe reinigen' },
        F: { kompetenz: 'Beherrscht die erlernte Reinigung und Pflege und kann diese in bekannten Situationen anwenden', beispiel: 'Kann Herde und Backöfen nach Vorgabe reinigen' },
        B: { kompetenz: 'Beherrscht die gängige Reinigung und Pflege und kann diese in neuen Situationen anwenden', beispiel: 'Kann alle Geräte, Maschinen und Gebrauchsgüter nach Vorgabe reinigen' },
      },
    },
  },
  {
    id: 9, berufsbild: 'Reinigung & Gebäudepflege', baustein: 1,
    ausbildungsbaustein: 'Reinigungsverfahren', createdBy: 'C. Hager', date: '2025-08-10', aiGenerated: false, participants: 5, format: 'piktogramm' as Format,
    title: 'Reinigungsmittel auswählen und anwenden',
    abschnitt: {
      titel: 'Reinigungsmittel sachgerecht auswählen und anwenden',
      niveaus: {
        T: { kompetenz: 'Kennt einen erlernten Reinigungsmitteltyp', beispiel: 'Kann Allzweckreiniger mit Anleitung dosieren und anwenden' },
        A: { kompetenz: 'Kennt verschiedene Reinigungsmittel und kann sie nach Vorgabe auswählen', beispiel: 'Wählt für Böden, Glas und Sanitär je das passende Mittel aus' },
        F: { kompetenz: 'Wählt Reinigungsmittel situationsgerecht aus und berücksichtigt Dosierung', beispiel: 'Dosiert Konzentrate korrekt und beachtet Einwirkzeiten' },
        B: { kompetenz: 'Wendet Reinigungsmittel fachgerecht an und beachtet Sicherheitsvorschriften', beispiel: 'Erstellt Verdünnungspläne und unterweist Kollegen' },
      },
    },
  },
  {
    id: 10, berufsbild: 'Reinigung & Gebäudepflege', baustein: 1,
    ausbildungsbaustein: 'Reinigungsverfahren', createdBy: 'C. Hager', date: '2025-08-05', aiGenerated: true, participants: 6, format: 'text' as Format,
    title: 'Reinigungsgeräte bedienen und pflegen',
    abschnitt: {
      titel: 'Reinigungsgeräte sachgerecht bedienen und instand halten',
      niveaus: {
        T: { kompetenz: 'Bedient einen erlernten Gerätetyp unter Aufsicht', beispiel: 'Kann Mopp und Eimer unter Anleitung einsetzen' },
        A: { kompetenz: 'Bedient gängige Reinigungsgeräte nach Vorgabe', beispiel: 'Setzt Wischmopp, Staubsauger und Einscheibenmaschine korrekt ein' },
        F: { kompetenz: 'Bedient und pflegt Reinigungsgeräte eigenständig', beispiel: 'Reinigt und wartet Geräte nach Herstellervorgabe' },
        B: { kompetenz: 'Wählt Geräte situationsgerecht aus und koordiniert deren Einsatz', beispiel: 'Erstellt Geräteeinsatzplan für das Team' },
      },
    },
  },
  {
    id: 11, berufsbild: 'Reinigung & Gebäudepflege', baustein: 2,
    ausbildungsbaustein: 'Unterhaltsreinigung', createdBy: 'T. Neumann', date: '2025-07-28', aiGenerated: false, participants: 4, format: 'text' as Format,
    title: 'Unterhaltsreinigung im Bürobereich',
    abschnitt: {
      titel: 'Unterhaltsreinigung in Büro- und Verwaltungsgebäuden durchführen',
      niveaus: {
        T: { kompetenz: 'Führt Grundaufgaben der Unterhaltsreinigung mit Anleitung durch', beispiel: 'Leert Papierkörbe und saugt Teppiche nach Vorgabe' },
        A: { kompetenz: 'Reinigt Büroräume nach vorgegebenem Ablaufplan', beispiel: 'Reinigt Schreibtische, Böden und Sanitäranlagen nach Plan' },
        F: { kompetenz: 'Plant und führt Unterhaltsreinigung eigenständig durch', beispiel: 'Erstellt eigenen Reinigungsablauf und hält Zeitplan ein' },
        B: { kompetenz: 'Optimiert Reinigungsabläufe und gibt Qualität frei', beispiel: 'Prüft Ergebnisse und gibt Feedback an Teammitglieder' },
      },
    },
  },
  {
    id: 12, berufsbild: 'Reinigung & Gebäudepflege', baustein: 2,
    ausbildungsbaustein: 'Unterhaltsreinigung', createdBy: 'A. Mustajbegovic', date: '2025-07-20', aiGenerated: true, participants: 5, format: 'piktogramm' as Format,
    title: 'Sanitärreinigung und Hygiene',
    abschnitt: {
      titel: 'Sanitärbereiche hygienisch reinigen und desinfizieren',
      niveaus: {
        T: { kompetenz: 'Reinigt Sanitäranlagen unter Aufsicht nach Anleitung', beispiel: 'Wischt WC und Waschbecken mit Reinigungsmittel ab' },
        A: { kompetenz: 'Reinigt und desinfiziert Sanitäranlagen nach Vorgabe', beispiel: 'Führt vollständige Sanitärreinigung nach Checkliste durch' },
        F: { kompetenz: 'Desinfiziert Sanitäranlagen fachgerecht und dokumentiert', beispiel: 'Wählt Desinfektionsmittel korrekt aus und dokumentiert Maßnahmen' },
        B: { kompetenz: 'Koordiniert Hygienemanagement im Sanitärbereich', beispiel: 'Erstellt Hygienepläne und schult Mitarbeiter' },
      },
    },
  },
]

type BerufStation = {
  berufsbild: string
  level: Level
  format: Format
  progress: number
  status: 'abgeschlossen' | 'aktiv' | 'ausstehend'
  startDate: string
  endDate?: string
  worksheetsDone: number
  worksheetsTotal: number
}

type Participant = {
  id: string
  name: string
  level: Level
  progress: number
  lastActive: string
  berufsbilder: BerufStation[]
}

const participantsData: Participant[] = [
  {
    id: 'IW3-4421', name: 'Anonym A', level: 'A' as Level, progress: 68, lastActive: '2025-09-25',
    berufsbilder: [
      { berufsbild: 'Reinigung & Gebäudepflege', level: 'T', format: 'piktogramm' as Format, progress: 100, status: 'abgeschlossen', startDate: '2025-07-01', endDate: '2025-08-12', worksheetsDone: 8, worksheetsTotal: 8 },
      { berufsbild: 'Lagerlogistik', level: 'A', format: 'text' as Format, progress: 68, status: 'aktiv', startDate: '2025-08-13', worksheetsDone: 5, worksheetsTotal: 7 },
      { berufsbild: 'Metallverarbeitung', level: 'A', format: 'mathefrei' as Format, progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0, worksheetsTotal: 6 },
    ],
  },
  {
    id: 'IW3-4388', name: 'Anonym B', level: 'F' as Level, progress: 82, lastActive: '2025-09-24',
    berufsbilder: [
      { berufsbild: 'Küche & Gastronomie', level: 'T', format: 'text' as Format, progress: 100, status: 'abgeschlossen', startDate: '2025-06-15', endDate: '2025-07-30', worksheetsDone: 9, worksheetsTotal: 9 },
      { berufsbild: 'Lagerlogistik', level: 'A', format: 'piktogramm' as Format, progress: 100, status: 'abgeschlossen', startDate: '2025-07-31', endDate: '2025-08-28', worksheetsDone: 7, worksheetsTotal: 7 },
      { berufsbild: 'Lagerlogistik', level: 'F', format: 'piktogramm-mathefrei' as Format, progress: 82, status: 'aktiv', startDate: '2025-08-29', worksheetsDone: 6, worksheetsTotal: 7 },
    ],
  },
  {
    id: 'IW3-4412', name: 'Anonym C', level: 'T' as Level, progress: 34, lastActive: '2025-09-23',
    berufsbilder: [
      { berufsbild: 'Küche & Gastronomie', level: 'T', format: 'piktogramm-mathefrei' as Format, progress: 34, status: 'aktiv', startDate: '2025-09-01', worksheetsDone: 3, worksheetsTotal: 9 },
      { berufsbild: 'Reinigung & Gebäudepflege', level: 'T', format: 'piktogramm' as Format, progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0, worksheetsTotal: 8 },
    ],
  },
  {
    id: 'IW3-4399', name: 'Anonym D', level: 'A' as Level, progress: 57, lastActive: '2025-09-22',
    berufsbilder: [
      { berufsbild: 'Reinigung & Gebäudepflege', level: 'T', format: 'mathefrei' as Format, progress: 100, status: 'abgeschlossen', startDate: '2025-07-10', endDate: '2025-08-20', worksheetsDone: 8, worksheetsTotal: 8 },
      { berufsbild: 'Küche & Gastronomie', level: 'A', format: 'text' as Format, progress: 57, status: 'aktiv', startDate: '2025-08-21', worksheetsDone: 4, worksheetsTotal: 7 },
    ],
  },
  {
    id: 'IW3-4401', name: 'Anonym E', level: 'T' as Level, progress: 21, lastActive: '2025-09-20',
    berufsbilder: [
      { berufsbild: 'Reinigung & Gebäudepflege', level: 'T', format: 'text' as Format, progress: 21, status: 'aktiv', startDate: '2025-09-08', worksheetsDone: 2, worksheetsTotal: 8 },
      { berufsbild: 'Lagerlogistik', level: 'T', format: 'piktogramm' as Format, progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0, worksheetsTotal: 8 },
      { berufsbild: 'Metallverarbeitung', level: 'T', format: 'mathefrei' as Format, progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0, worksheetsTotal: 6 },
    ],
  },
]

const navItems: { id: NavItem; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'arbeitsblätter', label: 'Arbeitsblätter', icon: '▦' },
  { id: 'ki-erstellung', label: 'KI-Erstellung', icon: '✦' },
  { id: 'teilnehmer', label: 'Teilnehmende', icon: '◎' },
  { id: 'berichte', label: 'Berichte', icon: '◱' },
  { id: 'benutzerverwaltung', label: 'Benutzerverwaltung', icon: '⊙', adminOnly: true },
  { id: 'einstellungen', label: 'Einstellungen', icon: '⚙' },
]

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrator',
  dozent: 'Dozent/in',
  assistent: 'Assistent/in',
}

const initialStaffUsers: StaffUser[] = [
  { id: 'u1', name: 'Celine Hager', initials: 'CH', role: 'admin', email: 'c.hager@bildungspark.de', password: 'admin123', createdAt: '2024-01-10' },
  { id: 'u2', name: 'A. Mustajbegovic', initials: 'AM', role: 'dozent', email: 'a.mustajbegovic@bildungspark.de', password: 'dozent123', createdAt: '2024-03-05' },
  { id: 'u3', name: 'T. Neumann', initials: 'TN', role: 'dozent', email: 't.neumann@bildungspark.de', password: 'dozent123', createdAt: '2024-05-18' },
  { id: 'u4', name: 'S. Oturucu', initials: 'SO', role: 'assistent', email: 's.oturucu@bildungspark.de', password: 'assist123', createdAt: '2025-02-01' },
]

const berufsbilder = ['Alle Berufsbilder', 'Lagerlogistik', 'Küche & Gastronomie', 'Reinigung & Gebäudepflege', 'Metallverarbeitung']
const levels: (Level | 'Alle')[] = ['Alle', 'T', 'A', 'F', 'B']

function LevelBadge({ level }: { level: Level }) {
  const s = LEVEL_STYLES[level]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
      title={s.label}
    >
      {level}
    </span>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-1"
      style={{
        backgroundColor: accent ? 'var(--primary)' : 'var(--card)',
        color: accent ? 'var(--primary-foreground)' : 'var(--card-foreground)',
        border: accent ? 'none' : '1px solid var(--border)',
      }}
    >
      <span className="text-xs font-medium tracking-wide uppercase opacity-70" style={{ fontFamily: 'DM Mono, monospace' }}>{label}</span>
      <span className="text-3xl font-display font-semibold leading-none">{value}</span>
      {sub && <span className="text-xs opacity-60 mt-1">{sub}</span>}
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: 'var(--muted)' }}>
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: value > 70 ? '#2A7A4B' : value > 40 ? 'var(--primary)' : 'var(--accent)' }}
      />
    </div>
  )
}

// Per-level preview content for the transform panel
const TRANSFORM_PREVIEWS: Record<Level, { aufgaben: string[]; hinweis: string }> = {
  T: {
    hinweis: 'Sehr kurze Sätze. Einfache Wörter. Bilder helfen.',
    aufgaben: [
      'Schau das Bild an. Was siehst du?',
      'Zeige mit dem Finger auf die Sicherheitsausrüstung.',
      'Male einen Helm. Ein Helm schützt dich.',
    ],
  },
  A: {
    hinweis: 'Kurze Sätze. Bekannte Wörter. Aufgaben Schritt für Schritt.',
    aufgaben: [
      'Lies die Sicherheitsregeln. Unterstreiche wichtige Wörter.',
      'Was musst du VOR der Arbeit anziehen? Schreibe zwei Dinge auf.',
      'Ordne die Schritte in die richtige Reihenfolge.',
    ],
  },
  F: {
    hinweis: 'Fachbegriffe werden erklärt. Aufgaben mit Kontext.',
    aufgaben: [
      'Beschreibe den Unterschied zwischen PSA Klasse I und Klasse II.',
      'Erkläre, warum Sicherheitsschuhe wichtig sind. Nenne zwei Gründe.',
      'Fülle das Sicherheitsprotokoll für einen Arbeitsunfall aus.',
    ],
  },
  B: {
    hinweis: 'Vollständige Fachsprache. Komplexe Aufgaben. Eigenständiges Arbeiten.',
    aufgaben: [
      'Analysiere die Gefährdungsbeurteilung und identifiziere drei Risikobereiche.',
      'Erstelle einen Maßnahmenplan zur Unfallprävention gemäß DGUV Vorschrift 1.',
      'Bewerte die gegebene Situation und leite geeignete Schutzmaßnahmen ab.',
    ],
  },
}

// Persona letter per (level, format) — maps to the 4×4 grid on the dashboard
const PERSONA_MAP: Record<Level, Record<Format, string>> = {
  T: { text: 'A', piktogramm: 'B', mathefrei: 'C', 'piktogramm-mathefrei': 'D' },
  A: { text: 'E', piktogramm: 'F', mathefrei: 'G', 'piktogramm-mathefrei': 'H' },
  F: { text: 'I', piktogramm: 'J', mathefrei: 'K', 'piktogramm-mathefrei': 'L' },
  B: { text: 'M', piktogramm: 'N', mathefrei: 'O', 'piktogramm-mathefrei': 'P' },
}

// Level colors as hex for docx shading
const LEVEL_DOCX_COLORS: Record<Level, { fill: string; text: string }> = {
  T: { fill: 'D4EDDA', text: '1A5C32' },
  A: { fill: 'D0E4F7', text: '1A3A5C' },
  F: { fill: 'FFF3CD', text: '7A5C00' },
  B: { fill: 'FAD9C8', text: '7A2E00' },
}
const LEVEL_LABELS: Record<Level, string> = {
  T: 'Talentstufe', A: 'Aufbaustufe', F: 'Fachstufe', B: 'Berufsstufe',
}

async function generateAndDownloadDocx(w: Worksheet) {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

  // Header section
  const headerRows = [
    new Paragraph({
      children: [new TextRun({ text: 'BILDUNGSPARK HEILBRONN-FRANKEN', size: 16, color: '1E3A5F', bold: true, font: 'Calibri' })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: w.title, size: 36, bold: true, color: '1A1714', font: 'Calibri' })],
      spacing: { before: 120, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${w.berufsbild}  ·  Baustein ${w.baustein}  ·  ${w.ausbildungsbaustein}`, size: 20, color: '6B6354', font: 'Calibri' }),
      ],
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Abschnitt', size: 18, bold: true, color: '1E3A5F', font: 'Calibri', allCaps: true })],
      spacing: { before: 120, after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: w.abschnitt.titel, size: 22, color: '1A1714', font: 'Calibri' })],
      spacing: { after: 360 },
    }),
  ]

  // Binnendifferenzierung table
  const headerRow = new TableRow({
    tableHeader: true,
    children: (['T', 'A', 'F', 'B'] as Level[]).map(l => {
      const c = LEVEL_DOCX_COLORS[l]
      return new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, fill: c.fill },
        borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 2, color: c.text }, left: noBorder, right: noBorder },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: l, bold: true, size: 28, color: c.text, font: 'Calibri' }),
            new TextRun({ text: `\n${LEVEL_LABELS[l]}`, size: 16, color: c.text, font: 'Calibri' }),
          ],
          spacing: { before: 80, after: 80 },
        })],
      })
    }),
  })

  const kompetenzRow = new TableRow({
    children: (['T', 'A', 'F', 'B'] as Level[]).map(l => {
      const c = LEVEL_DOCX_COLORS[l]
      return new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, fill: 'FFFEF9' },
        borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'D5CEBB' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D5CEBB' }, left: noBorder, right: noBorder },
        margins: { top: convertInchesToTwip(0.08), bottom: convertInchesToTwip(0.08), left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Kompetenz', size: 14, color: '6B6354', bold: true, font: 'Calibri', allCaps: true })], spacing: { after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: w.abschnitt.niveaus[l].kompetenz, size: 18, color: '1A1714', font: 'Calibri' })], spacing: { after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: 'Aufgabe / Beispiel', size: 14, color: c.text, bold: true, font: 'Calibri', allCaps: true })], spacing: { after: 40 } }),
          new Paragraph({
            shading: { type: ShadingType.SOLID, fill: c.fill },
            children: [new TextRun({ text: w.abschnitt.niveaus[l].beispiel, size: 18, color: c.text, italics: true, font: 'Calibri' })],
            spacing: { before: 40, after: 40 },
            indent: { left: convertInchesToTwip(0.08) },
          }),
        ],
      })
    }),
  })

  const differenzierungTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, kompetenzRow],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  })

  // Footer
  const footerRows = [
    new Paragraph({ spacing: { before: 480 } }),
    new Paragraph({
      children: [
        new TextRun({ text: `Erstellt von: ${w.createdBy}  ·  Datum: ${w.date}  ·  ${w.aiGenerated ? 'KI-generiert' : 'Manuell erstellt'}`, size: 16, color: '6B6354', font: 'Calibri' }),
      ],
    }),
  ]

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1.2),
            bottom: convertInchesToTwip(1.2),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1.2),
          },
        },
      },
      children: [...headerRows, differenzierungTable, ...footerRows],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${w.berufsbild}_BS${w.baustein}_${w.title.replace(/\s+/g, '_')}.docx`)
}

export default function App() {
  // Auth
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(initialStaffUsers)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'dozent' as StaffRole, password: '' })
  const [userFormError, setUserFormError] = useState('')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const user = staffUsers.find(u => u.email === loginEmail.trim() && u.password === loginPassword)
    if (user) {
      setCurrentUser(user)
      setLoginError('')
      setLoginEmail('')
      setLoginPassword('')
    } else {
      setLoginError('E-Mail-Adresse oder Passwort ist falsch.')
    }
  }

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()) {
      setUserFormError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }
    if (staffUsers.find(u => u.email === newUserForm.email.trim())) {
      setUserFormError('Diese E-Mail-Adresse ist bereits vergeben.')
      return
    }
    const initials = newUserForm.name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    const newUser: StaffUser = {
      id: `u${Date.now()}`,
      name: newUserForm.name.trim(),
      initials,
      role: newUserForm.role,
      email: newUserForm.email.trim(),
      password: newUserForm.password,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setStaffUsers(prev => [...prev, newUser])
    setShowAddUser(false)
    setNewUserForm({ name: '', email: '', role: 'dozent', password: '' })
    setUserFormError('')
  }

  function handleDeleteUser(id: string) {
    if (id === currentUser?.id) return
    setStaffUsers(prev => prev.filter(u => u.id !== id))
  }

  // Settings
  type AppSettings = {
    darkMode: boolean
    accentColor: string
    primaryColor: string
    sidebarCompact: boolean
    defaultBerufsbild: string
    aiAutoExpand: boolean
    showPersonaBadges: boolean
    language: 'de' | 'en'
    dateFormat: 'DD.MM.YYYY' | 'YYYY-MM-DD'
    exportFormat: 'docx' | 'pdf'
    sessionTimeout: '30' | '60' | '120' | 'never'
    emailNotifications: boolean
    worksheetReminders: boolean
    autoSave: boolean
  }
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    accentColor: '#C4632A',
    primaryColor: '#1E3A5F',
    sidebarCompact: false,
    defaultBerufsbild: 'Lagerlogistik',
    aiAutoExpand: true,
    showPersonaBadges: true,
    language: 'de',
    dateFormat: 'DD.MM.YYYY',
    exportFormat: 'docx',
    sessionTimeout: '60',
    emailNotifications: false,
    worksheetReminders: true,
    autoSave: true,
  })
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Password change
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    setPwError('')
    if (pwCurrent !== currentUser.password) { setPwError('Das aktuelle Passwort ist falsch.'); return }
    if (pwNew.length < 8) { setPwError('Das neue Passwort muss mindestens 8 Zeichen lang sein.'); return }
    if (pwNew !== pwConfirm) { setPwError('Die neuen Passwörter stimmen nicht überein.'); return }
    setStaffUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: pwNew } : u))
    setCurrentUser(u => u ? { ...u, password: pwNew } : u)
    setPwCurrent(''); setPwNew(''); setPwConfirm('')
    setPwSuccess(true)
    setTimeout(() => setPwSuccess(false), 3000)
  }

  function applyTheme(s: AppSettings) {
    const root = document.documentElement
    root.style.setProperty('--accent', s.accentColor)
    root.style.setProperty('--primary', s.primaryColor)
    if (s.darkMode) {
      root.style.setProperty('--background', '#1A1714')
      root.style.setProperty('--foreground', '#F5F1E8')
      root.style.setProperty('--card', '#242019')
      root.style.setProperty('--muted', '#2C2820')
      root.style.setProperty('--muted-foreground', '#9B9283')
      root.style.setProperty('--border', '#3A352C')
    } else {
      root.style.setProperty('--background', '#F5F1E8')
      root.style.setProperty('--foreground', '#1A1714')
      root.style.setProperty('--card', '#FDFAF3')
      root.style.setProperty('--muted', '#EBE5D6')
      root.style.setProperty('--muted-foreground', '#6B6354')
      root.style.setProperty('--border', '#D5CEBB')
    }
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    applyTheme(settings)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2500)
  }

  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [filterBeruf, setFilterBeruf] = useState('Alle Berufsbilder')
  const [filterBaustein, setFilterBaustein] = useState<number | 'Alle'>('Alle')
  const [filterAusbildungsbaustein, setFilterAusbildungsbaustein] = useState('Alle')
  const [filterLevel, setFilterLevel] = useState<Level | 'Alle'>('Alle')
  const [search, setSearch] = useState('')
  const [expandedWsId, setExpandedWsId] = useState<number | null>(null)
  const [aiForm, setAiForm] = useState({ thema: '', berufsbild: 'Lagerlogistik', level: 'A' as Level, sprache: 'Leichte Sprache', format: 'text' as Format })
  const [aiLevels, setAiLevels] = useState<Level[]>(['A'])
  const [aiFormats, setAiFormats] = useState<Format[]>(['text'])
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiDone, setAiDone] = useState(false)
  const [webResultsOpen, setWebResultsOpen] = useState(true)
  const [aiExpectations, setAiExpectations] = useState('')
  const [webSearchQuery, setWebSearchQuery] = useState('')
  const [webSearching, setWebSearching] = useState(false)
  const [webResults, setWebResults] = useState<{ title: string; url: string; snippet: string; source: string }[]>([])
  const [webResultsFor, setWebResultsFor] = useState('')
  const [selectedWebResult, setSelectedWebResult] = useState<string | null>(null)
  const [webAdapting, setWebAdapting] = useState(false)
  const [webAdaptDone, setWebAdaptDone] = useState(false)
  const [webAdaptLevels, setWebAdaptLevels] = useState<Level[]>(['T', 'A', 'F', 'B'])
  const [webAdaptFormats, setWebAdaptFormats] = useState<Format[]>(['text'])

  // Transform panel state
  const [transformSheet, setTransformSheet] = useState<Worksheet | null>(null)
  const [transformLevel, setTransformLevel] = useState<Level>('T')
  const [transformFormat, setTransformFormat] = useState<Format>('text')
  const [transformSprache, setTransformSprache] = useState('Leichte Sprache')
  const [transforming, setTransforming] = useState(false)
  const [transformDone, setTransformDone] = useState(false)
  // Which levels to generate (multi-select for batch)
  const [batchLevels, setBatchLevels] = useState<Level[]>(['T', 'A', 'F', 'B'])
  const [batchFormats, setBatchFormats] = useState<Format[]>(['text'])

  // Saved external documents
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([])

  // Worksheet detail panel (history + preview)
  const [detailSheet, setDetailSheet] = useState<Worksheet | null>(null)
  const [detailTab, setDetailTab] = useState<'vorschau' | 'verlauf'>('vorschau')

  const [openPersonaLevels, setOpenPersonaLevels] = useState<Set<Level>>(new Set())
  function togglePersonaLevel(lvl: Level) {
    setOpenPersonaLevels(prev => {
      const next = new Set(prev)
      next.has(lvl) ? next.delete(lvl) : next.add(lvl)
      return next
    })
  }

  // Participant detail panel
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [collapsedWsParticipants, setCollapsedWsParticipants] = useState<Set<string>>(new Set())
  const [detailBerufsbild, setDetailBerufsbild] = useState<Record<string, number>>({}); // participantId → berufsbild index
  const [assignWsParticipant, setAssignWsParticipant] = useState<Participant | null>(null)
  const [assignWsId, setAssignWsId] = useState<number | null>(null)

  function toggleWsCollapse(id: string) {
    setCollapsedWsParticipants(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exportProgress(p: Participant) {
    const lines: string[] = [
      `Fortschrittsbericht – ${p.id}`,
      `Erstellt: ${new Date().toLocaleDateString('de-DE')}`,
      '',
      'BERUFSBILDER:',
    ]
    p.berufsbilder.forEach((b, i) => {
      lines.push(`  ${i + 1}. ${b.berufsbild} (${LEVEL_STYLES[b.level].label}) — ${b.status}`)
      lines.push(`     Arbeitsblätter: ${b.worksheetsDone} erledigt`)
      if (b.startDate) lines.push(`     Start: ${b.startDate}${b.endDate ? `  Abschluss: ${b.endDate}` : ''}`)
      lines.push(`     Persona: ${PERSONA_MAP[b.level][b.format]} (${FORMAT_OPTIONS.find(o => o.id === b.format)?.label})`)
    })
    lines.push('')
    lines.push(`Gesamt erledigt: ${p.berufsbilder.reduce((s, b) => s + b.worksheetsDone, 0)} Arbeitsblätter`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `Fortschritt_${p.id}.txt`)
  }
  const [participants, setParticipants] = useState(participantsData)
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [newParticipantForm, setNewParticipantForm] = useState({
    id: '', berufsbild: 'Lagerlogistik', level: 'T' as Level, format: 'text' as Format,
  })

  type StationDraft = { berufsbild: string; level: Level; format: Format }
  const defaultStation: StationDraft = { berufsbild: 'Lagerlogistik', level: 'T', format: 'text' }
  const [participantModalId, setParticipantModalId] = useState('')
  const [participantModalStations, setParticipantModalStations] = useState<StationDraft[]>([{ ...defaultStation }])

  function openAddModal() {
    setEditingParticipant(null)
    setParticipantModalId('')
    setParticipantModalStations([{ ...defaultStation }])
    setShowAddParticipant(true)
  }

  function openEditModal(p: Participant) {
    setEditingParticipant(p)
    setParticipantModalId(p.id)
    setParticipantModalStations(p.berufsbilder.map(b => ({ berufsbild: b.berufsbild, level: b.level, format: b.format })))
    setShowAddParticipant(true)
  }

  function updateStation(i: number, patch: Partial<StationDraft>) {
    setParticipantModalStations(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  function moveStation(i: number, dir: -1 | 1) {
    setParticipantModalStations(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return next
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function removeStation(i: number) {
    setParticipantModalStations(prev => prev.filter((_, idx) => idx !== i))
  }

  function addStation() {
    setParticipantModalStations(prev => [...prev, { ...defaultStation }])
  }

  // Upload state
  const [uploadDragging, setUploadDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; pages: number } | null>(null)
  const [uploadAnalyzing, setUploadAnalyzing] = useState(false)
  const [uploadAnalyzed, setUploadAnalyzed] = useState(false)
  const [uploadAnalysis, setUploadAnalysis] = useState<{ thema: string; berufsbild: string; level: Level } | null>(null)

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setUploadDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) startUpload(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) startUpload(file)
    e.target.value = ''
  }

  function startUpload(file: File) {
    const kb = file.size / 1024
    const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
    setUploadedFile({ name: file.name, size, pages: Math.floor(Math.random() * 4) + 1 })
    setUploadAnalyzing(true)
    setUploadAnalyzed(false)
    setUploadAnalysis(null)
    setBatchLevels(['T', 'A', 'F', 'B'])
    setBatchFormats(['text'])
    setTransformDone(false)
    setTimeout(() => {
      setUploadAnalyzing(false)
      setUploadAnalyzed(true)
      setUploadAnalysis({ thema: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), berufsbild: 'Lagerlogistik', level: 'F' })
    }, 2000)
  }

  function openTransform(w: Worksheet) {
    setTransformSheet(w)
    setTransformLevel('A')
    setTransformFormat('text')
    setTransformSprache('Leichte Sprache')
    setTransforming(false)
    setTransformDone(false)
  }

  function handleSaveDirectly() {
    if (!uploadedFile || !uploadAnalysis) return
    const doc: SavedDocument = {
      id: `doc-${Date.now()}`,
      name: uploadedFile.name,
      size: uploadedFile.size,
      pages: uploadedFile.pages,
      savedAt: new Date().toISOString().slice(0, 10),
      savedBy: 'C. Hager',
      berufsbild: uploadAnalysis.berufsbild,
      thema: uploadAnalysis.thema,
    }
    setSavedDocs(prev => [doc, ...prev])
    setUploadedFile(null)
    setUploadAnalyzed(false)
    setTransformDone(false)
    setUploadAnalysis(null)
  }

  function handleTransform() {
    setTransforming(true)
    setTransformDone(false)
    setTimeout(() => {
      setTransforming(false)
      setTransformDone(true)
    }, 1800)
  }

  function toggleBatchLevel(l: Level) {
    setBatchLevels(prev => prev.includes(l) ? (prev.length > 1 ? prev.filter(x => x !== l) : prev) : [...prev, l])
    setTransformDone(false)
  }

  function toggleBatchFormat(f: Format) {
    setBatchFormats(prev => prev.includes(f) ? (prev.length > 1 ? prev.filter(x => x !== f) : prev) : [...prev, f])
    setTransformDone(false)
  }

  // Derived filter options from real data
  const allBausteine = [...new Set(worksheets.map(w => w.baustein))].sort()
  const allAusbildungsbausteine = filterBeruf === 'Alle Berufsbilder'
    ? [...new Set(worksheets.map(w => w.ausbildungsbaustein))]
    : [...new Set(worksheets.filter(w => w.berufsbild === filterBeruf).map(w => w.ausbildungsbaustein))]

  const filtered = worksheets.filter(w => {
    const matchBeruf = filterBeruf === 'Alle Berufsbilder' || w.berufsbild === filterBeruf
    const matchBaustein = filterBaustein === 'Alle' || w.baustein === filterBaustein
    const matchAb = filterAusbildungsbaustein === 'Alle' || w.ausbildungsbaustein === filterAusbildungsbaustein
    const matchSearch = search === '' || w.title.toLowerCase().includes(search.toLowerCase()) || w.ausbildungsbaustein.toLowerCase().includes(search.toLowerCase()) || w.abschnitt.titel.toLowerCase().includes(search.toLowerCase())
    return matchBeruf && matchBaustein && matchAb && matchSearch
  })

  function handleWebSearch(e?: React.FormEvent) {
    e?.preventDefault()
    const q = webSearchQuery.trim() || aiForm.thema.trim()
    if (!q) return
    setWebSearching(true)
    setWebResultsFor(q)
    setWebResults([])
    setWebResultsOpen(true)
    setSelectedWebResult(null)
    setTimeout(() => {
      setWebSearching(false)
      // Simulated results based on query
      const slug = encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))
      setWebResults([
        {
          title: `Arbeitsblatt: ${q} – Aufgaben & Lösungen (PDF)`,
          url: `www.lehrer-online.de/unterricht/berufsbildung/materialien/${slug}/arbeitsblatt.pdf`,
          snippet: `Direkt downloadbares Arbeitsblatt zu „${q}" mit Aufgaben auf verschiedenen Niveaustufen inkl. Lösungsblatt. Kostenlos, als PDF und Word verfügbar.`,
          source: 'lehrer-online.de',
        },
        {
          title: `${q} – Differenziertes Arbeitsblatt (Word, kostenlos)`,
          url: `www.4teachers.de/material/download/${slug}-arbeitsblatt-differenziert.docx`,
          snippet: `Differenziertes Arbeitsblatt zu „${q}" in drei Schwierigkeitsstufen. Als bearbeitbares Word-Dokument direkt herunterladbar und anpassbar.`,
          source: '4teachers.de',
        },
        {
          title: `IHK: Lernaufgabe „${q}" für Ausbildungsbetriebe`,
          url: `www.ihk-bildungshaus.de/ausbildung/lernmaterialien/${slug}/lernaufgabe.pdf`,
          snippet: `Offizielle IHK-Lernaufgabe zu „${q}" – geeignet für die betriebliche Ausbildung, mit Kompetenzraster und Bewertungsbogen.`,
          source: 'ihk-bildungshaus.de',
        },
        {
          title: `${q}: Unterrichtseinheit mit Arbeitsblättern (ZIP)`,
          url: `www.berufsbildung-online.de/downloads/unterrichtseinheiten/${slug}.zip`,
          snippet: `Komplette Unterrichtseinheit zu „${q}" als ZIP-Paket: Arbeitsblätter, Präsentation, Lehrerhandreichung und Bewertungsbögen in einem Download.`,
          source: 'berufsbildung-online.de',
        },
        {
          title: `BIBB: Ausbildungsmaterial „${q}" (offizielle Quelle)`,
          url: `www.bibb.de/de/berufsbildung/material/${slug}/arbeitsblatt-ausbildung.pdf`,
          snippet: `Bundesinstitut für Berufsbildung (BIBB): Offizielles Ausbildungsmaterial zu „${q}" mit Lernzielen, Kompetenzbeschreibungen und praxisorientierten Aufgaben.`,
          source: 'bibb.de',
        },
      ])
    }, 1600)
  }

  function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault()
    const today = new Date().toISOString().slice(0, 10)

    if (editingParticipant) {
      // Edit existing — merge station data, preserving progress/status for unchanged stations
      const merged = participantModalStations.map((draft, i) => {
        const existing = editingParticipant.berufsbilder.find(b => b.berufsbild === draft.berufsbild)
        if (existing) return { ...existing, level: draft.level, format: draft.format }
        return {
          berufsbild: draft.berufsbild,
          level: draft.level,
          format: draft.format,
          progress: 0,
          status: (i === 0 ? 'aktiv' : 'ausstehend') as BerufStation['status'],
          startDate: i === 0 ? today : '',
          worksheetsDone: 0,
          worksheetsTotal: worksheets.filter(w => w.berufsbild === draft.berufsbild).length,
        }
      })
      const firstLevel = merged[0]?.level ?? editingParticipant.level
      const updated: Participant = { ...editingParticipant, id: participantModalId || editingParticipant.id, name: participantModalId || editingParticipant.id, level: firstLevel, berufsbilder: merged }
      setParticipants(prev => prev.map(p => p.id === editingParticipant.id ? updated : p))
      if (selectedParticipant?.id === editingParticipant.id) setSelectedParticipant(updated)
    } else {
      const id = participantModalId.trim() || `TN-${String(participants.length + 1).padStart(3, '0')}`
      const berufsbilder: BerufStation[] = participantModalStations.map((draft, i) => ({
        berufsbild: draft.berufsbild,
        level: draft.level,
        format: draft.format,
        progress: 0,
        status: (i === 0 ? 'aktiv' : 'ausstehend') as BerufStation['status'],
        startDate: i === 0 ? today : '',
        worksheetsDone: 0,
        worksheetsTotal: worksheets.filter(w => w.berufsbild === draft.berufsbild).length,
      }))
      const newP: Participant = { id, name: id, level: participantModalStations[0]?.level ?? 'T', progress: 0, lastActive: today, berufsbilder }
      setParticipants(prev => [...prev, newP])
    }

    setShowAddParticipant(false)
    setEditingParticipant(null)
  }

  function handleDeleteParticipant(id: string) {
    setParticipants(prev => prev.filter(p => p.id !== id))
    if (selectedParticipant?.id === id) setSelectedParticipant(null)
  }

  function handleAiGenerate(e: React.FormEvent) {
    e.preventDefault()
    setAiGenerating(true)
    setAiDone(false)
    setTimeout(() => {
      setAiGenerating(false)
      setAiDone(true)
    }, 2200)
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--background)', fontFamily: 'Inter, sans-serif' }}>
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ backgroundColor: 'var(--primary)' }}>
              <span className="text-2xl text-white">▦</span>
            </div>
            <div className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: 'var(--muted-foreground)' }}>Bildungspark Heilbronn-Franken</div>
            <h1 className="font-display text-2xl font-semibold">Arbeitsblattverwaltung</h1>
          </div>

          {/* Login card */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
              <h2 className="font-display text-base font-semibold">Anmelden</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Bitte melden Sie sich mit Ihren Zugangsdaten an.</p>
            </div>
            <form onSubmit={handleLogin} className="px-6 py-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>E-MAIL-ADRESSE</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@bildungspark.de"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setLoginError('') }}
                  className="w-full px-3 py-2.5 rounded text-sm outline-none"
                  style={{ border: `1px solid ${loginError ? '#E53E3E' : 'var(--border)'}`, backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>PASSWORT</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
                  className="w-full px-3 py-2.5 rounded text-sm outline-none"
                  style={{ border: `1px solid ${loginError ? '#E53E3E' : 'var(--border)'}`, backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                />
              </div>
              {loginError && (
                <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF2F2', color: '#E53E3E', border: '1px solid #FECACA' }}>{loginError}</div>
              )}
              <button type="submit"
                className="w-full py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity mt-1"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                Anmelden
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Kein Zugang? Wenden Sie sich an Ihre Administration.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen relative" style={{ backgroundColor: 'var(--background)', fontFamily: 'Inter, sans-serif' }}>

      {/* Transform slide-over panel */}
      {transformSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
            onClick={() => setTransformSheet(null)}
          />
          {/* Panel */}
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: 480, backgroundColor: 'var(--card)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
          >
            {/* Panel header */}
            <div className="px-6 py-5 flex items-start justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-xs font-mono mb-1" style={{ color: 'var(--accent)' }}>✦ KI-Anpassung</div>
                <h2 className="font-display text-lg font-semibold leading-snug" style={{ maxWidth: 360 }}>{transformSheet.title}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>BS {transformSheet.baustein}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{transformSheet.berufsbild} · Original</span>
                </div>
              </div>
              <button onClick={() => setTransformSheet(null)} className="text-xl leading-none hover:opacity-50 transition-opacity mt-1" style={{ color: 'var(--muted-foreground)' }}>✕</button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">
              {/* Original info */}
              <div className="rounded px-3 py-2.5 flex items-center gap-3" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="flex-1">
                  <div className="text-xs font-mono mb-0.5" style={{ color: 'var(--muted-foreground)' }}>ORIGINAL</div>
                  <div className="text-sm font-medium">{transformSheet.title}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {transformSheet.berufsbild} · {transformSheet.ausbildungsbaustein}
                  </div>
                </div>
              </div>

              {/* Batch level picker */}
              <div>
                <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  ZIELNIVEAUS <span className="opacity-60">(mehrere möglich)</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                    const s = LEVEL_STYLES[l]
                    const active = batchLevels.includes(l)
                    const isOriginal = false
                    return (
                      <button key={l} onClick={() => toggleBatchLevel(l)}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg transition-all relative"
                        style={{
                          border: active ? `1.5px solid ${s.text}` : '1px solid var(--border)',
                          backgroundColor: active ? s.bg : 'var(--background)',
                        }}
                      >
                        <span className="text-base font-mono font-bold" style={{ color: s.text }}>{l}</span>
                        <span className="text-xs text-center leading-tight" style={{ color: s.text, opacity: active ? 1 : 0.5 }}>{s.label}</span>
                        {isOriginal && (
                          <span className="absolute -top-1.5 -right-1.5 text-xs font-mono px-1 rounded"
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: '0.6rem' }}>
                            orig
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 px-3 py-2 rounded text-xs font-mono" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  {batchLevels.length === 1
                    ? TRANSFORM_PREVIEWS[batchLevels[0]].hinweis
                    : `${batchLevels.length} Niveaus ausgewählt: ${batchLevels.join(', ')}`}
                </div>
              </div>

              {/* Batch format picker */}
              <div>
                <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  BARRIEREFREIHEITS-FORMATE <span className="opacity-60">(mehrere möglich)</span>
                </div>
                <div className="flex flex-col gap-2">
                  {FORMAT_OPTIONS.map(opt => {
                    const active = batchFormats.includes(opt.id)
                    return (
                      <button key={opt.id} onClick={() => toggleBatchFormat(opt.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded text-left transition-all"
                        style={{
                          border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                          backgroundColor: active ? '#EBF0F8' : 'var(--background)',
                        }}
                      >
                        <span className="text-lg w-6 text-center flex-shrink-0">{opt.icon}</span>
                        <div className="flex-1">
                          <div className="text-xs font-semibold" style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}>{opt.label}</div>
                          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{opt.desc}</div>
                        </div>
                        {active && <span className="text-xs" style={{ color: 'var(--primary)' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sprache */}
              <div>
                <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>SPRACHFORMAT</div>
                <div className="flex gap-2">
                  {['Leichte Sprache', 'Standardsprache'].map(s => (
                    <button key={s} onClick={() => { setTransformSprache(s); setTransformDone(false) }}
                      className="px-3 py-2 rounded text-xs font-medium transition-all"
                      style={{
                        backgroundColor: transformSprache === s ? 'var(--primary)' : 'var(--muted)',
                        color: transformSprache === s ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded px-3 py-2.5 text-xs font-mono" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                KI erstellt&nbsp;
                <strong style={{ color: 'var(--foreground)' }}>
                  {batchLevels.length * batchFormats.length} Variante{batchLevels.length * batchFormats.length !== 1 ? 'n' : ''}
                </strong>:&nbsp;
                {batchLevels.map(l => <span key={l} className="font-bold" style={{ color: LEVEL_STYLES[l].text }}>{l} </span>)}
                × {batchFormats.map(f => FORMAT_OPTIONS.find(o => o.id === f)?.label).join(', ')} · {transformSprache}
              </div>

              {/* Generate button */}
              {!transformDone && (
                <button onClick={handleTransform} disabled={transforming}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                >
                  {transforming
                    ? <><span className="inline-block animate-spin">✦</span> Varianten werden erstellt…</>
                    : `✦ ${batchLevels.length * batchFormats.length} Variante${batchLevels.length * batchFormats.length !== 1 ? 'n' : ''} erstellen`}
                </button>
              )}

              {/* Result grid */}
              {transformDone && (
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-mono font-semibold" style={{ color: '#1A5C32' }}>
                    ✓ {batchLevels.length * batchFormats.length} Variante{batchLevels.length * batchFormats.length !== 1 ? 'n' : ''} bereit
                  </div>
                  <div className="flex flex-col gap-2">
                    {batchLevels.flatMap(l =>
                      batchFormats.map(f => {
                        const fOpt = FORMAT_OPTIONS.find(o => o.id === f)!
                        const s = LEVEL_STYLES[l]
                        const preview = f === 'piktogramm' || f === 'piktogramm-mathefrei'
                          ? PIKTO_PREVIEW[transformSheet.berufsbild === 'Küche & Gastronomie' ? 'kueche' : transformSheet.berufsbild === 'Reinigung & Gebäudepflege' ? 'reinigung' : 'lager'][0]
                          : null
                        return (
                          <div key={`${l}-${f}`} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            {/* Row header */}
                            <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: s.bg }}>
                              <LevelBadge level={l} />
                              <span className="text-xs font-medium" style={{ color: s.text }}>{fOpt.icon} {fOpt.label}</span>
                              <span className="ml-auto text-xs font-mono" style={{ color: s.text, opacity: 0.7 }}>{transformSprache}</span>
                            </div>
                            {/* Preview snippet */}
                            <div className="px-3 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#FFFEF9' }}>
                              {preview
                                ? <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-xl">{preview.icon}</span>
                                    <span className="text-xs truncate">{preview.task}</span>
                                  </div>
                                : <span className="text-xs truncate flex-1" style={{ color: 'var(--muted-foreground)' }}>
                                    {TRANSFORM_PREVIEWS[l].aufgaben[0]}
                                  </span>
                              }
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: s.bg, color: s.text }}>Öffnen</button>
                                <button className="text-xs px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>PDF</button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <button className="w-full text-xs py-2.5 rounded font-medium" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                    Alle zur Bibliothek hinzufügen
                  </button>
                  <button onClick={() => setTransformDone(false)} className="text-xs text-center hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>
                    Andere Einstellungen wählen
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* Worksheet detail panel (Vorschau + Verlauf) */}
      {detailSheet && (
        <>
          <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={() => setDetailSheet(null)} />
          <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: 540, backgroundColor: 'var(--card)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}>
            {/* Header */}
            <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>BS {detailSheet.baustein}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{detailSheet.berufsbild}</span>
                  </div>
                  <h2 className="font-display text-lg font-semibold leading-snug">{detailSheet.title}</h2>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{detailSheet.ausbildungsbaustein} · {detailSheet.participants} Teilnehmer</div>
                </div>
                <button onClick={() => setDetailSheet(null)} className="text-xl leading-none hover:opacity-50 transition-opacity mt-1" style={{ color: 'var(--muted-foreground)' }}>✕</button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1">
                {(['vorschau', 'verlauf'] as const).map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className="px-4 py-1.5 rounded text-sm font-medium capitalize transition-all"
                    style={{
                      backgroundColor: detailTab === tab ? 'var(--primary)' : 'transparent',
                      color: detailTab === tab ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                    }}>
                    {tab === 'vorschau' ? '👁 Vorschau' : '🕓 Verlauf'}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-6 py-5">
              {detailTab === 'vorschau' && (
                /* Word-page simulation */
                <div className="flex flex-col items-center" style={{ backgroundColor: '#C8C0B4', padding: '20px 8px', minHeight: '100%', margin: '0 -24px' }}>
                  {/* Page shadow hint */}
                  <div style={{ width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF', boxShadow: '0 4px 24px rgba(0,0,0,0.22)', padding: '40px 44px 48px', fontFamily: 'Calibri, "Segoe UI", sans-serif', color: '#1A1714', lineHeight: 1.5 }}>
                    {/* Word header */}
                    <div style={{ fontSize: 9, color: '#1E3A5F', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Bildungspark Heilbronn-Franken
                    </div>
                    <div style={{ height: 2, backgroundColor: '#1E3A5F', marginBottom: 14 }} />
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1714', marginBottom: 4, lineHeight: 1.25 }}>{detailSheet.title}</div>
                    <div style={{ fontSize: 11, color: '#6B6354', marginBottom: 20 }}>
                      {detailSheet.berufsbild} · Baustein {detailSheet.baustein} · {detailSheet.ausbildungsbaustein}
                    </div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: '#1E3A5F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Abschnitt</div>
                    <div style={{ fontSize: 11, color: '#1A1714', marginBottom: 24, lineHeight: 1.6 }}>{detailSheet.abschnitt.titel}</div>

                    {/* Binnendifferenzierung table */}
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: '#1E3A5F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Binnendifferenzierung nach Niveaustufen</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                            const s = LEVEL_STYLES[l]
                            return (
                              <th key={l} style={{ width: '25%', backgroundColor: s.bg, padding: '6px 8px', textAlign: 'center', borderBottom: `2px solid ${s.text}` }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: s.text, lineHeight: 1.1 }}>{l}</div>
                                <div style={{ fontSize: 9, color: s.text, fontWeight: 600 }}>{s.label}</div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                            const s = LEVEL_STYLES[l]
                            const row = detailSheet.abschnitt.niveaus[l]
                            return (
                              <td key={l} style={{ verticalAlign: 'top', padding: '8px', backgroundColor: '#FFFEF9', borderBottom: '1px solid #D5CEBB' }}>
                                <div style={{ fontSize: 7.5, fontWeight: 700, color: '#6B6354', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Kompetenz</div>
                                <div style={{ fontSize: 10, color: '#1A1714', marginBottom: 8, lineHeight: 1.45 }}>{row.kompetenz}</div>
                                <div style={{ fontSize: 7.5, fontWeight: 700, color: s.text, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Aufgabe / Beispiel</div>
                                <div style={{ fontSize: 10, color: s.text, fontStyle: 'italic', backgroundColor: s.bg, padding: '4px 6px', lineHeight: 1.45 }}>{row.beispiel}</div>
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>

                    {/* Word footer */}
                    <div style={{ marginTop: 40, paddingTop: 10, borderTop: '1px solid #D5CEBB', fontSize: 8.5, color: '#6B6354', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{detailSheet.createdBy} · {detailSheet.date}</span>
                      <span>{detailSheet.aiGenerated ? 'KI-generiert' : 'Manuell erstellt'}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'verlauf' && (
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-mono mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    {(WORKSHEET_HISTORY[detailSheet.id] ?? []).length} Versionen · Neueste zuerst
                  </div>
                  {(WORKSHEET_HISTORY[detailSheet.id] ?? []).map((entry, i) => {
                    const actionColors: Record<HistoryEntry['action'], { bg: string; text: string; icon: string }> = {
                      erstellt: { bg: '#D4EDDA', text: '#1A5C32', icon: '✦' },
                      bearbeitet: { bg: '#D0E4F7', text: '#1A3A5C', icon: '✎' },
                      'KI-angepasst': { bg: '#EDE9FE', text: '#5B21B6', icon: '⚡' },
                      freigegeben: { bg: '#FFF3CD', text: '#7A5C00', icon: '✓' },
                      archiviert: { bg: '#FAD9C8', text: '#7A2E00', icon: '⬡' },
                    }
                    const ac = actionColors[entry.action]
                    return (
                      <div key={i} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ac.bg, color: ac.text }}>{ac.icon}</div>
                          {i < (WORKSHEET_HISTORY[detailSheet.id] ?? []).length - 1 && (
                            <div className="w-px flex-1 mt-1" style={{ backgroundColor: 'var(--border)', minHeight: 24 }} />
                          )}
                        </div>
                        {/* Entry card */}
                        <div className="flex-1 rounded-lg px-4 py-3 mb-1" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium" style={{ backgroundColor: ac.bg, color: ac.text }}>{entry.action}</span>
                              <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>v{entry.version}</span>
                            </div>
                            <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{entry.date}</span>
                          </div>
                          <div className="text-sm font-medium mb-0.5">{entry.author}</div>
                          <div className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{entry.note}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => { setDetailSheet(null); openTransform(detailSheet) }}
                className="flex-1 py-2 rounded text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                ✦ Anpassen
              </button>
              <button
                onClick={() => generateAndDownloadDocx(detailSheet)}
                className="px-4 py-2 rounded text-sm font-medium hover:opacity-80 transition-opacity flex items-center gap-1.5"
                style={{ border: '1px solid var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--card)' }}>
                <span>📄</span> Als Word speichern
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-xs font-mono tracking-widest uppercase opacity-60 mb-1">Bildungspark</div>
          <div className="font-display text-xl font-semibold leading-tight">Arbeitsblatt&shy;verwaltung</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
          {navItems.filter(item => !item.adminOnly || currentUser.role === 'admin').map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-sm text-left w-full transition-all"
              style={{
                backgroundColor: activeNav === item.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: activeNav === item.id ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                fontWeight: activeNav === item.id ? 500 : 400,
              }}
            >
              <span className="text-base w-5 text-center opacity-80">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-4 pb-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-medium flex-shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {currentUser.initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
              <div className="text-xs opacity-50">{ROLE_LABELS[currentUser.role]}</div>
            </div>
          </div>
          <button
            onClick={() => setCurrentUser(null)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-all hover:opacity-90"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
          >
            <span>⎋</span>
            <span>Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-8 py-4"
          style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
        >
          <div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
              {activeNav === 'dashboard' && 'Übersicht'}
              {activeNav === 'arbeitsblätter' && 'Arbeitsblätter'}
              {activeNav === 'ki-erstellung' && 'KI-Erstellung'}
              {activeNav === 'teilnehmer' && 'Teilnehmende'}
              {activeNav === 'berichte' && 'Berichte'}
              {activeNav === 'benutzerverwaltung' && 'Benutzerverwaltung'}
              {activeNav === 'einstellungen' && 'Einstellungen'}
            </h1>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'DM Mono, monospace' }}>
              KW 39 · Montag, 29. September 2025
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="text-xs px-3 py-1.5 rounded-full font-mono"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              Sprint 1 läuft
            </div>
            <button
              className="text-sm px-4 py-2 rounded font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
              onClick={() => setActiveNav('ki-erstellung')}
            >
              + Arbeitsblatt erstellen
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          {/* DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div className="flex flex-col gap-8">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Arbeitsblätter gesamt" value={worksheets.length} sub="7 Berufsfelder" accent />
                <StatCard label="KI-generiert" value={worksheets.filter(w => w.aiGenerated).length} sub="von insgesamt 7" />
                <StatCard label="Aktive Teilnehmende" value={participants.length} sub="diese Woche" />
              </div>

              {/* Level distribution */}
              <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <h2 className="font-display text-lg font-semibold mb-4">Niveaustufen-Verteilung</h2>
                <div className="flex gap-6">
                  {(['T', 'A', 'F', 'B'] as Level[]).map(lvl => {
                    const count = worksheets.filter(w => Object.keys(w.abschnitt.niveaus).includes(lvl)).length
                    const pct = Math.round((count / worksheets.length) * 100)
                    const s = LEVEL_STYLES[lvl]
                    return (
                      <div key={lvl} className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <LevelBadge level={lvl} />
                          <span className="text-sm font-mono" style={{ color: 'var(--muted-foreground)' }}>{count} AB</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--muted)' }}>
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: s.text }} />
                        </div>
                        <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Teilnehmende nach Niveaustufen & Barrierefreiheit */}
              <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h2 className="font-display text-lg font-semibold">Anonyme Teilnehmende</h2>
                    <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Aufgeteilt nach Niveaustufe und Barrierefreiheitsbedarf · § 60 SGB IX</div>
                  </div>
                  <button onClick={() => setActiveNav('teilnehmer')} className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--accent)' }}>
                    Alle Teilnehmenden →
                  </button>
                </div>

                {(() => {
                  const LEVEL_DESCS: Record<Level, string> = {
                    T: 'Einstiegsniveau — sehr einfache Sprache, kurze Sätze, viel visuelle Unterstützung.',
                    A: 'Aufbauniveau — Grundaufgaben mit klarer Schritt-für-Schritt-Anleitung.',
                    F: 'Fachstufe — kontextbezogene Aufgaben mit Fachbegriffen.',
                    B: 'Berufsstufe — komplexe Aufgaben, selbstständiges Arbeiten, volle Fachsprache.',
                  }
                  const FORMATS = [
                    { icon: '𝐓', label: 'Standard-Text', color: '#1E3A5F', bg: '#EBF0F8', desc: 'Liest selbstständig — keine zusätzlichen Symbole oder Anpassungen nötig.' },
                    { icon: '◉', label: 'Mit Piktogrammen', color: '#7A2E9A', bg: '#F3E8FF', desc: 'Versteht Aufgaben besser durch Bilder und Symbole statt reinem Text.' },
                    { icon: '≠', label: 'Ohne Rechnen', color: '#7A5C00', bg: '#FFF3CD', desc: 'Hat Schwierigkeiten mit Zahlen (Dyskalkulie) — Rechenaufgaben werden qualitativ ersetzt.' },
                    { icon: '◎', label: 'Pikto + Mathefrei', color: '#7A2E00', bg: '#FAD9C8', desc: 'Kombinierter Bedarf: Symbole und keine Rechenschritte für maximale Barrierefreiheit.' },
                  ]
                  const LETTERS = 'ABCDEFGHIJKLMNOP'.split('')
                  return (
                    <div className="flex flex-col p-4 gap-2">
                      {(['T', 'A', 'F', 'B'] as Level[]).map(lvl => {
                        const s = LEVEL_STYLES[lvl]
                        const isOpen = openPersonaLevels.has(lvl)
                        const startIdx = { T: 0, A: 4, F: 8, B: 12 }[lvl]
                        return (
                          <div key={lvl} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isOpen ? s.text : 'var(--border)'}`, transition: 'border-color 0.15s' }}>
                            {/* Collapsible header */}
                            <button
                              type="button"
                              onClick={() => togglePersonaLevel(lvl)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-90"
                              style={{ backgroundColor: isOpen ? s.bg : 'var(--muted)' }}
                            >
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-mono font-bold flex-shrink-0"
                                  style={{ backgroundColor: s.text, color: 'white' }}>{lvl}</span>
                                <span className="text-sm font-semibold" style={{ color: s.text }}>{s.label}</span>
                              </div>
                              <p className="text-xs leading-snug flex-1" style={{ color: 'var(--muted-foreground)' }}>{LEVEL_DESCS[lvl]}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
                                  Personas {LETTERS[startIdx]}–{LETTERS[startIdx + 3]}
                                </span>
                                <span className="text-xs font-mono transition-transform" style={{ color: s.text, display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                              </div>
                            </button>

                            {/* Persona cards — shown when open */}
                            {isOpen && (
                              <div className="grid grid-cols-2 gap-2 p-3" style={{ borderTop: `1px solid ${s.text}20` }}>
                                {FORMATS.map((fmt, fi) => {
                                  const letter = LETTERS[startIdx + fi]
                                  return (
                                    <div key={fi} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                                      <div className="px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: 'var(--muted)' }}>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                          style={{ backgroundColor: s.bg, color: s.text, border: `1.5px solid ${s.text}` }}>
                                          {letter}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold">Persona {letter}</div>
                                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                            <span className="text-xs font-mono font-bold" style={{ color: s.text }}>{lvl} – {s.label}</span>
                                            <span style={{ color: 'var(--border)' }}>·</span>
                                            <span className="text-xs font-mono" style={{ color: fmt.color }}>{fmt.icon} {fmt.label}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="px-3 py-2.5 flex flex-col gap-1.5">
                                        <div className="flex gap-1.5 items-start">
                                          <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold mt-0.5"
                                            style={{ backgroundColor: s.bg, color: s.text, fontSize: 7 }}>N</span>
                                          <p className="text-xs leading-snug" style={{ color: 'var(--foreground)' }}>{LEVEL_DESCS[lvl]}</p>
                                        </div>
                                        <div className="flex gap-1.5 items-start">
                                          <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold mt-0.5"
                                            style={{ backgroundColor: fmt.bg, color: fmt.color, fontSize: 7 }}>B</span>
                                          <p className="text-xs leading-snug" style={{ color: 'var(--foreground)' }}>{fmt.desc}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div className="rounded px-4 py-3 text-xs" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        <strong style={{ color: 'var(--foreground)' }}>N</strong> = Niveaustufe &nbsp;·&nbsp; <strong style={{ color: 'var(--foreground)' }}>B</strong> = Barrierefreiheitsbedarf &nbsp;·&nbsp; Alle Personas sind anonymisiert nach § 60 SGB IX.
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Recent worksheets + quick participant view */}
              <div className="rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h2 className="font-display text-lg font-semibold">Zuletzt bearbeitet</h2>
                  <button className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--accent)' }} onClick={() => setActiveNav('arbeitsblätter')}>Alle anzeigen →</button>
                </div>
                <div>
                  {worksheets.slice(0, 5).map((w, i) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-4 px-6 py-3.5 hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}
                    >
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>BS {w.baustein}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{w.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{w.ausbildungsbaustein} · {w.berufsbild}</div>
                      </div>
                      {w.aiGenerated && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}>KI</span>
                      )}
                      <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{w.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ARBEITSBLÄTTER */}
          {activeNav === 'arbeitsblätter' && (
            <div className="flex flex-col gap-6">

              {/* Upload zone */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--accent)' }}>↑</span>
                  <h2 className="font-display text-base font-semibold">Vorhandenes Arbeitsblatt hochladen & anpassen</h2>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  {/* Drop zone */}
                  {!uploadedFile && (
                    <label
                      className="flex flex-col items-center justify-center gap-3 rounded-lg cursor-pointer transition-all select-none"
                      style={{
                        border: `2px dashed ${uploadDragging ? 'var(--accent)' : 'var(--border)'}`,
                        backgroundColor: uploadDragging ? '#FEF3EC' : 'var(--background)',
                        padding: '2.5rem 1rem',
                        minHeight: 140,
                      }}
                      onDragOver={e => { e.preventDefault(); setUploadDragging(true) }}
                      onDragLeave={() => setUploadDragging(false)}
                      onDrop={handleFileDrop}
                    >
                      <input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg" className="hidden" onChange={handleFileInput} />
                      <div className="text-3xl">📄</div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Datei hierher ziehen oder klicken</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>PDF, Word, Text oder Bild · max. 20 MB</div>
                      </div>
                      <div className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                        Datei auswählen
                      </div>
                    </label>
                  )}

                  {/* Analyzing state */}
                  {uploadedFile && uploadAnalyzing && (
                    <div className="rounded-lg p-4 flex items-center gap-4" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                      <div className="text-2xl">📄</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{uploadedFile.name}</div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{uploadedFile.size} · {uploadedFile.pages} Seiten</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-block animate-spin text-sm" style={{ color: 'var(--accent)' }}>✦</span>
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>KI analysiert Inhalt, Thema und Niveaustufe…</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analyzed — show detected metadata + action choice */}
                  {uploadedFile && uploadAnalyzed && uploadAnalysis && (
                    <div className="flex flex-col gap-4">
                      {/* File card */}
                      <div className="rounded-lg p-4 flex items-start gap-4" style={{ border: '1px solid #2A7A4B', backgroundColor: '#F0FBF4' }}>
                        <div className="text-2xl mt-0.5">📄</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: '#1A5C32' }}>{uploadedFile.name}</span>
                            <LevelBadge level={uploadAnalysis.level} />
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#C3E6CB', color: '#1A5C32' }}>erkannt</span>
                          </div>
                          <div className="text-xs font-mono mt-1" style={{ color: '#2A7A4B' }}>
                            Thema: <strong>{uploadAnalysis.thema}</strong> · Berufsbild: <strong>{uploadAnalysis.berufsbild}</strong> · {uploadedFile.size} · {uploadedFile.pages} S.
                          </div>
                        </div>
                        <button onClick={() => { setUploadedFile(null); setUploadAnalyzed(false); setTransformDone(false) }}
                          className="text-xs hover:opacity-60" style={{ color: '#2A7A4B' }}>✕</button>
                      </div>

                      {/* Action choice — save directly vs KI adapt */}
                      {!transformDone && (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={handleSaveDirectly}
                            className="flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg text-left transition-all hover:opacity-90"
                            style={{ border: '1.5px solid var(--primary)', backgroundColor: 'var(--background)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">💾</span>
                              <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Direkt speichern</span>
                            </div>
                            <span className="text-xs leading-snug" style={{ color: 'var(--muted-foreground)' }}>Dokument unverändert in die Bibliothek übernehmen</span>
                          </button>
                          <button
                            onClick={() => {/* scroll to KI section below */}}
                            className="flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg text-left transition-all hover:opacity-90"
                            style={{ border: '1.5px solid var(--accent)', backgroundColor: 'var(--background)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">✦</span>
                              <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>KI anpassen</span>
                            </div>
                            <span className="text-xs leading-snug" style={{ color: 'var(--muted-foreground)' }}>Auf Niveaustufen und Barrierefreiheiten herunterbrechen</span>
                          </button>
                        </div>
                      )}

                      {/* Batch level picker */}
                      <div>
                        <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>ZIELNIVEAUS <span className="opacity-60">(mehrere möglich)</span></div>
                        <div className="grid grid-cols-4 gap-2">
                          {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                            const s = LEVEL_STYLES[l]
                            const active = batchLevels.includes(l)
                            return (
                              <button key={l} type="button" onClick={() => toggleBatchLevel(l)}
                                className="flex flex-col items-center gap-1 p-3 rounded-lg transition-all"
                                style={{
                                  border: active ? `1.5px solid ${s.text}` : '1px solid var(--border)',
                                  backgroundColor: active ? s.bg : 'var(--background)',
                                }}
                              >
                                <span className="text-base font-mono font-bold" style={{ color: s.text }}>{l}</span>
                                <span className="text-xs text-center leading-tight" style={{ color: s.text, opacity: active ? 1 : 0.5 }}>{s.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Batch format picker */}
                      <div>
                        <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>BARRIEREFREIHEITS-FORMATE <span className="opacity-60">(mehrere möglich)</span></div>
                        <div className="grid grid-cols-2 gap-2">
                          {FORMAT_OPTIONS.map(opt => {
                            const active = batchFormats.includes(opt.id)
                            return (
                              <button key={opt.id} type="button" onClick={() => toggleBatchFormat(opt.id)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded text-left transition-all"
                                style={{
                                  border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                  backgroundColor: active ? '#EBF0F8' : 'var(--background)',
                                }}
                              >
                                <span className="text-lg w-6 text-center flex-shrink-0">{opt.icon}</span>
                                <div>
                                  <div className="text-xs font-semibold" style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}>{opt.label}</div>
                                  <div className="text-xs leading-tight" style={{ color: 'var(--muted-foreground)' }}>{opt.desc}</div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Sprache */}
                      <div>
                        <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>SPRACHFORMAT</div>
                        <div className="flex gap-2">
                          {['Leichte Sprache', 'Standardsprache'].map(s => (
                            <button key={s} type="button" onClick={() => setTransformSprache(s)}
                              className="px-3 py-2 rounded text-xs font-medium transition-all"
                              style={{
                                backgroundColor: transformSprache === s ? 'var(--primary)' : 'var(--muted)',
                                color: transformSprache === s ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                              }}
                            >{s}</button>
                          ))}
                        </div>
                      </div>

                      {/* Summary + generate */}
                      <div className="rounded p-3 text-xs font-mono" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        KI erstellt <strong style={{ color: 'var(--foreground)' }}>{batchLevels.length * batchFormats.length} Variante{batchLevels.length * batchFormats.length !== 1 ? 'n' : ''}</strong>:&nbsp;
                        {batchLevels.map(l => <span key={l} className="font-bold" style={{ color: LEVEL_STYLES[l].text }}>{l} </span>)}
                        × {batchFormats.map(f => FORMAT_OPTIONS.find(o => o.id === f)?.label).join(', ')} · {transformSprache}
                      </div>

                      {!transformDone && (
                        <button
                          onClick={handleTransform}
                          disabled={transforming}
                          className="flex items-center justify-center gap-2 px-5 py-3 rounded font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                        >
                          {transforming
                            ? <><span className="inline-block animate-spin">✦</span> Varianten werden erstellt…</>
                            : `✦ ${batchLevels.length * batchFormats.length} Variante${batchLevels.length * batchFormats.length !== 1 ? 'n' : ''} erstellen`}
                        </button>
                      )}

                      {/* Result grid */}
                      {transformDone && (
                        <div className="flex flex-col gap-3">
                          <div className="text-xs font-mono font-medium" style={{ color: '#1A5C32' }}>✓ Alle Varianten bereit</div>
                          <div className="grid grid-cols-2 gap-2">
                            {batchLevels.flatMap(l =>
                              batchFormats.map(f => {
                                const fLabel = FORMAT_OPTIONS.find(o => o.id === f)?.label ?? f
                                const fIcon = FORMAT_OPTIONS.find(o => o.id === f)?.icon ?? '𝐓'
                                const s = LEVEL_STYLES[l]
                                return (
                                  <div key={`${l}-${f}`} className="rounded-lg p-3 flex items-center gap-3" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <LevelBadge level={l} />
                                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{fIcon} {fLabel}</span>
                                      </div>
                                      <div className="text-xs font-mono truncate" style={{ color: 'var(--muted-foreground)' }}>{uploadAnalysis.thema} · {transformSprache}</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button className="text-xs px-2 py-1 rounded" style={{ backgroundColor: s.bg, color: s.text }}>Öffnen</button>
                                      <button className="text-xs px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>PDF</button>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 text-xs py-2 rounded font-medium" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                              Alle speichern & zur Bibliothek hinzufügen
                            </button>
                            <button onClick={() => { setUploadedFile(null); setUploadAnalyzed(false); setTransformDone(false) }}
                              className="text-xs px-4 py-2 rounded font-medium" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                              Neue Datei
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="rounded-lg p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex flex-wrap gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Suchen nach Titel, Baustein, Abschnitt…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="px-3 py-2 rounded text-sm outline-none flex-1"
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: 200 }}
                  />
                  <span className="text-xs font-mono ml-auto" style={{ color: 'var(--muted-foreground)' }}>{filtered.length} Ergebnisse</span>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Berufsbild */}
                  <div>
                    <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>BERUFSBILD</div>
                    <select value={filterBeruf} onChange={e => { setFilterBeruf(e.target.value); setFilterAusbildungsbaustein('Alle') }}
                      className="px-3 py-1.5 rounded text-xs outline-none"
                      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
                      {berufsbilder.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  {/* Baustein */}
                  <div>
                    <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>BAUSTEIN</div>
                    <div className="flex gap-1">
                      {(['Alle', ...allBausteine] as (number | 'Alle')[]).map(b => (
                        <button key={String(b)} onClick={() => setFilterBaustein(b)}
                          className="px-2.5 py-1.5 rounded text-xs font-mono font-medium transition-all"
                          style={{
                            backgroundColor: filterBaustein === b ? 'var(--primary)' : 'var(--muted)',
                            color: filterBaustein === b ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                            border: '1px solid var(--border)',
                          }}>
                          {b === 'Alle' ? 'Alle' : `BS ${b}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Ausbildungsbaustein */}
                  <div>
                    <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>AUSBILDUNGSBAUSTEIN</div>
                    <div className="flex gap-1 flex-wrap">
                      {(['Alle', ...allAusbildungsbausteine]).map(ab => (
                        <button key={ab} onClick={() => setFilterAusbildungsbaustein(ab)}
                          className="px-2.5 py-1.5 rounded text-xs font-medium transition-all"
                          style={{
                            backgroundColor: filterAusbildungsbaustein === ab ? 'var(--primary)' : 'var(--muted)',
                            color: filterAusbildungsbaustein === ab ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                            border: '1px solid var(--border)',
                          }}>
                          {ab}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards list */}
              <div className="flex flex-col gap-2">
                {filtered.map(w => {
                  const isExpanded = expandedWsId === w.id
                  return (
                    <div key={w.id} className="rounded-lg overflow-hidden"
                      style={{ backgroundColor: 'var(--card)', border: isExpanded ? '1.5px solid var(--primary)' : '1px solid var(--border)' }}>
                      {/* Card header */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Baustein badge */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center rounded px-2 py-1 text-center"
                          style={{ backgroundColor: 'var(--muted)', minWidth: 44 }}>
                          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>BS</span>
                          <span className="text-sm font-mono font-bold" style={{ color: 'var(--foreground)' }}>{w.baustein}</span>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{w.ausbildungsbaustein}</span>
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>→</span>
                            <span className="text-sm">{w.title}</span>
                            {w.aiGenerated && (
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}>KI</span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
                            <span className="font-medium" style={{ color: 'var(--foreground)' }}>{w.berufsbild}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span className="font-mono">{w.createdBy}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span className="font-mono">{w.date}</span>
                          </div>
                          {/* Format badge + persona recommendations */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {(() => {
                              const fOpt = FORMAT_OPTIONS.find(o => o.id === w.format)!
                              const fColors: Record<Format, { bg: string; color: string }> = {
                                text: { bg: '#EBF0F8', color: '#1E3A5F' },
                                piktogramm: { bg: '#F3E8FF', color: '#7A2E9A' },
                                mathefrei: { bg: '#FFF3CD', color: '#7A5C00' },
                                'piktogramm-mathefrei': { bg: '#FAD9C8', color: '#7A2E00' },
                              }
                              const fc = fColors[w.format]
                              return (
                                <>
                                  <span className="text-xs font-mono px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: fc.bg, color: fc.color }}>
                                    {fOpt.icon} {fOpt.label}
                                  </span>
                                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>→ Personas:</span>
                                  {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                                    const letter = PERSONA_MAP[l][w.format]
                                    const s = LEVEL_STYLES[l]
                                    return (
                                      <span key={l} className="text-xs font-mono font-bold px-1.5 py-0.5 rounded" title={`Persona ${letter}: ${s.label} · ${fOpt.label}`}
                                        style={{ backgroundColor: s.bg, color: s.text }}>
                                        {letter}
                                      </span>
                                    )
                                  })}
                                </>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                          <button
                            onClick={() => setExpandedWsId(isExpanded ? null : w.id)}
                            className="text-xs px-2.5 py-1.5 rounded font-medium transition-all"
                            style={{
                              backgroundColor: isExpanded ? 'var(--primary)' : 'var(--muted)',
                              color: isExpanded ? 'var(--primary-foreground)' : 'var(--foreground)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {isExpanded ? '▲ Aufbau' : '▼ Aufbau'}
                          </button>
                          <button
                            onClick={() => { setDetailSheet(w); setDetailTab('vorschau') }}
                            className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                          >
                            👁 Vorschau
                          </button>
                          <button
                            onClick={() => { setDetailSheet(w); setDetailTab('verlauf') }}
                            className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                          >
                            🕓 Verlauf
                          </button>
                          <button
                            onClick={() => generateAndDownloadDocx(w)}
                            className="text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                            title="Als Word-Datei herunterladen"
                          >
                            📄 .docx
                          </button>
                          <button
                            onClick={() => openTransform(w)}
                            className="text-xs px-2.5 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                          >
                            ✦ Anpassen
                          </button>
                        </div>
                      </div>

                      {/* Expanded: Aufbau / Niveautabelle */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                          <div className="px-4 py-3">
                            <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>ABSCHNITT</div>
                            <div className="text-sm font-medium mb-4">{w.abschnitt.titel}</div>
                            <div className="text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>BINNENDIFFERENZIERUNG NACH NIVEAUSTUFEN</div>
                            <div className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                              {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                                const s = LEVEL_STYLES[l]
                                const row = w.abschnitt.niveaus[l]
                                return (
                                  <div key={l} className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${s.text}` }}>
                                    <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: s.bg }}>
                                      <span className="text-sm font-mono font-bold" style={{ color: s.text }}>{l}</span>
                                      <span className="text-xs font-medium" style={{ color: s.text }}>{s.label}</span>
                                    </div>
                                    <div className="px-3 py-2.5" style={{ backgroundColor: '#FFFEF9' }}>
                                      <div className="text-xs mb-2 leading-snug" style={{ color: 'var(--foreground)' }}>{row.kompetenz}</div>
                                      <div className="text-xs px-2 py-1.5 rounded leading-snug italic" style={{ backgroundColor: s.bg, color: s.text }}>
                                        Beispiel: {row.beispiel}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="py-10 text-center text-sm rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    Keine Arbeitsblätter gefunden.
                  </div>
                )}
              </div>

              {/* Saved external documents */}
              {savedDocs.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <span>💾</span>
                      <h2 className="font-display text-base font-semibold">Gespeicherte Dokumente</h2>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>{savedDocs.length}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Hochgeladene Originaldokumente, unverändert gespeichert</span>
                  </div>
                  <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                    {savedDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-4 px-6 py-3.5">
                        <div className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--muted)' }}>📄</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{doc.name}</div>
                          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
                            <span className="font-medium" style={{ color: 'var(--foreground)' }}>{doc.berufsbild}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{doc.thema}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span className="font-mono">{doc.size} · {doc.pages} S.</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{doc.savedAt} · {doc.savedBy}</span>
                          <button
                            className="text-xs px-2.5 py-1.5 rounded hover:opacity-80 transition-opacity"
                            style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            Öffnen
                          </button>
                          <button
                            onClick={() => openTransform({ id: parseInt(doc.id.replace('doc-', '')), title: doc.thema, berufsbild: doc.berufsbild, baustein: 1, ausbildungsbaustein: doc.thema, abschnitt: { titel: doc.name, niveaus: { T: { kompetenz: '', beispiel: '' }, A: { kompetenz: '', beispiel: '' }, F: { kompetenz: '', beispiel: '' }, B: { kompetenz: '', beispiel: '' } } }, createdBy: doc.savedBy, date: doc.savedAt, aiGenerated: false, participants: 0, format: 'text' as Format })}
                            className="text-xs px-2.5 py-1.5 rounded font-medium hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                            ✦ Anpassen
                          </button>
                          <button
                            onClick={() => setSavedDocs(prev => prev.filter(d => d.id !== doc.id))}
                            className="text-xs px-2 py-1.5 rounded hover:opacity-60 transition-opacity"
                            style={{ color: 'var(--muted-foreground)' }}
                            title="Entfernen">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KI-ERSTELLUNG */}
          {activeNav === 'ki-erstellung' && (
            <div className="flex flex-col gap-6" style={{ maxWidth: 780 }}>
              <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-lg" style={{ color: 'var(--accent)' }}>✦</span>
                  <h2 className="font-display text-xl font-semibold">Neues Arbeitsblatt mit KI erstellen</h2>
                </div>
                <form onSubmit={handleAiGenerate} className="flex flex-col gap-5">
                  {/* Thema */}
                  <div>
                    <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>THEMA / TITEL</label>
                    <input
                      type="text"
                      placeholder="z.B. Sicherheitsregeln beim Gabelstapler"
                      value={aiForm.thema}
                      onChange={e => setAiForm(f => ({ ...f, thema: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded text-sm outline-none"
                      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                      required
                    />
                  </div>

                  {/* Erwartungen / Beschreibung */}
                  <div>
                    <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>ERWARTUNGEN AN DAS ARBEITSBLATT</label>
                    <textarea
                      placeholder={`Was sollen die Teilnehmer lernen oder üben?\nWelche Schwerpunkte sind wichtig?\nGibt es besondere Anforderungen?`}
                      value={aiExpectations}
                      onChange={e => setAiExpectations(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded text-sm outline-none resize-none"
                      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', lineHeight: 1.6 }}
                    />
                    <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      Je detaillierter die Beschreibung, desto passgenauer das Ergebnis.
                    </div>
                  </div>

                  {/* Internet-Suche */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      <span>🌐</span>
                      <span className="text-xs font-mono font-medium" style={{ color: 'var(--muted-foreground)' }}>ÄHNLICHE DOKUMENTE IM INTERNET SUCHEN</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>– optional als Vorlage oder Inspiration</span>
                    </div>
                    <div className="p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--background)' }}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={aiForm.thema ? `Nach „${aiForm.thema}" suchen…` : 'Suchbegriff eingeben…'}
                          value={webSearchQuery}
                          onChange={e => setWebSearchQuery(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleWebSearch() } }}
                          className="flex-1 px-3 py-2 rounded text-sm outline-none"
                          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleWebSearch()}
                          disabled={webSearching || (!webSearchQuery.trim() && !aiForm.thema.trim())}
                          className="px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
                          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                        >
                          {webSearching ? <span className="inline-block animate-spin text-xs">✦</span> : '🔍'}
                          {webSearching ? 'Suche…' : 'Suchen'}
                        </button>
                      </div>

                      {/* Results */}
                      {webSearching && (
                        <div className="py-6 flex flex-col items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
                          <span className="inline-block animate-spin text-2xl" style={{ color: 'var(--accent)' }}>✦</span>
                          <span className="text-xs">Suche nach ähnlichen Dokumenten…</span>
                        </div>
                      )}

                      {!webSearching && webResults.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setWebResultsOpen(o => !o)}
                            className="flex items-center justify-between text-xs font-mono hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            <span>{webResults.length} Ergebnisse für „{webResultsFor}"</span>
                            <span>{webResultsOpen ? '▲ Einklappen' : '▼ Ausklappen'}</span>
                          </button>
                          {!webResultsOpen && selectedWebResult && (
                            <div className="rounded px-3 py-2 text-xs font-mono" style={{ backgroundColor: '#EBF0F8', color: 'var(--primary)' }}>
                              ✓ 1 Dokument ausgewählt – Anpassungsoptionen eingeklappt
                            </div>
                          )}
                          {webResultsOpen && webResults.map((r, i) => {
                            const isSelected = selectedWebResult === r.url
                            return (
                              <div key={i} className="rounded-lg overflow-hidden"
                                style={{ border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)' }}>
                                {/* Result row */}
                                <div className="flex items-start gap-3 px-3 py-3" style={{ backgroundColor: isSelected ? '#EBF0F8' : 'var(--card)' }}>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold mb-0.5 leading-snug" style={{ color: 'var(--primary)' }}>{r.title}</div>
                                    <a href={`https://${r.url}`} target="_blank" rel="noopener noreferrer"
                                      className="text-xs mb-1.5 flex items-center gap-1 hover:opacity-70 w-fit"
                                      style={{ color: '#2A7A4B', textDecoration: 'none' }}
                                      onClick={e => e.stopPropagation()}>
                                      <span>🔗</span>
                                      <span className="underline underline-offset-2 truncate">{r.url}</span>
                                    </a>
                                    <div className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{r.snippet}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedWebResult(isSelected ? null : r.url); setWebAdaptDone(false) }}
                                    className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded font-medium transition-all"
                                    style={{
                                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--muted)',
                                      color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
                                      border: '1px solid var(--border)',
                                    }}>
                                    {isSelected ? '✓ Ausgewählt' : 'Auswählen'}
                                  </button>
                                </div>

                                {/* Inline adapt panel — only for selected result */}
                                {isSelected && (
                                  <div className="px-3 pb-4 pt-3 flex flex-col gap-3" style={{ backgroundColor: '#F4F7FC', borderTop: '1px solid var(--border)' }}>
                                    <div className="text-xs font-mono font-medium" style={{ color: 'var(--primary)' }}>✦ Dieses Dokument anpassen</div>

                                    {/* Level picker */}
                                    <div>
                                      <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--muted-foreground)' }}>ZIELNIVEAUS <span className="opacity-60">(mehrere möglich)</span></div>
                                      <div className="grid grid-cols-4 gap-1.5">
                                        {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                                          const s = LEVEL_STYLES[l]
                                          const active = webAdaptLevels.includes(l)
                                          return (
                                            <button key={l} type="button"
                                              onClick={() => setWebAdaptLevels(prev => active ? (prev.length > 1 ? prev.filter(x => x !== l) : prev) : [...prev, l])}
                                              className="flex flex-col items-center gap-0.5 py-2 rounded transition-all"
                                              style={{ border: active ? `1.5px solid ${s.text}` : '1px solid var(--border)', backgroundColor: active ? s.bg : 'var(--card)' }}>
                                              <span className="text-sm font-mono font-bold" style={{ color: s.text }}>{l}</span>
                                              <span className="text-xs leading-tight text-center" style={{ color: s.text, opacity: active ? 1 : 0.5, fontSize: 9 }}>{s.label}</span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>

                                    {/* Format picker */}
                                    <div>
                                      <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--muted-foreground)' }}>BARRIEREFREIHEITS-FORMAT</div>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {FORMAT_OPTIONS.map(opt => {
                                          const active = webAdaptFormats.includes(opt.id)
                                          return (
                                            <button key={opt.id} type="button"
                                              onClick={() => setWebAdaptFormats(prev => active ? (prev.length > 1 ? prev.filter(x => x !== opt.id) : prev) : [...prev, opt.id])}
                                              className="flex items-center gap-2 px-2.5 py-2 rounded text-left transition-all"
                                              style={{ border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)', backgroundColor: active ? '#EBF0F8' : 'var(--card)' }}>
                                              <span className="text-base flex-shrink-0">{opt.icon}</span>
                                              <span className="text-xs font-medium" style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}>{opt.label}</span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>

                                    {/* Summary + button */}
                                    <div className="rounded px-3 py-2 text-xs font-mono" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                                      KI erstellt <strong style={{ color: 'var(--foreground)' }}>{webAdaptLevels.length * webAdaptFormats.length} Variante{webAdaptLevels.length * webAdaptFormats.length !== 1 ? 'n' : ''}</strong>:&nbsp;
                                      {webAdaptLevels.map(l => <span key={l} className="font-bold" style={{ color: LEVEL_STYLES[l].text }}>{l} </span>)}
                                      × {webAdaptFormats.map(f => FORMAT_OPTIONS.find(o => o.id === f)?.label).join(', ')}
                                    </div>

                                    {!webAdaptDone ? (
                                      <button type="button"
                                        disabled={webAdapting}
                                        onClick={() => {
                                          setWebAdapting(true)
                                          setWebAdaptDone(false)
                                          setTimeout(() => { setWebAdapting(false); setWebAdaptDone(true) }, 1800)
                                        }}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                                        {webAdapting
                                          ? <><span className="inline-block animate-spin">✦</span> Varianten werden erstellt…</>
                                          : `✦ ${webAdaptLevels.length * webAdaptFormats.length} Variante${webAdaptLevels.length * webAdaptFormats.length !== 1 ? 'n' : ''} erstellen`}
                                      </button>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        <div className="text-xs font-mono font-medium" style={{ color: '#1A5C32' }}>✓ Alle Varianten bereit</div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          {webAdaptLevels.flatMap(l => webAdaptFormats.map(f => {
                                            const fLabel = FORMAT_OPTIONS.find(o => o.id === f)?.label ?? f
                                            const s = LEVEL_STYLES[l]
                                            return (
                                              <div key={`${l}-${f}`} className="rounded px-3 py-2 flex items-center gap-2"
                                                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                                                <LevelBadge level={l} />
                                                <span className="text-xs flex-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{fLabel}</span>
                                                <button className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>↓</button>
                                              </div>
                                            )
                                          }))}
                                        </div>
                                        <button type="button"
                                          className="text-xs py-2 rounded font-medium"
                                          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                                          Alle zur Bibliothek hinzufügen
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Berufsbild + Niveau */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>BERUFSBILD</label>
                      <select
                        value={aiForm.berufsbild}
                        onChange={e => setAiForm(f => ({ ...f, berufsbild: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded text-sm outline-none"
                        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                      >
                        {berufsbilder.filter(b => b !== 'Alle Berufsbilder').map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>NIVEAUSTUFEN <span className="opacity-60">(mehrere möglich)</span></label>
                      <div className="flex gap-1">
                        {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                          const active = aiLevels.includes(l)
                          return (
                            <button key={l} type="button"
                              onClick={() => setAiLevels(prev => active ? (prev.length > 1 ? prev.filter(x => x !== l) : prev) : [...prev, l])}
                              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded text-xs font-mono font-medium transition-all"
                              style={{
                                backgroundColor: active ? LEVEL_STYLES[l].bg : 'var(--muted)',
                                color: active ? LEVEL_STYLES[l].text : 'var(--muted-foreground)',
                                border: active ? `1.5px solid ${LEVEL_STYLES[l].text}` : '1px solid transparent',
                              }}
                            >
                              <span className="font-bold">{l}</span>
                              <span style={{ fontSize: 9, opacity: active ? 1 : 0.6 }}>{LEVEL_STYLES[l].label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sprachformat */}
                  <div>
                    <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>SPRACHFORMAT</label>
                    <div className="flex gap-2">
                      {['Leichte Sprache', 'Standardsprache'].map(s => (
                        <button key={s} type="button" onClick={() => setAiForm(f => ({ ...f, sprache: s }))}
                          className="px-3 py-2 rounded text-xs font-medium transition-all"
                          style={{
                            backgroundColor: aiForm.sprache === s ? 'var(--primary)' : 'var(--muted)',
                            color: aiForm.sprache === s ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Barrierefreiheitsformat */}
                  <div>
                    <label className="block text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>BARRIEREFREIHEITS-FORMATE <span className="opacity-60">(mehrere möglich)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {FORMAT_OPTIONS.map(opt => {
                        const active = aiFormats.includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAiFormats(prev => active ? (prev.length > 1 ? prev.filter(x => x !== opt.id) : prev) : [...prev, opt.id])}
                            className="flex items-start gap-3 p-3 rounded text-left transition-all"
                            style={{
                              border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              backgroundColor: active ? '#EBF0F8' : 'var(--background)',
                            }}
                          >
                            <span className="text-xl leading-none mt-0.5 w-6 text-center flex-shrink-0">{opt.icon}</span>
                            <div>
                              <div className="text-xs font-semibold mb-0.5" style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}>{opt.label}</div>
                              <div className="text-xs leading-snug" style={{ color: 'var(--muted-foreground)' }}>{opt.desc}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded p-3.5 text-xs font-mono flex flex-col gap-1.5" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                    <div>
                      KI erstellt <strong style={{ color: 'var(--foreground)' }}>{aiLevels.length * aiFormats.length} Variante{aiLevels.length * aiFormats.length !== 1 ? 'n' : ''}</strong>:&nbsp;
                      {aiLevels.map(l => <span key={l} className="font-bold" style={{ color: LEVEL_STYLES[l].text }}>{l} </span>)}
                      × {aiFormats.map(f => FORMAT_OPTIONS.find(o => o.id === f)?.label).join(', ')}
                      {' · '}<strong style={{ color: 'var(--foreground)' }}>{aiForm.berufsbild}</strong>
                      {' · '}<strong style={{ color: 'var(--foreground)' }}>{aiForm.sprache}</strong>
                    </div>
                    {aiExpectations.trim() && (
                      <div style={{ color: 'var(--foreground)' }}>
                        Erwartungen: <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{aiExpectations.trim().slice(0, 80)}{aiExpectations.trim().length > 80 ? '…' : ''}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={aiGenerating}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                  >
                    {aiGenerating
                      ? <><span className="inline-block animate-spin">✦</span> Wird generiert…</>
                      : `✦ ${aiLevels.length * aiFormats.length} Variante${aiLevels.length * aiFormats.length !== 1 ? 'n' : ''} generieren`}
                  </button>
                </form>
              </div>

              {/* Vorschau nach Generierung */}
              {aiDone && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2A7A4B' }}>
                  {/* Success bar */}
                  <div className="px-5 py-3.5 flex items-center justify-between" style={{ backgroundColor: '#F0FBF4', borderBottom: '1px solid #C3E6CB' }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: '#1A5C32' }}>✓ {aiLevels.length * aiFormats.length} Variante{aiLevels.length * aiFormats.length !== 1 ? 'n' : ''} erstellt</div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: '#2A7A4B' }}>
                        „{aiForm.thema || 'Neues Arbeitsblatt'}" · {aiForm.berufsbild} · {aiForm.sprache}
                      </div>
                    </div>
                    <button className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: '#2A7A4B', color: 'white' }}>
                      Alle zur Bibliothek hinzufügen
                    </button>
                  </div>

                  {/* Variant grid */}
                  <div className="p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: '#FFFEF9' }}>
                    {aiLevels.flatMap(l => aiFormats.map(f => {
                      const s = LEVEL_STYLES[l]
                      const fOpt = FORMAT_OPTIONS.find(o => o.id === f)!
                      return (
                        <div key={`${l}-${f}`} className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${s.text}` }}>
                          {/* Card header */}
                          <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: s.bg }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold" style={{ color: s.text }}>{l}</span>
                              <span className="text-xs" style={{ color: s.text }}>{s.label}</span>
                            </div>
                            <span className="text-xs" style={{ color: s.text }}>{fOpt.icon} {fOpt.label}</span>
                          </div>
                          {/* Card body */}
                          <div className="px-3 py-2.5" style={{ backgroundColor: 'var(--card)' }}>
                            <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                              {aiForm.thema || 'Sicherheitsregeln am Arbeitsplatz'} · {aiForm.sprache}
                            </div>
                            <div className="flex gap-1.5">
                              <button className="flex-1 text-xs py-1 rounded font-medium" style={{ backgroundColor: s.bg, color: s.text }}>
                                👁 Vorschau
                              </button>
                              <button className="flex-1 text-xs py-1 rounded font-medium" style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                                📄 .docx
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TEILNEHMER */}
          {activeNav === 'teilnehmer' && (
            <div className="flex gap-6">
              {/* List */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold">Anonymisierte Teilnehmerprofile</h2>
                    <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>§ 60 SGB IX konform · {participants.length} Teilnehmende</span>
                  </div>
                  <button
                    onClick={openAddModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    + Teilnehmer hinzufügen
                  </button>
                </div>

                {/* Add / Edit participant modal */}
                {showAddParticipant && (
                  <>
                    <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={() => { setShowAddParticipant(false); setEditingParticipant(null) }} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <div className="w-full max-w-lg rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '90vh' }}>
                        {/* Modal header */}
                        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                          <h3 className="font-display text-lg font-semibold">{editingParticipant ? 'Teilnehmer bearbeiten' : 'Neuen Teilnehmer hinzufügen'}</h3>
                          <button onClick={() => { setShowAddParticipant(false); setEditingParticipant(null) }} className="text-xl hover:opacity-50 transition-opacity" style={{ color: 'var(--muted-foreground)' }}>✕</button>
                        </div>
                        {/* Modal body — scrollable */}
                        <form onSubmit={handleAddParticipant} className="px-6 py-5 flex flex-col gap-5 overflow-y-auto">
                          {/* Anonyme ID */}
                          <div>
                            <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>ANONYME KENNUNG <span className="opacity-60">(optional)</span></label>
                            <input
                              type="text"
                              placeholder="z.B. IW3-0001 oder leer lassen"
                              value={participantModalId}
                              onChange={e => setParticipantModalId(e.target.value)}
                              className="w-full px-3 py-2.5 rounded text-sm outline-none font-mono"
                              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            />
                          </div>

                          {/* Berufsbereiche */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-mono font-medium" style={{ color: 'var(--muted-foreground)' }}>BERUFSBEREICHE <span className="opacity-60">(Reihenfolge = Lernweg)</span></label>
                              <button type="button" onClick={addStation}
                                className="text-xs px-2.5 py-1 rounded font-medium hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: 'var(--accent)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                                + Bereich hinzufügen
                              </button>
                            </div>

                            <div className="flex flex-col gap-3">
                              {participantModalStations.map((station, i) => {
                                const s = LEVEL_STYLES[station.level]
                                const personaLetter = PERSONA_MAP[station.level][station.format]
                                const fOpt = FORMAT_OPTIONS.find(o => o.id === station.format)
                                return (
                                  <div key={i} className="rounded-lg p-3 flex flex-col gap-3"
                                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                                    {/* Station header */}
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                        style={{ backgroundColor: s.bg, color: s.text, fontSize: 10 }}>{i + 1}</span>
                                      <span className="text-xs font-mono font-medium flex-1" style={{ color: 'var(--foreground)' }}>
                                        {i === 0 ? 'Erster Bereich (startet aktiv)' : `Bereich ${i + 1} (ausstehend)`}
                                      </span>
                                      {/* Persona preview */}
                                      <span className="text-xs font-mono px-1.5 py-0.5 rounded font-bold"
                                        style={{ backgroundColor: s.bg, color: s.text }}>
                                        Persona {personaLetter}
                                      </span>
                                      {/* Move up/down */}
                                      <div className="flex gap-0.5">
                                        <button type="button" onClick={() => moveStation(i, -1)} disabled={i === 0}
                                          className="w-6 h-6 rounded flex items-center justify-center text-xs disabled:opacity-20 hover:opacity-60 transition-opacity"
                                          style={{ border: '1px solid var(--border)' }}>↑</button>
                                        <button type="button" onClick={() => moveStation(i, 1)} disabled={i === participantModalStations.length - 1}
                                          className="w-6 h-6 rounded flex items-center justify-center text-xs disabled:opacity-20 hover:opacity-60 transition-opacity"
                                          style={{ border: '1px solid var(--border)' }}>↓</button>
                                      </div>
                                      {/* Remove */}
                                      {participantModalStations.length > 1 && (
                                        <button type="button" onClick={() => removeStation(i)}
                                          className="w-6 h-6 rounded flex items-center justify-center text-xs hover:opacity-60 transition-opacity"
                                          style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>✕</button>
                                      )}
                                    </div>

                                    {/* Berufsbild select */}
                                    <select value={station.berufsbild}
                                      onChange={e => updateStation(i, { berufsbild: e.target.value })}
                                      className="w-full px-3 py-2 rounded text-sm outline-none"
                                      style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}>
                                      {berufsbilder.filter(b => b !== 'Alle Berufsbilder').map(b => <option key={b}>{b}</option>)}
                                    </select>

                                    {/* Level + Format in one row */}
                                    <div className="grid grid-cols-2 gap-2">
                                      {/* Level buttons */}
                                      <div>
                                        <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>NIVEAUSTUFE</div>
                                        <div className="grid grid-cols-4 gap-1">
                                          {(['T', 'A', 'F', 'B'] as Level[]).map(l => {
                                            const ls = LEVEL_STYLES[l]
                                            const isActive = station.level === l
                                            return (
                                              <button key={l} type="button"
                                                onClick={() => updateStation(i, { level: l })}
                                                className="flex flex-col items-center py-1.5 rounded transition-all"
                                                style={{
                                                  border: isActive ? `1.5px solid ${ls.text}` : '1px solid var(--border)',
                                                  backgroundColor: isActive ? ls.bg : 'transparent',
                                                }}>
                                                <span className="text-xs font-mono font-bold" style={{ color: ls.text }}>{l}</span>
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                      {/* Format select */}
                                      <div>
                                        <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>FORMAT</div>
                                        <select value={station.format}
                                          onChange={e => updateStation(i, { format: e.target.value as Format })}
                                          className="w-full px-2 py-1.5 rounded text-xs outline-none"
                                          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}>
                                          {FORMAT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.icon} {o.label}</option>)}
                                        </select>
                                        {fOpt && <div className="text-xs mt-1 font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>{fOpt.desc}</div>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Hinweis */}
                          <div className="rounded px-3 py-2.5 text-xs" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                            Teilnehmer werden anonym verwaltet. Es werden keine persönlichen Daten gespeichert (§ 60 SGB IX).
                          </div>
                          {/* Actions */}
                          <div className="flex gap-2 pb-1">
                            <button type="submit"
                              className="flex-1 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                              {editingParticipant ? 'Änderungen speichern' : 'Teilnehmer anlegen'}
                            </button>
                            <button type="button" onClick={() => { setShowAddParticipant(false); setEditingParticipant(null) }}
                              className="px-4 py-2.5 rounded text-sm hover:opacity-70 transition-opacity"
                              style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                              Abbrechen
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </>
                )}

                {participants.map(p => {
                  const active = p.berufsbilder.find(b => b.status === 'aktiv')
                  const done = p.berufsbilder.filter(b => b.status === 'abgeschlossen').length
                  const total = p.berufsbilder.length
                  const isSelected = selectedParticipant?.id === p.id

                  return (
                    <div
                      key={p.id}
                      className="rounded-lg overflow-hidden"
                      style={{
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                      }}
                    >
                      {/* Header row */}
                      <div className="px-4 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono font-medium">{p.id}</span>
                            <LevelBadge level={p.level} />
                            <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                              zuletzt aktiv {p.lastActive}
                            </span>
                          </div>
                          {active && (
                            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                              Aktuell: <strong style={{ color: 'var(--foreground)' }}>{active.berufsbild}</strong>
                              <span className="ml-2">{Math.min(active.worksheetsDone, worksheets.filter(w => w.berufsbild === active.berufsbild).length)} Arbeitsblätter erledigt</span>
                            </div>
                          )}
                        </div>

                        {/* Berufsbild-Stations mini-track */}
                        <div className="hidden lg:flex items-center gap-1.5">
                          {p.berufsbilder.map((b, bi) => {
                            const personaLetter = PERSONA_MAP[b.level][b.format]
                            return (
                            <div key={bi} className="flex items-center gap-1.5">
                              <div
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
                                style={{
                                  backgroundColor: b.status === 'abgeschlossen' ? '#D4EDDA' : b.status === 'aktiv' ? LEVEL_STYLES[b.level].bg : 'var(--muted)',
                                  color: b.status === 'abgeschlossen' ? '#1A5C32' : b.status === 'aktiv' ? LEVEL_STYLES[b.level].text : 'var(--muted-foreground)',
                                  opacity: b.status === 'ausstehend' ? 0.6 : 1,
                                }}
                              >
                                {b.status === 'abgeschlossen' && <span>✓</span>}
                                {b.status === 'aktiv' && <span className="inline-block animate-pulse">●</span>}
                                {b.status === 'ausstehend' && <span>○</span>}
                                <span>{b.berufsbild.split(' ')[0]}</span>
                                <span
                                  className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center font-bold"
                                  style={{
                                    fontSize: 9,
                                    backgroundColor: b.status === 'abgeschlossen' ? '#1A5C32' : LEVEL_STYLES[b.level].text,
                                    color: 'white',
                                  }}
                                >{personaLetter}</span>
                              </div>
                              {bi < p.berufsbilder.length - 1 && (
                                <span className="text-xs" style={{ color: 'var(--border)' }}>→</span>
                              )}
                            </div>
                            )
                          })}
                        </div>

                        {/* Progress */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-mono text-right" style={{ color: 'var(--muted-foreground)' }}>{done} von {total}</span>
                          <button
                            onClick={() => setSelectedParticipant(isSelected ? null : p)}
                            className="text-xs px-3 py-1.5 rounded font-medium transition-all"
                            style={{
                              backgroundColor: isSelected ? 'var(--primary)' : 'var(--muted)',
                              color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
                            }}
                          >
                            {isSelected ? 'Schließen' : 'Details'}
                          </button>
                        </div>
                      </div>

                      {/* Overall progress bar */}
                      <div style={{ height: 3, backgroundColor: 'var(--muted)' }}>
                        <div style={{ height: 3, width: `${p.progress}%`, backgroundColor: p.progress === 100 ? '#2A7A4B' : 'var(--primary)', transition: 'width 0.3s' }} />
                      </div>

                      {/* Worksheet list for active Baustein — collapsible */}
                      {active && (() => {
                        const relevantWs = worksheets.filter(w => w.berufsbild === active.berufsbild)
                        const s = LEVEL_STYLES[active.level]
                        const isCollapsed = collapsedWsParticipants.has(p.id)
                        return relevantWs.length > 0 ? (
                          <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                            <button
                              type="button"
                              onClick={() => toggleWsCollapse(p.id)}
                              className="w-full px-4 pt-3 pb-2 text-xs font-mono font-medium flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                              style={{ color: 'var(--muted-foreground)' }}
                            >
                              <span>ARBEITSBLÄTTER</span>
                              <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>{active.berufsbild} · {active.level}</span>
                              <span
                                className="px-1.5 py-0.5 rounded font-bold"
                                style={{ backgroundColor: s.text, color: 'white', fontSize: 10 }}
                              >Persona {PERSONA_MAP[active.level][active.format]}</span>
                              <span className="ml-auto">{Math.min(active.worksheetsDone, worksheets.filter(w => w.berufsbild === active.berufsbild).length)} erledigt</span>
                              <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
                            </button>
                            {!isCollapsed && (
                              <div className="px-4 pb-3 flex flex-col gap-1">
                                {relevantWs.map((w, wi) => {
                                  const isDone = wi < active.worksheetsDone
                                  const isCurrent = wi === active.worksheetsDone
                                  return (
                                    <div key={w.id} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded"
                                      style={{
                                        backgroundColor: isDone ? '#F0FBF4' : isCurrent ? s.bg : 'transparent',
                                        opacity: !isDone && !isCurrent ? 0.5 : 1,
                                      }}>
                                      <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ backgroundColor: isDone ? '#2A7A4B' : isCurrent ? s.text : 'var(--border)', color: 'white', fontSize: 9 }}>
                                        {isDone ? '✓' : wi + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium truncate block">{w.title}</span>
                                        <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>BS {w.baustein} · {w.ausbildungsbaustein}</span>
                                      </div>
                                      {isDone && <span className="flex-shrink-0 text-xs font-mono" style={{ color: '#2A7A4B' }}>✓ erledigt</span>}
                                      {isCurrent && <span className="flex-shrink-0 text-xs font-mono animate-pulse" style={{ color: s.text }}>● aktuell</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ) : null
                      })()}

                      {/* Expanded detail */}
                      {isSelected && (
                        <div className="px-4 py-4 flex flex-col gap-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>

                          {/* Berufsbild timeline */}
                          <div>
                            <div className="text-xs font-mono font-medium mb-3" style={{ color: 'var(--muted-foreground)' }}>LERNWEG — BERUFSBILDER</div>
                            <div className="flex flex-col gap-2">
                              {p.berufsbilder.map((b, bi) => (
                                <div key={bi} className="flex items-start gap-3">
                                  {/* Timeline dot */}
                                  <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: 20 }}>
                                    <div
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                                      style={{
                                        backgroundColor: b.status === 'abgeschlossen' ? '#2A7A4B' : b.status === 'aktiv' ? LEVEL_STYLES[b.level].text : 'var(--border)',
                                        color: b.status === 'ausstehend' ? 'var(--muted-foreground)' : 'white',
                                      }}
                                    >
                                      {b.status === 'abgeschlossen' ? '✓' : bi + 1}
                                    </div>
                                    {bi < p.berufsbilder.length - 1 && (
                                      <div style={{ width: 1, height: 20, backgroundColor: 'var(--border)', marginTop: 2 }} />
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div
                                    className="flex-1 rounded-lg p-3"
                                    style={{
                                      border: `1px solid ${b.status === 'aktiv' ? LEVEL_STYLES[b.level].text : 'var(--border)'}`,
                                      backgroundColor: b.status === 'aktiv' ? LEVEL_STYLES[b.level].bg : 'var(--card)',
                                      opacity: b.status === 'ausstehend' ? 0.6 : 1,
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium">{b.berufsbild}</span>
                                        <LevelBadge level={b.level} />
                                        {b.status === 'aktiv' && (
                                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: LEVEL_STYLES[b.level].text, color: 'white' }}>aktiv</span>
                                        )}
                                        {b.status === 'abgeschlossen' && (
                                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#D4EDDA', color: '#1A5C32' }}>abgeschlossen</span>
                                        )}
                                        {b.status === 'ausstehend' && (
                                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>ausstehend</span>
                                        )}
                                        {b.status !== 'ausstehend' && (() => {
                                          const fOpt = FORMAT_OPTIONS.find(o => o.id === b.format)
                                          const letter = PERSONA_MAP[b.level][b.format]
                                          const ls = LEVEL_STYLES[b.level]
                                          return (
                                            <span
                                              className="text-xs font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                                              style={{ backgroundColor: ls.bg, color: ls.text, border: `1px solid ${ls.text}` }}
                                              title={`${LEVEL_STYLES[b.level].label} · ${fOpt?.label}`}
                                            >
                                              <span style={{ fontWeight: 700 }}>Persona {letter}</span>
                                              {fOpt && <span style={{ opacity: 0.75 }}>· {fOpt.icon} {fOpt.label}</span>}
                                            </span>
                                          )
                                        })()}
                                      </div>
                                      {(() => {
                                        const bWsCount = worksheets.filter(w => w.berufsbild === b.berufsbild).length
                                        const doneCount = b.status === 'abgeschlossen' ? bWsCount : Math.min(b.worksheetsDone, bWsCount)
                                        return (
                                          <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                                            {doneCount} AB erledigt
                                          </span>
                                        )
                                      })()}
                                    </div>

                                    {b.status !== 'ausstehend' && (() => {
                                      const bWs = worksheets.filter(w => w.berufsbild === b.berufsbild)
                                      const detailKey = `${p.id}-${bi}`
                                      const bOpen = detailBerufsbild[detailKey] !== undefined
                                      const doneCount = b.status === 'abgeschlossen' ? bWs.length : Math.min(b.worksheetsDone, bWs.length)
                                      return (
                                        <>
                                          <ProgressBar value={b.progress} />
                                          <div className="flex items-center justify-between mt-1.5 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                                            <span>Start: {b.startDate}</span>
                                            <span>{b.endDate ? `Abschluss: ${b.endDate}` : `${b.progress}% abgeschlossen`}</span>
                                          </div>
                                          {bWs.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => setDetailBerufsbild(prev => {
                                                const next = { ...prev }
                                                bOpen ? delete next[detailKey] : (next[detailKey] = bi)
                                                return next
                                              })}
                                              className="mt-2 text-xs font-mono flex items-center gap-1 hover:opacity-70 transition-opacity"
                                              style={{ color: 'var(--primary)' }}
                                            >
                                              <span style={{ transform: bOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
                                              {bOpen ? 'Arbeitsblätter ausblenden' : `${bWs.length} Arbeitsblätter anzeigen`}
                                            </button>
                                          )}
                                          {bOpen && bWs.length > 0 && (
                                            <div className="mt-2 flex flex-col gap-1">
                                              {bWs.map((w, wi) => {
                                                const isDone = wi < doneCount
                                                const s2 = LEVEL_STYLES[b.level]
                                                return (
                                                  <div key={w.id} className="flex items-center gap-2 py-1 px-2 rounded text-xs"
                                                    style={{ backgroundColor: isDone ? '#F0FBF4' : 'var(--muted)', opacity: isDone ? 1 : 0.6 }}>
                                                    <span style={{ color: isDone ? '#2A7A4B' : s2.text, fontWeight: 700 }}>{isDone ? '✓' : wi + 1}</span>
                                                    <span className="flex-1 truncate">{w.title}</span>
                                                    <span className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>BS {w.baustein}</span>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </>
                                      )
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick stats */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Abgeschlossen', value: `${p.berufsbilder.filter(b => b.status === 'abgeschlossen').length} von ${p.berufsbilder.length}` },
                              { label: 'Arbeitsblätter', value: `${p.berufsbilder.reduce((s, b) => {
                                const bWsLen = worksheets.filter(w => w.berufsbild === b.berufsbild).length
                                return s + (b.status === 'abgeschlossen' ? bWsLen : Math.min(b.worksheetsDone, bWsLen))
                              }, 0)} erledigt` },
                              { label: 'Zuletzt aktiv', value: p.lastActive },
                            ].map(s => (
                              <div key={s.label} className="rounded p-3 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                                <div className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
                                <div className="text-sm font-semibold">{s.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => { setAssignWsParticipant(p); setAssignWsId(null) }}
                              className="text-xs px-3 py-2 rounded font-medium hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                              ✦ Arbeitsblatt zuweisen
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="text-xs px-3 py-2 rounded font-medium ml-auto hover:opacity-80 transition-opacity"
                              style={{ border: '1px solid var(--primary)', color: 'var(--primary)', backgroundColor: 'transparent' }}>
                              ✎ Bearbeiten
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Teilnehmer ${p.id} wirklich löschen?`)) handleDeleteParticipant(p.id)
                              }}
                              className="text-xs px-3 py-2 rounded font-medium hover:opacity-80 transition-opacity"
                              style={{ border: '1px solid #E53E3E', color: '#E53E3E', backgroundColor: 'transparent' }}>
                              ✕ Löschen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Arbeitsblatt zuweisen modal */}
          {assignWsParticipant && (() => {
              const ap = assignWsParticipant
              const active = ap.berufsbilder.find(b => b.status === 'aktiv')
              const relevantWs = active ? worksheets.filter(w => w.berufsbild === active.berufsbild) : worksheets
              return (
                <>
                  <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={() => setAssignWsParticipant(null)} />
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '80vh' }}>
                      <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <h3 className="font-display text-lg font-semibold">Arbeitsblatt zuweisen</h3>
                          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{ap.id} · {active ? active.berufsbild : 'Kein aktiver Bereich'}</div>
                        </div>
                        <button onClick={() => setAssignWsParticipant(null)} className="text-xl hover:opacity-50" style={{ color: 'var(--muted-foreground)' }}>✕</button>
                      </div>
                      <div className="flex flex-col gap-1 p-4 overflow-y-auto">
                        {relevantWs.length === 0 && (
                          <div className="text-sm text-center py-8" style={{ color: 'var(--muted-foreground)' }}>Keine passenden Arbeitsblätter gefunden.</div>
                        )}
                        {relevantWs.map(w => {
                          const isSelected = assignWsId === w.id
                          const fOpt = FORMAT_OPTIONS.find(o => o.id === w.format)
                          return (
                            <button key={w.id} type="button"
                              onClick={() => setAssignWsId(isSelected ? null : w.id)}
                              className="flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all hover:opacity-90"
                              style={{
                                border: isSelected ? `1.5px solid var(--primary)` : '1px solid var(--border)',
                                backgroundColor: isSelected ? 'var(--muted)' : 'transparent',
                              }}>
                              <div className="w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center"
                                style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border)', backgroundColor: isSelected ? 'var(--primary)' : 'transparent' }}>
                                {isSelected && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{w.title}</div>
                                <div className="text-xs font-mono mt-0.5 flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
                                  <span>BS {w.baustein}</span>
                                  <span>·</span>
                                  <span>{w.ausbildungsbaustein}</span>
                                  {fOpt && <span style={{ color: 'var(--muted-foreground)' }}>{fOpt.icon} {fOpt.label}</span>}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      <div className="px-4 py-4 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          disabled={assignWsId === null}
                          onClick={() => {
                            if (assignWsId !== null) {
                              alert(`Arbeitsblatt wurde ${ap.id} zugewiesen.`)
                              setAssignWsParticipant(null)
                              setAssignWsId(null)
                            }
                          }}
                          className="flex-1 py-2.5 rounded font-medium text-sm transition-opacity"
                          style={{
                            backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)',
                            opacity: assignWsId === null ? 0.4 : 1, cursor: assignWsId === null ? 'not-allowed' : 'pointer',
                          }}>
                          Zuweisen
                        </button>
                        <button type="button" onClick={() => setAssignWsParticipant(null)}
                          className="px-4 py-2.5 rounded text-sm hover:opacity-70"
                          style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}

          {/* BERICHTE */}
          {activeNav === 'berichte' && (
            <div className="max-w-2xl">
              <div className="rounded-lg p-8 text-center" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
                <div className="font-display text-2xl font-semibold mb-2">Berichte & Auswertungen</div>
                <div className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Dieser Bereich wird in einem späteren Sprint implementiert.</div>
                <div
                  className="inline-block text-xs font-mono px-3 py-1.5 rounded"
                  style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  SOLL – geplant für Sprint 2
                </div>
              </div>
            </div>
          )}
          {/* BENUTZERVERWALTUNG */}
          {activeNav === 'benutzerverwaltung' && currentUser.role === 'admin' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h2 className="font-display text-lg font-semibold">Mitarbeiter-Zugänge</h2>
                    <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{staffUsers.length} Konten · nur für Administratoren sichtbar</div>
                  </div>
                  <button
                    onClick={() => { setShowAddUser(true); setUserFormError('') }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    + Mitarbeiter anlegen
                  </button>
                </div>

                {/* User table */}
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {staffUsers.map(u => {
                    const roleColors: Record<StaffRole, { bg: string; color: string }> = {
                      admin: { bg: '#FAD9C8', color: '#7A2E00' },
                      dozent: { bg: '#D0E4F7', color: '#1A3A5C' },
                      assistent: { bg: '#D4EDDA', color: '#1A5C32' },
                    }
                    const rc = roleColors[u.role]
                    const isSelf = u.id === currentUser.id
                    return (
                      <div key={u.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-mono font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                          {u.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{u.name}</span>
                            {isSelf && <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>ich</span>}
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: rc.bg, color: rc.color }}>{ROLE_LABELS[u.role]}</span>
                          </div>
                          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{u.email}</div>
                        </div>
                        <div className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                          seit {u.createdAt}
                        </div>
                        {!isSelf && (
                          <button
                            onClick={() => { if (confirm(`Konto von ${u.name} wirklich löschen?`)) handleDeleteUser(u.id) }}
                            className="text-xs px-2.5 py-1.5 rounded hover:opacity-80 transition-opacity flex-shrink-0"
                            style={{ border: '1px solid #E53E3E', color: '#E53E3E' }}>
                            Löschen
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Add user modal */}
              {showAddUser && (
                <>
                  <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={() => setShowAddUser(false)} />
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
                      <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                        <h3 className="font-display text-lg font-semibold">Neuen Mitarbeiter anlegen</h3>
                        <button onClick={() => setShowAddUser(false)} className="text-xl hover:opacity-50" style={{ color: 'var(--muted-foreground)' }}>✕</button>
                      </div>
                      <form onSubmit={handleAddUser} className="px-6 py-5 flex flex-col gap-4">
                        <div>
                          <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>NAME *</label>
                          <input type="text" placeholder="Vor- und Nachname"
                            value={newUserForm.name} onChange={e => setNewUserForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded text-sm outline-none"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>E-MAIL-ADRESSE *</label>
                          <input type="email" placeholder="name@bildungspark.de"
                            value={newUserForm.email} onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded text-sm outline-none"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                        </div>
                        <div>
                          <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>ROLLE *</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['admin', 'dozent', 'assistent'] as StaffRole[]).map(r => {
                              const roleColors: Record<StaffRole, { bg: string; color: string }> = {
                                admin: { bg: '#FAD9C8', color: '#7A2E00' },
                                dozent: { bg: '#D0E4F7', color: '#1A3A5C' },
                                assistent: { bg: '#D4EDDA', color: '#1A5C32' },
                              }
                              const rc = roleColors[r]
                              const isActive = newUserForm.role === r
                              return (
                                <button key={r} type="button" onClick={() => setNewUserForm(f => ({ ...f, role: r }))}
                                  className="flex flex-col items-center py-2.5 rounded transition-all"
                                  style={{
                                    border: isActive ? `1.5px solid ${rc.color}` : '1px solid var(--border)',
                                    backgroundColor: isActive ? rc.bg : 'var(--background)',
                                  }}>
                                  <span className="text-xs font-semibold" style={{ color: rc.color }}>{ROLE_LABELS[r]}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>PASSWORT *</label>
                          <input type="password" placeholder="Mindestens 8 Zeichen"
                            value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded text-sm outline-none"
                            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                        </div>
                        {userFormError && (
                          <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF2F2', color: '#E53E3E', border: '1px solid #FECACA' }}>{userFormError}</div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <button type="submit"
                            className="flex-1 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                            Konto anlegen
                          </button>
                          <button type="button" onClick={() => setShowAddUser(false)}
                            className="px-4 py-2.5 rounded text-sm hover:opacity-70"
                            style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            Abbrechen
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* EINSTELLUNGEN */}
          {activeNav === 'einstellungen' && (() => {
            const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
              <button type="button" onClick={onToggle}
                className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: value ? 'var(--primary)' : 'var(--border)' }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            )
            const SectionHeader = ({ title, desc }: { title: string; desc?: string }) => (
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}>
                <h2 className="font-display text-base font-semibold">{title}</h2>
                {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>}
              </div>
            )
            const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
              <div className="flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{label}</div>
                  {desc && <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</div>}
                </div>
                <div className="flex-shrink-0">{children}</div>
              </div>
            )
            return (
              <div className="flex flex-col gap-6 max-w-2xl">

                {/* Darstellung */}
                <form onSubmit={handleSaveSettings} className="contents">
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <SectionHeader title="Darstellung" desc="Farbgebung, Erscheinungsbild und Layout der Oberfläche." />
                  <div className="px-6 py-5 flex flex-col gap-5">
                    <Row label="Dunkelmodus" desc="Dunkle Hintergrundfarben für die gesamte Oberfläche">
                      <Toggle value={settings.darkMode} onToggle={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))} />
                    </Row>
                    <Row label="Kompakte Seitenleiste" desc="Zeigt nur Icons ohne Beschriftung in der Navigation">
                      <Toggle value={settings.sidebarCompact} onToggle={() => setSettings(s => ({ ...s, sidebarCompact: !s.sidebarCompact }))} />
                    </Row>
                    <div>
                      <label className="block text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>AKZENTFARBE</label>
                      <div className="flex items-center gap-3 flex-wrap">
                        {['#C4632A', '#2A6B4B', '#1E5FA0', '#7A2E9A', '#C4A020', '#C42A2A'].map(color => (
                          <button key={color} type="button" onClick={() => setSettings(s => ({ ...s, accentColor: color }))}
                            className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                            style={{ backgroundColor: color, outline: settings.accentColor === color ? `3px solid ${color}` : 'none', outlineOffset: 2 }} />
                        ))}
                        <div className="flex items-center gap-2">
                          <input type="color" value={settings.accentColor}
                            onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))}
                            className="w-8 h-8 rounded cursor-pointer" style={{ border: '1px solid var(--border)', padding: 1 }} />
                          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>Eigene</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>NAVIGATIONSFARBE</label>
                      <div className="flex items-center gap-3 flex-wrap">
                        {['#1E3A5F', '#1A5C32', '#4A1A6B', '#5C3A1A', '#1A4A5C', '#3A1A1A'].map(color => (
                          <button key={color} type="button" onClick={() => setSettings(s => ({ ...s, primaryColor: color }))}
                            className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                            style={{ backgroundColor: color, outline: settings.primaryColor === color ? `3px solid ${color}` : 'none', outlineOffset: 2 }} />
                        ))}
                        <div className="flex items-center gap-2">
                          <input type="color" value={settings.primaryColor}
                            onChange={e => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                            className="w-8 h-8 rounded cursor-pointer" style={{ border: '1px solid var(--border)', padding: 1 }} />
                          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>Eigene</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sprache & Regional */}
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <SectionHeader title="Sprache & Regional" desc="Spracheinstellungen und Datumsformate." />
                  <div className="px-6 py-5 flex flex-col gap-4">
                    <Row label="Sprache der Oberfläche">
                      <div className="flex gap-2">
                        {(['de', 'en'] as const).map(lang => (
                          <button key={lang} type="button" onClick={() => setSettings(s => ({ ...s, language: lang }))}
                            className="px-3 py-1.5 rounded text-xs font-mono font-medium transition-all"
                            style={{
                              border: settings.language === lang ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              backgroundColor: settings.language === lang ? 'var(--muted)' : 'transparent',
                              color: 'var(--foreground)',
                            }}>
                            {lang === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}
                          </button>
                        ))}
                      </div>
                    </Row>
                    <Row label="Datumsformat">
                      <div className="flex gap-2">
                        {(['DD.MM.YYYY', 'YYYY-MM-DD'] as const).map(fmt => (
                          <button key={fmt} type="button" onClick={() => setSettings(s => ({ ...s, dateFormat: fmt }))}
                            className="px-3 py-1.5 rounded text-xs font-mono transition-all"
                            style={{
                              border: settings.dateFormat === fmt ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              backgroundColor: settings.dateFormat === fmt ? 'var(--muted)' : 'transparent',
                              color: 'var(--foreground)',
                            }}>{fmt}</button>
                        ))}
                      </div>
                    </Row>
                  </div>
                </div>

                {/* Arbeitsblätter & KI */}
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <SectionHeader title="Arbeitsblätter & KI" desc="Standardverhalten beim Erstellen und Bearbeiten von Arbeitsblättern." />
                  <div className="px-6 py-5 flex flex-col gap-4">
                    <Row label="Standard-Berufsbild">
                      <select value={settings.defaultBerufsbild}
                        onChange={e => setSettings(s => ({ ...s, defaultBerufsbild: e.target.value }))}
                        className="px-3 py-1.5 rounded text-sm outline-none"
                        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
                        {berufsbilder.filter(b => b !== 'Alle Berufsbilder').map(b => <option key={b}>{b}</option>)}
                      </select>
                    </Row>
                    <Row label="Standard-Exportformat">
                      <div className="flex gap-2">
                        {(['docx', 'pdf'] as const).map(fmt => (
                          <button key={fmt} type="button" onClick={() => setSettings(s => ({ ...s, exportFormat: fmt }))}
                            className="px-3 py-1.5 rounded text-xs font-mono transition-all"
                            style={{
                              border: settings.exportFormat === fmt ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              backgroundColor: settings.exportFormat === fmt ? 'var(--muted)' : 'transparent',
                              color: 'var(--foreground)',
                            }}>.{fmt}</button>
                        ))}
                      </div>
                    </Row>
                    <Row label="KI-Ergebnis automatisch aufklappen" desc="Nach erfolgreicher Generierung direkt anzeigen">
                      <Toggle value={settings.aiAutoExpand} onToggle={() => setSettings(s => ({ ...s, aiAutoExpand: !s.aiAutoExpand }))} />
                    </Row>
                    <Row label="Persona-Badges anzeigen" desc="Empfohlene Persona-Kennzeichnung auf Arbeitsblatt-Karten">
                      <Toggle value={settings.showPersonaBadges} onToggle={() => setSettings(s => ({ ...s, showPersonaBadges: !s.showPersonaBadges }))} />
                    </Row>
                    <Row label="Automatisch speichern" desc="Änderungen beim Bearbeiten alle 30 Sekunden automatisch sichern">
                      <Toggle value={settings.autoSave} onToggle={() => setSettings(s => ({ ...s, autoSave: !s.autoSave }))} />
                    </Row>
                  </div>
                </div>

                {/* Sitzung & Sicherheit */}
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <SectionHeader title="Sitzung & Sicherheit" desc="Sitzungszeit und Benachrichtigungen." />
                  <div className="px-6 py-5 flex flex-col gap-4">
                    <Row label="Automatische Abmeldung nach Inaktivität">
                      <select value={settings.sessionTimeout}
                        onChange={e => setSettings(s => ({ ...s, sessionTimeout: e.target.value as AppSettings['sessionTimeout'] }))}
                        className="px-3 py-1.5 rounded text-sm outline-none"
                        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
                        <option value="30">30 Minuten</option>
                        <option value="60">1 Stunde</option>
                        <option value="120">2 Stunden</option>
                        <option value="never">Nie</option>
                      </select>
                    </Row>
                    <Row label="E-Mail-Benachrichtigungen" desc="Bei neuen Arbeitsblättern oder Kommentaren eine E-Mail erhalten">
                      <Toggle value={settings.emailNotifications} onToggle={() => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }))} />
                    </Row>
                    <Row label="Erinnerungen für ausstehende Arbeitsblätter" desc="Täglich an nicht abgeschlossene Teilnehmer-Aufgaben erinnern">
                      <Toggle value={settings.worksheetReminders} onToggle={() => setSettings(s => ({ ...s, worksheetReminders: !s.worksheetReminders }))} />
                    </Row>
                  </div>
                </div>

                {/* Save bar */}
                <div className="flex items-center gap-3">
                  <button type="submit"
                    className="px-5 py-2.5 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                    Einstellungen speichern
                  </button>
                  {settingsSaved && <span className="text-sm font-mono" style={{ color: '#2A7A4B' }}>✓ Gespeichert</span>}
                </div>
                </form>

                {/* Mein Konto — separate form */}
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <SectionHeader title="Mein Konto" />
                  <div className="px-6 py-5 flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-mono font-bold flex-shrink-0"
                        style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                        {currentUser.initials}
                      </div>
                      <div>
                        <div className="font-medium">{currentUser.name}</div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{currentUser.email} · {ROLE_LABELS[currentUser.role]}</div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div className="text-sm font-semibold mb-4">Passwort ändern</div>
                      <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>AKTUELLES PASSWORT</label>
                          <input type="password" value={pwCurrent} onChange={e => { setPwCurrent(e.target.value); setPwError('') }}
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 rounded text-sm outline-none"
                            style={{ border: `1px solid ${pwError ? '#E53E3E' : 'var(--border)'}`, backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>NEUES PASSWORT</label>
                            <input type="password" value={pwNew} onChange={e => { setPwNew(e.target.value); setPwError('') }}
                              placeholder="Min. 8 Zeichen"
                              className="w-full px-3 py-2.5 rounded text-sm outline-none"
                              style={{ border: `1px solid ${pwError ? '#E53E3E' : 'var(--border)'}`, backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                          </div>
                          <div>
                            <label className="block text-xs font-mono font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>PASSWORT WIEDERHOLEN</label>
                            <input type="password" value={pwConfirm} onChange={e => { setPwConfirm(e.target.value); setPwError('') }}
                              placeholder="••••••••"
                              className="w-full px-3 py-2.5 rounded text-sm outline-none"
                              style={{ border: `1px solid ${pwError ? '#E53E3E' : 'var(--border)'}`, backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                          </div>
                        </div>
                        {pwError && <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF2F2', color: '#E53E3E', border: '1px solid #FECACA' }}>{pwError}</div>}
                        {pwSuccess && <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#F0FBF4', color: '#2A7A4B', border: '1px solid #C3E6CB' }}>✓ Passwort erfolgreich geändert.</div>}
                        <div>
                          <button type="submit"
                            className="px-4 py-2 rounded font-medium text-sm hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                            Passwort ändern
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

              </div>
            )
          })()}

        </main>
      </div>
    </div>
  )
}
