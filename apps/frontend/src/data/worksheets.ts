import type { HistoryEntry, Worksheet } from '@/types'

/**
 * Beispieldaten fuer den Prototyp.
 * Werden spaeter durch Backend-Daten (/api/arbeitsblaetter) ersetzt.
 */
export const WORKSHEETS: Worksheet[] = [
  {
    id: 1, berufsbild: 'Lagerlogistik', baustein: 1,
    ausbildungsbaustein: 'Wareneingang', createdBy: 'C. Hager', date: '2025-09-24', aiGenerated: true, participants: 8, format: 'text',
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
    ausbildungsbaustein: 'Wareneingang', createdBy: 'A. Mustajbegovic', date: '2025-09-22', aiGenerated: false, participants: 12, format: 'piktogramm',
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
    ausbildungsbaustein: 'Innerbetrieblicher Transport', createdBy: 'C. Hager', date: '2025-09-20', aiGenerated: true, participants: 6, format: 'text',
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
    ausbildungsbaustein: 'Lagerung von Gütern', createdBy: 'T. Neumann', date: '2025-09-18', aiGenerated: true, participants: 4, format: 'text',
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
    ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', createdBy: 'S. Oturucu', date: '2025-09-17', aiGenerated: false, participants: 9, format: 'text',
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
    ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', createdBy: 'C. Hager', date: '2025-09-15', aiGenerated: false, participants: 11, format: 'text',
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
    ausbildungsbaustein: 'Hygiene', createdBy: 'O. Oláh', date: '2025-09-12', aiGenerated: true, participants: 5, format: 'mathefrei',
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
    ausbildungsbaustein: 'Hygiene', createdBy: 'A. Mustajbegovic', date: '2025-09-10', aiGenerated: true, participants: 7, format: 'text',
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
    ausbildungsbaustein: 'Reinigungsverfahren', createdBy: 'C. Hager', date: '2025-08-10', aiGenerated: false, participants: 5, format: 'piktogramm',
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
    ausbildungsbaustein: 'Reinigungsverfahren', createdBy: 'C. Hager', date: '2025-08-05', aiGenerated: true, participants: 6, format: 'text',
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
    ausbildungsbaustein: 'Unterhaltsreinigung', createdBy: 'T. Neumann', date: '2025-07-28', aiGenerated: false, participants: 4, format: 'text',
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
    ausbildungsbaustein: 'Unterhaltsreinigung', createdBy: 'A. Mustajbegovic', date: '2025-07-20', aiGenerated: true, participants: 5, format: 'piktogramm',
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

/** Versionsverlauf je Arbeitsblatt-ID, neueste Version zuerst */
export const WORKSHEET_HISTORY: Record<number, HistoryEntry[]> = {
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
