# Anwendungsfallspezifikationen (Use Cases)

**Projekt:** Bildungspark: Arbeitsblattverwaltung  
**Projektnummer:** 1  
**Projektmanager:** Luis Zipse  
**Stand:** Oktober 2026  
**Dokumentversion:** 1.0  

---

## Inhaltsverzeichnis
  - [1. Übersicht & Akteure](#1-übersicht--akteure)
  - [2. Matrix der Use Cases](#2-matrix-der-use-cases)
  - [3. Detaillierte Spezifikationen](#3-detaillierte-spezifikationen)
  - [UC-01: Anmelden](#uc-01-anmelden)
  - [UC-02: Dashboard & Kennzahlen einsehen](#uc-02-dashboard--kennzahlen-einsehen)
  - [UC-03: Lehrpläne durchsuchen & einsehen](#uc-03-lehrpläne-durchsuchen--einsehen)
  - [UC-04: Arbeitsblatt hochladen & manuell anpassen](#uc-04-arbeitsblatt-hochladen--manuell-anpassen)
  - [UC-05: Arbeitsblatt mit KI generieren](#uc-05-arbeitsblatt-mit-ki-generieren)
  - [UC-06: Arbeitsblatt aus Lehrplan ableiten](#uc-06-arbeitsblatt-aus-lehrplan-ableiten)
  - [UC-07: Arbeitsblätter filtern & exportieren](#uc-07-arbeitsblätter-filtern--exportieren)
  - [UC-08: Teilnehmerfortschritt verwalten (§ 60 SGB IX)](#uc-08-teilnehmerfortschritt-verwalten--60-sgb-ix)
  - [UC-09: Benutzereinstellungen anpassen](#uc-09-benutzereinstellungen-anpassen)
  - [UC-10: Mitarbeiter-Zugänge verwalten](#uc-10-mitarbeiter-zugänge-verwalten)

---

## 1. Übersicht & Akteure

* **Dozent/in / Fachkraft (Primärer Akteur):** Unterrichtsvorbereitung, Hochladen von Materialien, KI-Generierung und Binnendifferenzierung von Arbeitsblättern sowie Nachverfolgung des Lernfortschritts.
* **Administrator/in (Spezialisierter Akteur):** Erbt alle Rechte von *Dozent/in* und verwaltet zusätzlich Teammitglieder sowie Rollenrechte.
* **LLM-API / KI-Dienst (Sekundärer externer Akteur):** Schnittstelle zur automatisierten Textanalyse, Transformation in Leichte Sprache und Variantenbildung.

---

## 2. Matrix der Use Cases

| ID | Anwendungsfall | Primärer Akteur | Sekundärer Akteur | Typ / Relevanz |
| :--- | :--- | :--- | :--- | :--- |
| **UC-01** | Anmelden | Dozent/in, Administrator/in | – | Kernfunktion (Sicherheit) |
| **UC-02** | Dashboard & Kennzahlen einsehen | Dozent/in, Administrator/in | – | Monitoring & Übersicht |
| **UC-03** | Lehrpläne durchsuchen & einsehen | Dozent/in, Administrator/in | – | Curriculum-Bibliothek |
| **UC-04** | Arbeitsblatt hochladen & manuell anpassen | Dozent/in, Administrator/in | – | Dokumentenverwaltung |
| **UC-05** | Arbeitsblatt mit KI generieren | Dozent/in, Administrator/in | LLM-API | Kernfunktion (KI-Dashboard) |
| **UC-06** | Arbeitsblatt aus Lehrplan ableiten | Dozent/in, Administrator/in | LLM-API | Workflow-Beschleunigung («include» UC-05) |
| **UC-07** | Arbeitsblätter filtern & exportieren | Dozent/in, Administrator/in | – | Recherche & Ausgabe (.docx) |
| **UC-08** | Teilnehmerfortschritt verwalten | Dozent/in, Administrator/in | – | Förderfortschritt (§ 60 SGB IX) |
| **UC-09** | Benutzereinstellungen anpassen | Dozent/in, Administrator/in | – | Personalisierung & Systempräferenzen |
| **UC-10** | Mitarbeiter-Zugänge verwalten | Administrator/in | – | Benutzerverwaltung |

---

## 3. Detaillierte Spezifikationen

### UC-01: Anmelden

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-01` |
| **Name** | Anmelden |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Authentifizierung des Benutzers an der Webanwendung mittels E-Mail und Passwort. |
| **Auslöser (Trigger)** | Aufruf der geschützten Web-UI ohne bestehende Session. |
| **Vorbedingungen** | Benutzerkonto existiert im System. |
| **Standardablauf** | 1. System rendert Login-Maske.<br>2. Anwender gibt E-Mail-Adresse und Passwort ein.<br>3. Anwender klickt auf „Anmelden“.<br>4. System validiert Anmeldedaten und Zugriffsrechte.<br>5. System initialisiert Sitzung und leitet auf das Dashboard weiter. |
| **Alternative / Fehlerabläufe** | **4a. Ungültige Anmeldedaten:** System zeigt Fehlermeldung; Eingaben bleiben editierbar.<br>**4b. Kein Zugang:** Benutzer wendet sich an den Administrator. |
| **Nachbedingungen** | Der Benutzer ist authentifiziert; rollenbasierte Menüpunkte sind aktiv. |

---

### UC-02: Dashboard & Kennzahlen einsehen

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-02` |
| **Name** | Dashboard & Kennzahlen einsehen |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Zentrale Übersicht über Key Performance Indicators (KPIs), Niveaustufen-Verteilungen und zuletzt bearbeitete Arbeitsblätter. |
| **Auslöser (Trigger)** | Nach Login oder Klick auf „Dashboard“ im Hauptmenü. |
| **Vorbedingungen** | Benutzer ist angemeldet. |
| **Standardablauf** | 1. System aggregiert und visualisiert KPIs (Arbeitsblätter gesamt, KI-generiert, aktive Teilnehmende).<br>2. Verteilungsgrafik über Niveaustufen (Talent-, Aufbau-, Fach-, Berufsstufe) wird gerendert.<br>3. Anonymisierte Personas-Übersicht (§ 60 SGB IX) wird angezeigt.<br>4. Liste der zuletzt bearbeiteten Arbeitsblätter inkl. KI-Kennzeichnung wird geladen. |
| **Alternative / Fehlerabläufe** | **4a. Direktaufruf:** Klick auf einen Listeneintrag öffnet das Dokument direkt. |
| **Nachbedingungen** | Der aktuelle System- und Bearbeitungsstand ist für die Lehrkraft transparent. |

---

### UC-03: Lehrpläne durchsuchen & einsehen

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-03` |
| **Name** | Lehrpläne durchsuchen & einsehen |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Sichten und Filtern von binnendifferenzierten Ausbildungslehrplänen nach Berufsfeldern. |
| **Auslöser (Trigger)** | Klick auf „Lehrpläne“ in der Navigation. |
| **Vorbedingungen** | Benutzer ist angemeldet; Curricula sind eingepflegt. |
| **Standardablauf** | 1. Anzeige der Curriculum-Bibliothek.<br>2. Anwender wählt Filter-Pills (z. B. Lagerlogistik, Metallverarbeitung, Gastronomie) oder nutzt das Suchfeld.<br>3. System filtert Bausteinkarten dynamisch.<br>4. Klick auf „Online ansehen“ oder „Herunterladen“ zur Dokumentenansicht. |
| **Alternative / Fehlerabläufe** | **2a. Keine Treffer:** System signalisiert leere Ergebnismenge und bietet Filter-Reset an. |
| **Nachbedingungen** | Relevante Lehrplaninhalte sind eingesehen oder lokal verfügbar. |

---

### UC-04: Arbeitsblatt hochladen & manuell anpassen

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-04` |
| **Name** | Arbeitsblatt hochladen & manuell anpassen |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Upload bestehender Arbeitsblätter (PDF, Word, Text, Bild) und manuelle Pflege der Metadaten. |
| **Auslöser (Trigger)** | Klick auf Menüpunkt „Arbeitsblätter“. |
| **Vorbedingungen** | Datei liegt lokal im unterstützten Format vor (max. 20 MB). |
| **Standardablauf** | 1. Anwender zieht Datei per Drag & Drop in den Upload-Bereich oder nutzt „Datei auswählen“.<br>2. System validiert Typ und Größe der Datei.<br>3. Anwender weist Metadaten zu (Berufsfeld, Baustein, Niveaustufe, Zielpersonas).<br>4. System speichert das Arbeitsblatt und listet es in der Übersicht auf.<br>5. Über Aktionsschaltflächen („Aufbau“, „Vorschau“, „Verlauf“, „Anpassen“) kann das Blatt weiterbearbeitet werden. |
| **Alternative / Fehlerabläufe** | **2a. Validierungsfehler:** Datei überschreitet 20 MB oder besitzt ein unzulässiges Format; System bricht mit Fehlermeldung ab. |
| **Nachbedingungen** | Das Arbeitsblatt steht zentral zur Verfügung und kann nachbearbeitet werden. |

---

### UC-05: Arbeitsblatt mit KI generieren

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-05` |
| **Name** | Arbeitsblatt mit KI generieren |
| **Akteure** | Dozent/in (Primär), LLM-API (Sekundär) |
| **Kurzbeschreibung** | Erstellung binnendifferenzierter, barrierefreier Arbeitsblätter mittels Eingabe didaktischer Parameter über ein LLM. |
| **Auslöser (Trigger)** | Klick auf „KI-Erstellung“ oder Button „+ Arbeitsblatt erstellen“. |
| **Vorbedingungen** | Benutzer ist angemeldet; LLM-API ist erreichbar und konfiguriert. |
| **Standardablauf** | 1. Eingabe von Thema/Titel sowie Erwartungen/Lernzielen.<br>2. Auswahl des Berufsfelds und des Ausbildungsbausteins.<br>3. Festlegung der Niveaustufen (Talent-, Aufbau-, Fach-, Berufsstufe).<br>4. Auswahl des Sprachformats (z. B. „Leichte Sprache“).<br>5. Auswahl von Barrierefreiheits-Formaten („Standard-Text“, „Mit Piktogrammen“, „Ohne Rechnen“, „Piktogramm + Mathefrei“).<br>6. Klick auf „[X] Variante(n) generieren“.<br>7. System überträgt Prompt an die LLM-API.<br>8. System empfängt generierte Aufgaben, speichert diese und kennzeichnet sie mit dem Label `KI`. |
| **Alternative / Fehlerabläufe** | **1a. Inspiration einbinden:** Anwender nutzt „Ähnliche Dokumente im Internet suchen“ als Kontextanreicherung.<br>**7a. LLM-Fehler / Timeout:** System zeigt Verbindungsfehler an; Eingaben bleiben erhalten. |
| **Nachbedingungen** | Ein differenziertes, barrierefreies Arbeitsblatt liegt versioniert vor. |

---

### UC-06: Arbeitsblatt aus Lehrplan ableiten

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-06` |
| **Name** | Arbeitsblatt aus Lehrplan ableiten |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Automatisierte Übernahme von Lehrplanparametern in die KI-Erstellungsmaske («include» UC-05). |
| **Auslöser (Trigger)** | Klick auf „+ Arbeitsblatt daraus erstellen“ auf einer Lehrplankarte. |
| **Vorbedingungen** | Lehrplanbaustein ist ausgewählt. |
| **Standardablauf** | 1. Anwender klickt auf „+ Arbeitsblatt daraus erstellen“.<br>2. System navigiert zur Maske „KI-Erstellung“.<br>3. Berufsfeld und Ausbildungsbaustein werden automatisch vorbefüllt.<br>4. Weiterführung und Abschluss über Ablauf von **UC-05**. |
| **Alternative / Fehlerabläufe** | Keine systemspezifischen Fehler; Abbruch führt zurück zur Lehrplanansicht. |
| **Nachbedingungen** | Das generierte Dokument ist mit dem spezifischen Curriculum-Baustein verknüpft. |

---

### UC-07: Arbeitsblätter filtern & exportieren

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-07` |
| **Name** | Arbeitsblätter filtern & exportieren |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Suche und Selektion von Unterrichtsmaterialien über Metadaten sowie Export als Datei. |
| **Auslöser (Trigger)** | Aufruf der Seite „Arbeitsblätter“. |
| **Vorbedingungen** | Mindestens ein Arbeitsblatt ist im System vorhanden. |
| **Standardablauf** | 1. Anwender filtert per Volltextsuche, Berufsfeld-Dropdown oder Baustein-Buttons.<br>2. Ergebnisliste aktualisiert sich in Echtzeit.<br>3. Klick auf Export-Schaltfläche (z. B. `.docx`) bei der gewünschten Arbeitsblattzeile.<br>4. System erzeugt Datei und startet Download auf das Endgerät. |
| **Alternative / Fehlerabläufe** | **1a. Filter zurücksetzen:** Klick auf „Alle“ stellt die Gesamtauswahl wieder her. |
| **Nachbedingungen** | Das Arbeitsblatt steht dem Anwender im Office-Format zur Verfügung. |

---

### UC-08: Teilnehmerfortschritt verwalten (§ 60 SGB IX)

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-08` |
| **Name** | Teilnehmerfortschritt verwalten (§ 60 SGB IX) |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Dokumentation des individuellen Lernfortschritts über pseudonymisierte Teilnehmerprofile zur Gewährleistung des Datenschutzes. |
| **Auslöser (Trigger)** | Klick auf Menüpunkt „Teilnehmende“. |
| **Vorbedingungen** | Benutzer ist angemeldet. |
| **Standardablauf** | 1. System listet pseudonymisierte Profile auf (z. B. `IW3-4421`, `IW3-4388`).<br>2. Anwender klappt Profil auf und prüft Ausbildungsstationen sowie Arbeitsblätter.<br>3. Anwender markiert bearbeitete Arbeitsblätter als „✓ erledigt“.<br>4. System aktualisiert den Fortschrittsstatus des Profils und das Dashboard. |
| **Alternative / Fehlerabläufe** | **1a. Profil hinzufügen:** Klick auf „+ Teilnehmer hinzufügen“ generiert ein neues anonymes Profil mit Persona-Einstufung. |
| **Nachbedingungen** | Der Lern- und Bearbeitungsstatus ist datenschutzkonform gemäß § 60 SGB IX hinterlegt. |

---

### UC-09: Benutzereinstellungen anpassen

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-09` |
| **Name** | Benutzereinstellungen anpassen |
| **Akteure** | Dozent/in, Administrator/in |
| **Kurzbeschreibung** | Konfiguration von UI-Darstellung, Systemvorgaben, Benachrichtigungen und Kennwort. |
| **Auslöser (Trigger)** | Klick auf „Einstellungen“ in der Navigation. |
| **Vorbedingungen** | Benutzer ist angemeldet. |
| **Standardablauf** | 1. Konfiguration von UI/Darstellung (Dunkelmodus, Navigations- und Akzentfarben).<br>2. Festlegung von Arbeitsblatt-Defaults (Standard-Berufsfeld, Exportformat, Autosave).<br>3. Konfiguration von Sitzung & Sicherheit (Auto-Abmeldung, Aufgaben-Erinnerungen).<br>4. Optional: Kennwortänderung über altes und neues Passwort.<br>5. Klick auf „Einstellungen speichern“. |
| **Alternative / Fehlerabläufe** | **4a. Passwortkriterien verfehlt:** Neues Passwort hat weniger als 8 Zeichen; System weist Speicherung ab. |
| **Nachbedingungen** | Benutzerspezifische Einstellungen sind in der Datenbank persistiert. |

---

### UC-10: Mitarbeiter-Zugänge verwalten

| Eigenschaft | Beschreibung |
| :--- | :--- |
| **ID** | `UC-10` |
| **Name** | Mitarbeiter-Zugänge verwalten |
| **Akteure** | Administrator/in (Exklusiv) |
| **Kurzbeschreibung** | Verwaltung interner Konten (Administrator, Dozent/in, Assistent/in) und Rollenrechte. |
| **Auslöser (Trigger)** | Klick auf „Benutzerverwaltung“. |
| **Vorbedingungen** | Benutzer besitzt die Rolle `Administrator`. |
| **Standardablauf** | 1. System rendert Kontenübersicht mit E-Mail, Rolle und Beitrittsdatum.<br>2. **Neuanlage:** Klick auf „+ Mitarbeiter anlegen“, Eingabe der Stammdaten und Rollenzuweisung.<br>3. System generiert Konto und sendet Zugangsdaten.<br>4. **Löschung:** Klick auf „Löschen“ neben dem Zielkonto.<br>5. Bestätigung im Sicherheitsdialog; System entfernt das Konto. |
| **Alternative / Fehlerabläufe** | **1a. Keine Berechtigung:** Aufruf durch reguläre Dozierende wird mit `403 Forbidden` abgewiesen. |
| **Nachbedingungen** | Kontenbestand und Zugriffsberechtigungen sind aktualisiert. |