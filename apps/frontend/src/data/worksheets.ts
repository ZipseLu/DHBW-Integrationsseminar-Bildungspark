import { BERUFSBILD_GASTRO, BERUFSBILD_LAGER, BERUFSBILD_METALL } from '@/data/constants'
import type { HistoryEntry, Worksheet } from '@/types'

/**
 * Beispieldaten fuer den Prototyp.
 *
 * Alle zwoelf Eintraege stammen aus den binnendifferenzierten Lehrplaenen, die
 * der Bildungspark uebergeben hat (TQ Lager Baustein 1-3, TQ Metall Baustein 2,
 * TQ Gastro Baustein 2-5). `ausbildungsbaustein` ist der Titel des Bausteins,
 * `abschnitt.titel` das Lernziel, die vier Zeilen T/A/F/B sind die Spalten
 * "Binnendifferenzierung" und "Beispiel" des Lehrplans (Tippfehler bereinigt).
 * Siehe docs/fachliche-grundlagen.md.
 *
 * Ersteller, Datum, Teilnehmerzahl und Format sind Platzhalter des Prototyps.
 * Werden spaeter durch Backend-Daten (/api/worksheets) ersetzt.
 */
export const WORKSHEETS: Worksheet[] = [
  {
    id: 1, berufsbild: BERUFSBILD_LAGER, baustein: 1,
    ausbildungsbaustein: 'Wareneingang', createdBy: 'C. Hager', date: '2026-10-14', aiGenerated: true, participants: 8, format: 'text',
    title: 'Begleitpapiere prüfen',
    abschnitt: {
      titel: 'Begleitpapiere unter Berücksichtigung von Zoll- und Gefahrgutvorschriften und nach betrieblichen Vorgaben auf Richtigkeit und Vollständigkeit prüfen',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Prüfung auf Vollständigkeit', beispiel: 'Begleitpapier entgegennehmen und dem Anleiter übergeben' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Prüfung auf Vollständigkeit', beispiel: 'Begleitpapiere von bekannten wiederkehrenden Lieferungen entgegennehmen und kontrollieren. Bei Abweichungen den Anleiter informieren.' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte bei der Prüfung auf Vollständigkeit unter Berücksichtigung von Zoll- und Gefahrgutvorschriften und betrieblichen Vorgaben und kann diese in bekannten Situationen anwenden', beispiel: 'Begleitpapiere von Lieferungen entgegennehmen und kontrollieren. Bei Abweichungen den Anleiter informieren.' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte bei der Prüfung auf Vollständigkeit unter Berücksichtigung von Zoll- und Gefahrgutvorschriften und betrieblichen Vorgaben und kann diese in neuen Situationen anwenden', beispiel: 'Begleitpapiere eingehender Lieferungen entgegennehmen und kontrollieren. Bei Abweichungen Maßnahmen ergreifen.' },
      },
    },
  },
  {
    id: 2, berufsbild: BERUFSBILD_LAGER, baustein: 1,
    ausbildungsbaustein: 'Wareneingang', createdBy: 'A. Mustajbegovic', date: '2026-10-12', aiGenerated: false, participants: 12, format: 'piktogramm',
    title: 'Güter entladen',
    abschnitt: {
      titel: 'Güter entladen',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Entladung von Gütern', beispiel: 'Informiert den Anleiter, dass ein LKW zur Entladung bereit steht.' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Entladung von Gütern', beispiel: 'Übernimmt bei der Entladung von bekannten Gütern vorgegebene Aufgaben, zum Beispiel das kontrollierte Gut mit dem Hubwagen abtransportieren.' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte bei der Entladung von Gütern und kann diese in bekannten Situationen anwenden', beispiel: 'Kontrolliert den Lieferschein und übernimmt den innerbetrieblichen Transport.' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte bei der Entladung von Gütern und kann diese in neuen Situationen anwenden', beispiel: 'Kontrolliert den Lieferschein und übernimmt den innerbetrieblichen Transport. Wählt hierfür das geeignete Transportmittel aus.' },
      },
    },
  },
  {
    id: 3, berufsbild: BERUFSBILD_LAGER, baustein: 2,
    ausbildungsbaustein: 'Innerbetrieblicher Transport', createdBy: 'C. Hager', date: '2026-10-09', aiGenerated: true, participants: 6, format: 'text',
    title: 'Vorschriften bei Verpackung und Transport',
    abschnitt: {
      titel: 'Gesetzliche und betriebliche Vorschriften bei Verpackung und Transport anwenden',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Handhabung von Verpackung und/oder Transport', beispiel: 'Transportiert schwere Güter mit Handwagen' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Handhabung von Verpackung und Transport', beispiel: 'Kennzeichnet bekannte verpackte Güter wie vorgegeben.' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte bei der Handhabung von Verpackung und Transport, wendet gesetzliche und betriebliche Vorschriften an und kann diese in bekannten Situationen anwenden', beispiel: 'Kennzeichnet verschiedene immer wieder vorkommende Güter wie erlernt' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte bei der Handhabung von Verpackung und Transport, wendet gesetzliche und betriebliche Vorschriften an und kann diese in neuen Situationen anwenden', beispiel: 'Kennzeichnet Güter nach gesetzlicher und betrieblicher Vorgabe für den Versand' },
      },
    },
  },
  {
    id: 4, berufsbild: BERUFSBILD_LAGER, baustein: 3,
    ausbildungsbaustein: 'Lagerung von Gütern', createdBy: 'T. Neumann', date: '2026-10-07', aiGenerated: true, participants: 4, format: 'text',
    title: 'Güter auszeichnen und sortieren',
    abschnitt: {
      titel: 'Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden sowie Güter zur Lagerung vorbereiten',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Auszeichnung und/oder Sortierung der Güter und/oder einen Arbeitsschritt bei der Bildung von Lager- und Verkaufseinheiten sowie Vorbereitung der Güter zur Lagerung', beispiel: 'Güter auszeichnen und sortieren' },
        A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Auszeichnung und/oder Sortierung der Güter und/oder einen Arbeitsschritt bei der Bildung von Lager- und Verkaufseinheiten sowie Vorbereitung der Güter zur Lagerung', beispiel: 'Güter auszeichnen, sortieren und zu Lager- und Verkaufseinheiten bündeln' },
        F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte bei der Auszeichnung, Sortierung der Güter und bei der Bildung von Lager- und Verkaufseinheiten sowie bei der Vorbereitung der Güter zur Lagerung und kann diese in bekannten Situationen anwenden', beispiel: 'Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden sowie Güter zur Lagerung vorbereiten' },
        B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte bei der Auszeichnung, Sortierung der Güter und bei der Bildung von Lager- und Verkaufseinheiten sowie bei der Vorbereitung der Güter zur Lagerung und kann diese in neuen Situationen anwenden', beispiel: 'Selbständig Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden, Güter zur Lagerung vorbereiten sowie Ladungsträger und geeignete Transportmittel aussuchen' },
      },
    },
  },
  {
    id: 5, berufsbild: BERUFSBILD_METALL, baustein: 2,
    ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', createdBy: 'S. Oturucu', date: '2026-10-06', aiGenerated: false, participants: 9, format: 'text',
    title: 'Planung der Herstellung durch Fügen',
    abschnitt: {
      titel: 'Planung der Herstellung von Bauteilen durch Fügen durch Nutzung von Gesamtzeichnungen, Stücklisten, Anordnungs- und Montageplänen',
      niveaus: {
        T: { kompetenz: 'Beherrscht eine erlernte Anwendung einer Gesamtzeichnung, Stückliste, Anordnungs- und Montagepläne', beispiel: 'Teile nach Montageplan heraussuchen' },
        A: { kompetenz: 'Beherrscht eine vorgegebene bekannte Anwendung einer Gesamtzeichnung, Stückliste, Anordnungs- und Montagepläne', beispiel: 'Teile nach Montageplan kontrollieren' },
        F: { kompetenz: 'Beherrscht die erlernte Anfertigung und Anwendung einer Gesamtzeichnung, Stückliste, Anordnungs- und Montagepläne und kann diese in bekannten Situationen anwenden', beispiel: 'Montageplan auswählen und Bauteile nach Maß kontrollieren' },
        B: { kompetenz: 'Beherrscht die gängige Anfertigung und Anwendung einer Gesamtzeichnung, Stückliste, Anordnungs- und Montagepläne und kann diese in neuen Situationen anwenden', beispiel: 'Montageplan auswählen und anwenden; Handskizzen zur Montage können erstellt werden' },
      },
    },
  },
  {
    id: 6, berufsbild: BERUFSBILD_METALL, baustein: 2,
    ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', createdBy: 'C. Hager', date: '2026-10-02', aiGenerated: false, participants: 11, format: 'text',
    title: 'Arbeitsplatz einrichten und Arbeitssicherheit',
    abschnitt: {
      titel: 'Einrichtung des Arbeitsplatzes unter Berücksichtigung betrieblicher Vorgaben',
      niveaus: {
        T: { kompetenz: 'Beherrscht eine erlernte Grundlage der Arbeitssicherheit', beispiel: 'Benennt die wichtigsten Arbeitsschutzzeichen' },
        A: { kompetenz: 'Beherrscht vorgegebene bekannte Gefahren- und Sicherheitsvorgaben und Maßnahmen zu ihrer Vermeidung', beispiel: 'Benennt die wichtigsten Arbeitsschutzzeichen, kann direkte Gefährdungen zuordnen und benutzt entsprechende PSA' },
        F: { kompetenz: 'Beherrscht die erlernten Gefahren- und Sicherheitsvorgaben und kann Maßnahmen zu ihrer Vermeidung in bekannten Situationen anwenden', beispiel: 'Benennt die Zeichen und Inhalte, benutzt entsprechende PSA und Sicherheitsvorrichtungen. Beseitigt Störungen im gewohnten Ablauf unter Anleitung.' },
        B: { kompetenz: 'Beherrscht die gängigen Verfahren zur Feststellung der Gefährdung von Sicherheit und Gesundheit am Arbeitsplatz und kann Maßnahmen zu ihrer Vermeidung in neuen Situationen anwenden', beispiel: 'Kennt alle gängigen Arbeitsschutzzeichen, Gefahrstoffverordnungen und Gefährdungsbeurteilungen, kann mögliche Gefahrenquellen zuordnen und Maßnahmen zur Vermeidung anwenden' },
      },
    },
  },
  {
    id: 7, berufsbild: BERUFSBILD_METALL, baustein: 2,
    ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', createdBy: 'T. Neumann', date: '2026-09-30', aiGenerated: true, participants: 7, format: 'piktogramm',
    title: 'Bauteile zu Baugruppen fügen',
    abschnitt: {
      titel: 'Fügen von Bauteilen aus identischen und unterschiedlichen Werkstoffen mit lösbaren und festen Verbindungen zu Baugruppen',
      niveaus: {
        T: { kompetenz: 'Kann eine erlernte Baugruppe zusammenfügen', beispiel: 'Erkennt verschiedene Bauteile' },
        A: { kompetenz: 'Kann einige erlernte Baugruppen zusammenfügen und unterschiedliche Werkstoffe nutzen und zuordnen', beispiel: 'Kann verschiedene Eigenschaften der Bauteile unterscheiden' },
        F: { kompetenz: 'Kann einige erlernte Baugruppen zusammenfügen und unterschiedliche Werkstoffe in bekannten Situationen nutzen und zuordnen', beispiel: 'Kann unterschiedliche Bauteile und Werkstoffe benennen' },
        B: { kompetenz: 'Kann gängige Bauteile und Werkstoffe benennen und in neuen Situationen anwenden', beispiel: 'Kann unterschiedliche Eigenschaften benennen und selbständig die Werkstoffauswahl treffen' },
      },
    },
  },
  {
    id: 8, berufsbild: BERUFSBILD_GASTRO, baustein: 2,
    ausbildungsbaustein: 'Grundlagen des Berufsbereichs Küche und Zubereitung', createdBy: 'O. Oláh', date: '2026-09-28', aiGenerated: true, participants: 5, format: 'piktogramm',
    title: 'Speisen anrichten',
    abschnitt: {
      titel: 'Speisen anrichten',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen Schritt beim Anrichten von Speisen', beispiel: 'Holt Anrichtegeschirr' },
        A: { kompetenz: 'Beherrscht vorgegebene bekannte Schritte beim Anrichten von Speisen', beispiel: 'Legt einzelne anzurichtende Teile nach Vorgabe auf Anrichtegeschirr' },
        F: { kompetenz: 'Beherrscht die erlernten Schritte beim Anrichten von Speisen und kann diese in bekannten Situationen anwenden', beispiel: 'Kann eine Speise nach Vorgabe anrichten' },
        B: { kompetenz: 'Beherrscht die gängigen Schritte beim Anrichten von Speisen und kann diese in neuen Situationen anwenden', beispiel: 'Kann verschiedene Gerichte anrichten' },
      },
    },
  },
  {
    id: 9, berufsbild: BERUFSBILD_GASTRO, baustein: 3,
    ausbildungsbaustein: 'Service', createdBy: 'A. Mustajbegovic', date: '2026-09-25', aiGenerated: false, participants: 6, format: 'text',
    title: 'Verkaufsfähigkeit von Produkten prüfen',
    abschnitt: {
      titel: 'Verkaufsfähigkeit von Produkten prüfen',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen Schritt bei der Prüfung der Verkaufsfähigkeit von Produkten', beispiel: 'Legt aussortierte Ware in ein Behältnis' },
        A: { kompetenz: 'Beherrscht vorgegebene bekannte Schritte bei der Prüfung der Verkaufsfähigkeit von Produkten', beispiel: 'Prüft das MHD' },
        F: { kompetenz: 'Beherrscht die erlernten Schritte zur Prüfung der Verkaufsfähigkeit von Produkten und kann diese in bekannten Situationen anwenden', beispiel: 'Kann bekannte Ware entsprechend herausnehmen, das MHD beurteilen und ggf. aussortieren' },
        B: { kompetenz: 'Beherrscht die gängigen Schritte zur Prüfung der Verkaufsfähigkeit von Produkten und kann diese in neuen Situationen anwenden', beispiel: 'Kann jegliche Ware entsprechend herausnehmen, das MHD beurteilen und ggf. aussortieren' },
      },
    },
  },
  {
    id: 10, berufsbild: BERUFSBILD_GASTRO, baustein: 4,
    ausbildungsbaustein: 'Lager/Warenwirtschaft', createdBy: 'C. Hager', date: '2026-09-22', aiGenerated: true, participants: 5, format: 'mathefrei',
    title: 'Produkte auf Güte prüfen',
    abschnitt: {
      titel: 'Produkte auf Güte prüfen und Verwendungsmöglichkeiten zuordnen',
      niveaus: {
        T: { kompetenz: 'Beherrscht einen Schritt bei der Güteprüfung von Produkten oder kann eine Verwendungsmöglichkeit wiedergeben', beispiel: 'Kann Apfel auf Druckstellen prüfen' },
        A: { kompetenz: 'Beherrscht vorgegebene bekannte Schritte bei der Güteprüfung von Produkten oder kann einige erlernte Verwendungsmöglichkeiten wiedergeben', beispiel: 'Kann einzelne Produkte nach Vorgabe auf Beschaffenheit prüfen und das Gewicht ermitteln' },
        F: { kompetenz: 'Beherrscht die erlernten Schritte bei der Güteprüfung von Produkten, kann erlernte Verwendungsmöglichkeiten wiedergeben und diese in bekannten Situationen anwenden', beispiel: 'Kann Obst und Gemüse auf äußere Beschaffenheit, Größe, Gewicht, Aussehen, Geschmack und Konsistenz prüfen' },
        B: { kompetenz: 'Beherrscht die gängigen Schritte bei der Güteprüfung von Produkten, kann die gängigen Verwendungsmöglichkeiten wiedergeben und diese in neuen Situationen anwenden', beispiel: 'Kann verschiedene Produkte auf äußere Beschaffenheit, Größe, Gewicht, Aussehen, Geschmack und Konsistenz prüfen' },
      },
    },
  },
  {
    id: 11, berufsbild: BERUFSBILD_GASTRO, baustein: 5,
    ausbildungsbaustein: 'Hygiene', createdBy: 'T. Neumann', date: '2026-09-18', aiGenerated: false, participants: 4, format: 'text',
    title: 'Geräte, Maschinen und Gebrauchsgüter reinigen',
    abschnitt: {
      titel: 'Geräte, Maschinen und Gebrauchsgüter reinigen und pflegen',
      niveaus: {
        T: { kompetenz: 'Beherrscht die erlernte Reinigung und Pflege eines Gerätes, einer Maschine oder eines Gebrauchsgutes', beispiel: 'Kann Schüsseln reinigen' },
        A: { kompetenz: 'Beherrscht die vorgegebene bekannte Reinigung und Pflege von Geräten, Maschinen oder Gebrauchsgütern', beispiel: 'Kann Schüsseln, Pfannen, Töpfe und Messer nach Vorgabe reinigen' },
        F: { kompetenz: 'Beherrscht die erlernte Reinigung und Pflege von Geräten, Maschinen oder Gebrauchsgütern und kann diese in bekannten Situationen anwenden', beispiel: 'Kann Herde und Backöfen nach Vorgabe reinigen' },
        B: { kompetenz: 'Beherrscht die gängige Reinigung und Pflege von Geräten, Maschinen oder Gebrauchsgütern und kann diese in neuen Situationen anwenden', beispiel: 'Kann alle Geräte, Maschinen und Gebrauchsgüter nach Vorgabe reinigen' },
      },
    },
  },
  {
    id: 12, berufsbild: BERUFSBILD_GASTRO, baustein: 5,
    ausbildungsbaustein: 'Hygiene', createdBy: 'A. Mustajbegovic', date: '2026-09-16', aiGenerated: true, participants: 5, format: 'piktogramm-mathefrei',
    title: 'Personal- und Betriebshygiene',
    abschnitt: {
      titel: 'Vorschriften und Grundsätze zur Personal- und Betriebshygiene anwenden',
      niveaus: {
        T: { kompetenz: 'Beherrscht eine erlernte Vorschrift bzw. einen Grundsatz zur Personal- und Betriebshygiene', beispiel: 'Wäscht und desinfiziert seine Hände nach Vorgabe' },
        A: { kompetenz: 'Beherrscht vorgegebene bekannte Vorschriften und Grundsätze zur Personal- und Betriebshygiene', beispiel: 'Wäscht und desinfiziert seine Hände nach Vorgabe und setzt ein Haarnetz auf' },
        F: { kompetenz: 'Beherrscht erlernte Vorschriften und Grundsätze zur Personal- und Betriebshygiene und kann diese in bekannten Situationen anwenden', beispiel: 'Wäscht und desinfiziert seine Hände nach Vorgabe, setzt ein Haarnetz auf und reinigt die Arbeitsmittel nach Vorgabe' },
        B: { kompetenz: 'Beherrscht die gängigen Vorschriften und Grundsätze zur Personal- und Betriebshygiene und kann diese in neuen Situationen anwenden', beispiel: 'Wäscht und desinfiziert seine Hände nach Vorgabe, setzt ein Haarnetz auf, reinigt die Arbeitsmittel nach Vorgabe und beachtet auch die Vorgaben zur Produkthygiene' },
      },
    },
  },
]

/** Versionsverlauf je Arbeitsblatt-ID, neueste Version zuerst (Platzhalter des Prototyps) */
export const WORKSHEET_HISTORY: Record<number, HistoryEntry[]> = {
  1: [
    { version: 3, date: '2026-10-14', author: 'C. Hager', action: 'freigegeben', note: 'Freigabe nach interner Prüfung' },
    { version: 2, date: '2026-10-12', author: 'KI-System', action: 'KI-angepasst', note: 'Niveaustufen T und A automatisch verfeinert' },
    { version: 1, date: '2026-10-08', author: 'C. Hager', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Lager, Baustein 1' },
  ],
  2: [
    { version: 2, date: '2026-10-12', author: 'A. Mustajbegovic', action: 'bearbeitet', note: 'Beispielaufgaben für Stufe B ergänzt' },
    { version: 1, date: '2026-10-05', author: 'A. Mustajbegovic', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Lager, Baustein 1' },
  ],
  3: [
    { version: 3, date: '2026-10-09', author: 'C. Hager', action: 'freigegeben', note: 'Gefahrgutinhalte geprüft und freigegeben' },
    { version: 2, date: '2026-10-08', author: 'KI-System', action: 'KI-angepasst', note: 'Gefahrgutbegriffe vereinfacht für Stufe T' },
    { version: 1, date: '2026-10-01', author: 'C. Hager', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Lager, Baustein 2' },
  ],
  4: [
    { version: 2, date: '2026-10-07', author: 'KI-System', action: 'KI-angepasst', note: 'Niveaustufen aus dem Lehrplan übernommen und Beispiele ausformuliert' },
    { version: 1, date: '2026-10-01', author: 'T. Neumann', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Lager, Baustein 3' },
  ],
  5: [
    { version: 2, date: '2026-10-06', author: 'S. Oturucu', action: 'bearbeitet', note: 'Beispiele an die Werkstatt angepasst' },
    { version: 1, date: '2026-09-29', author: 'S. Oturucu', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Metall, Baustein 2, Abschnitt 1' },
  ],
  6: [
    { version: 3, date: '2026-10-02', author: 'S. Oturucu', action: 'bearbeitet', note: 'DGUV-Vorschriften aktualisiert' },
    { version: 2, date: '2026-09-30', author: 'C. Hager', action: 'bearbeitet', note: 'Arbeitssicherheitshinweise ergänzt' },
    { version: 1, date: '2026-09-24', author: 'S. Oturucu', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Metall, Baustein 2, Abschnitt 4' },
  ],
  7: [
    { version: 2, date: '2026-09-30', author: 'KI-System', action: 'KI-angepasst', note: 'Barrierefreie Piktogramm-Version generiert' },
    { version: 1, date: '2026-09-23', author: 'T. Neumann', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Metall, Baustein 2, Abschnitt 5' },
  ],
  8: [
    { version: 2, date: '2026-09-28', author: 'KI-System', action: 'KI-angepasst', note: 'Piktogramm-Version für Stufe T generiert' },
    { version: 1, date: '2026-09-21', author: 'O. Oláh', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Gastro, Baustein 2' },
  ],
  9: [
    { version: 2, date: '2026-09-25', author: 'A. Mustajbegovic', action: 'bearbeitet', note: 'Beispiele zum MHD konkretisiert' },
    { version: 1, date: '2026-09-18', author: 'A. Mustajbegovic', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Gastro, Baustein 3' },
  ],
  10: [
    { version: 2, date: '2026-09-22', author: 'C. Hager', action: 'freigegeben', note: 'KI-generierte Variante ohne Rechenschritte geprüft und freigegeben' },
    { version: 1, date: '2026-09-15', author: 'KI-System', action: 'erstellt', note: 'Variante ohne Rechenschritte aus Lehrplan TQ Gastro, Baustein 4 erzeugt' },
  ],
  11: [
    { version: 2, date: '2026-09-18', author: 'T. Neumann', action: 'bearbeitet', note: 'Reinigungsintervalle gemäß aktuellem Hygieneplan aktualisiert' },
    { version: 1, date: '2026-09-10', author: 'T. Neumann', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Gastro, Baustein 5' },
  ],
  12: [
    { version: 2, date: '2026-09-16', author: 'KI-System', action: 'KI-angepasst', note: 'Piktogramm-Version ohne Rechenschritte für Stufe T generiert' },
    { version: 1, date: '2026-09-09', author: 'A. Mustajbegovic', action: 'erstellt', note: 'Erstentwurf aus Lehrplan TQ Gastro, Baustein 5' },
  ],
}
