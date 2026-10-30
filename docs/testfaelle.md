# QS-02: Testfälle aus den Use Cases

Stand: 30.10.2026 · Verantwortlich: QS-Tandem Celine Hager und Sinan Oturucu · Trello: QS-02

53 Testfälle für die 10 Use Cases aus `UseCaseBeschreibung.md` (Trello-Karte „Use Cases definieren“). 26 davon sind Muss. 42 lassen sich mit dem heutigen Stand testen, die übrigen erst, wenn die genannten Tickets fertig sind. Grundlage für den Abnahmetest QS-05 am 06.11.; Vorgehen und Fehler-Stufen stehen im Testkonzept (`docs/testkonzept.md`).

**So wird getestet:** Die Testfälle werden in der Google-Tabelle „QS-02: Testfälle aus den Use Cases“ im Team-Ordner abgehakt. In der Spalte *Ergebnis* steht `bestanden`, `fehlgeschlagen` oder `blockiert`. Für jeden fehlgeschlagenen Testfall wird eine Bug-Karte in Trello angelegt und in der Tabelle unter *Bemerkung* verlinkt.

## Übersicht

| Use Case | Testfälle | davon jetzt testbar |
| --- | --- | --- |
| UC-01 Anmelden | 5 | 0 |
| UC-02 Dashboard & Kennzahlen einsehen | 5 | 5 |
| UC-03 Lehrpläne durchsuchen & einsehen | 4 | 4 |
| UC-04 Arbeitsblatt hochladen & manuell anpassen | 6 | 3 |
| UC-05 Arbeitsblatt mit KI generieren | 10 | 9 |
| UC-06 Arbeitsblatt aus Lehrplan ableiten | 4 | 4 |
| UC-07 Arbeitsblätter filtern & exportieren | 8 | 8 |
| UC-08 Teilnehmerfortschritt verwalten (§ 60 SGB IX) | 4 | 3 |
| UC-09 Benutzereinstellungen anpassen | 3 | 3 |
| UC-10 Mitarbeiter-Zugänge verwalten | 4 | 3 |
| **Gesamt** | **53** | **42** |

## UC-01: Anmelden

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-01-01 | Anmelden mit gültigen Daten | Standard | Muss | Konto existiert; nicht angemeldet | 1. Anwendung öffnen<br>2. E-Mail und Passwort eingeben<br>3. „Anmelden“ klicken | Dashboard öffnet sich; Name und Rolle stehen unten in der Seitenleiste | nach FE-08 + BE-01 | nein |
| TF-01-02 | Anmelden mit falschem Passwort | Fehler (4a) | Muss | Konto existiert | 1. Richtige E-Mail, falsches Passwort eingeben<br>2. „Anmelden“ klicken | Verständliche Fehlermeldung; Eingaben bleiben stehen; keine Sitzung | nach FE-08 + BE-01 | nein |
| TF-01-03 | Geschützte Seite ohne Anmeldung | Alternative | Muss | Nicht angemeldet | 1. Adresse einer Unterseite direkt aufrufen | Login-Maske erscheint; keine Daten sichtbar | nach FE-08 + BE-01 | nein |
| TF-01-04 | Abmelden | Standard | Muss | Angemeldet | 1. „Abmelden“ in der Seitenleiste klicken<br>2. Im Browser „Zurück“ drücken | Login-Maske; nach „Zurück“ keine Daten sichtbar | nach FE-08 + BE-01 | nein |
| TF-01-05 | Menü nach Rolle | Standard | Muss | Als Dozent/in angemeldet | 1. Seitenleiste ansehen | „Benutzerverwaltung“ fehlt; als Admin ist sie sichtbar | nach FE-08 + BE-01 | nein |

## UC-02: Dashboard & Kennzahlen einsehen

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-02-01 | Kennzahlen stimmen mit der Liste überein | Standard | Muss | Datenbank läuft; mehrere Arbeitsblätter gespeichert | 1. Dashboard öffnen<br>2. Zahlen mit der Seite Arbeitsblätter vergleichen | „Arbeitsblätter gesamt“, „KI-generiert“ und „freigegeben“ entsprechen der Liste | jetzt | Unit-Test (Dashboard.spec) |
| TF-02-02 | Niveaustufen-Verteilung | Standard | Muss | Datenbank läuft | 1. Zahlen je Stufe T/A/F/B notieren<br>2. In der KI-Erstellung ein Blatt der Stufe T speichern<br>3. Dashboard neu öffnen | Summe der Stufen = Arbeitsblätter gesamt; T ist um 1 gestiegen | jetzt | teilweise |
| TF-02-03 | Zuletzt bearbeitet | Standard | Muss | Datenbank läuft | 1. Liste „Zuletzt bearbeitet“ ansehen<br>2. Einen Eintrag anklicken | Höchstens 5 Einträge, neuestes oben, mit Status und KI-Kennzeichen; Klick öffnet die Seite Arbeitsblätter | jetzt | Unit-Test (Dashboard.spec) |
| TF-02-04 | Dashboard ohne Datenbank | Fehler | Muss | Backend läuft, Datenbank gestoppt | 1. Dashboard öffnen<br>2. Datenbank starten<br>3. „Erneut laden“ klicken | Gelber Hinweis „Zahlen aus Beispieldaten“ mit Grund; nach „Erneut laden“ echte Zahlen, Hinweis weg | jetzt | Unit-Test (Dashboard.spec) |
| TF-02-05 | Personas je Niveaustufe | Standard | Soll | – | 1. Bei „Anonyme Teilnehmende“ eine Stufe aufklappen | Personas der Stufe mit Barrierefreiheitsbedarf erscheinen; keine Namen | jetzt | Unit-Test (Seiten.spec) |

## UC-03: Lehrpläne durchsuchen & einsehen

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-03-01 | Lehrpläne nach Berufsfeld filtern | Standard | Soll | Lehrpläne importiert | 1. Seite Lehrpläne öffnen<br>2. Filter „Gastronomie & Hauswirtschaft“ wählen | Nur Bausteine dieses Berufsfelds; Anzahl passt | jetzt | Unit-Test (Seiten.spec) |
| TF-03-02 | Suche ohne Treffer | Fehler (2a) | Soll | – | 1. „xyz“ ins Suchfeld eingeben | Hinweis „keine Treffer“ und Möglichkeit, Filter zurückzusetzen | jetzt | nein |
| TF-03-03 | Lehrplan online ansehen | Standard | Soll | – | 1. Bei einem Baustein „Online ansehen“ klicken | Seitenpanel zeigt Lernziele mit Kompetenz und Beispiel je Stufe T/A/F/B | jetzt | Unit-Test (Seiten.spec) |
| TF-03-04 | Lehrplan herunterladen | Standard | Soll | – | 1. „Herunterladen“ klicken<br>2. Datei in Word öffnen | Word-Datei mit Tabelle je Lernziel; Umlaute korrekt | jetzt | nein |

## UC-04: Arbeitsblatt hochladen & manuell anpassen

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-04-01 | Word-Datei hochladen | Standard | Soll | Word-Datei < 20 MB | 1. Seite Arbeitsblätter, „Datei auswählen“<br>2. Datei wählen | Datei wird angenommen, Name und Größe erscheinen | jetzt | Unit-Test (App.spec) |
| TF-04-02 | Datei per Drag & Drop | Standard | Soll | – | 1. Datei aus dem Explorer in den Upload-Bereich ziehen | Wie TF-04-01 | jetzt | nein |
| TF-04-03 | Datei über 20 MB | Fehler (2a) | Soll | Datei > 20 MB | 1. Datei auswählen | Meldung „größer als 20 MB“; nichts wird gespeichert | jetzt | nein |
| TF-04-04 | Unzulässiges Format | Fehler (2a) | Soll | z. B. .exe oder .zip | 1. Datei auswählen | Fehlermeldung zum Dateityp; nichts wird gespeichert | nach FE-05 | nein |
| TF-04-05 | Direkt speichern | Standard | Soll | Datei hochgeladen | 1. „Direkt speichern“ klicken | Datei erscheint unter „Gespeicherte Dokumente“ mit Datum und Name der Person; bleibt nach Neuladen erhalten | nach FE-05 + Upload-Endpunkt | teilweise |
| TF-04-06 | Metadaten zuweisen | Standard | Soll | Datei hochgeladen | 1. Berufsfeld, Baustein und Niveaustufe wählen<br>2. Speichern | Arbeitsblatt erscheint mit diesen Angaben in der Liste und ist danach filterbar | nach FE-05 + Upload-Endpunkt | nein |

## UC-05: Arbeitsblatt mit KI generieren

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-05-01 | Eine Variante generieren | Standard | Muss | Backend läuft (mit API-Schlüssel) | 1. KI-Erstellung öffnen<br>2. Berufsfeld und Lernziel wählen, Thema eingeben<br>3. Stufe A, „Standard-Text“, „Leichte Sprache“<br>4. „1 Variante generieren“ | Arbeitsblatt mit Titel, Einleitung, Aufgaben, Wörterbuch und Validator-Hinweisen; Anbieter und Dauer angezeigt | jetzt | Unit-Test (KiErstellung.spec) |
| TF-05-02 | Mehrere Stufen und Formate | Standard | Muss | wie TF-05-01 | 1. Stufen T und A, Formate „Standard-Text“ und „Mit Piktogrammen“ wählen<br>2. „4 Varianten generieren“ | Fortschritt „Variante x von 4“; 4 Varianten nach Stufe gruppiert | jetzt | Unit-Test (KiErstellung.spec) |
| TF-05-03 | Ergebnis passt zur Niveaustufe | Standard | Muss | API-Schlüssel gesetzt | 1. Dasselbe Lernziel in Stufe T und B generieren<br>2. Texte vergleichen | T: sehr kurze Sätze, einfache Wörter; B: anspruchsvoller. Bewertung in QS-04 | jetzt | nein (QS-04) |
| TF-05-04 | Format „Ohne Rechnen“ | Standard | Muss | API-Schlüssel gesetzt | 1. Format „Ohne Rechnen“ generieren | Keine Rechenaufgaben, keine Zahlen über 3, keine Rechenzeichen; Validator ohne Hinweis dazu | jetzt | Unit-Test (Backend-Validator) |
| TF-05-05 | Format „Mit Piktogrammen“ | Standard | Muss | API-Schlüssel gesetzt | 1. Format „Mit Piktogrammen“ generieren | Aufgaben zeigen Piktogramme | jetzt | nein |
| TF-05-06 | KI nicht erreichbar | Fehler (7a) | Muss | Backend gestoppt | 1. Variante generieren | Meldung „Backend nicht erreichbar“ bzw. KI-Fehler; alle Eingaben bleiben erhalten | jetzt | Unit-Test (KiErstellung.spec) |
| TF-05-07 | Ohne API-Schlüssel | Alternative | Muss | GEMINI_API_KEY leer | 1. Variante generieren | Beispielantwort mit gelbem Hinweis „Kein API-Key – Beispielantwort (Mock)“ | jetzt | Unit-Test (KiErstellung.spec) |
| TF-05-08 | Varianten speichern | Standard | Muss | Datenbank läuft; Varianten erstellt | 1. Bei einer Variante „Speichern“<br>2. „Alle zur Bibliothek hinzufügen“<br>3. Seite Arbeitsblätter öffnen | Buttons zeigen „✓ Gespeichert“; alle Varianten stehen in der Liste mit Label KI und Status Entwurf | jetzt | Unit-Test (KiErstellung.spec) |
| TF-05-09 | Ähnliche Dokumente im Internet suchen | Alternative (1a) | Kann | – | 1. Suchbegriff eingeben, „Suchen“ | Trefferliste mit Titel und Quelle (derzeit simuliert, echt nach FE-14) | nach FE-14 | teilweise |
| TF-05-10 | Berufsfeld ohne Lehrplan | Fehler | Muss | – | 1. Berufsfeld „Garten- und Landschaftsbau“ wählen | Hinweis „keine Lehrpläne hinterlegt“; Generieren gesperrt | jetzt | Unit-Test (KiErstellung.spec) |

## UC-06: Arbeitsblatt aus Lehrplan ableiten

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-06-01 | Arbeitsblatt aus Lehrplan erstellen | Standard | Soll | – | 1. Lehrpläne öffnen<br>2. Bei einem Baustein „+ Arbeitsblatt daraus erstellen“ | KI-Erstellung öffnet sich; Berufsfeld und Lernziel sind vorausgewählt | jetzt | Unit-Test (Seiten.spec) |
| TF-06-02 | Bestimmtes Lernziel übernehmen | Standard | Soll | – | 1. Lehrplan „Online ansehen“<br>2. Bei einem Lernziel „✦ Arbeitsblatt“ | Genau dieses Lernziel ist in der KI-Erstellung gewählt | jetzt | nein |
| TF-06-03 | Abbruch | Alternative | Soll | – | 1. Nach dem Sprung in die KI-Erstellung „Lehrpläne“ im Menü wählen | Lehrplanseite unverändert; nichts gespeichert | jetzt | nein |
| TF-06-04 | Verknüpfung mit dem Baustein | Standard | Soll | Datenbank läuft | 1. Aus TF-06-01 generieren und speichern<br>2. Seite Arbeitsblätter, nach dem Baustein filtern | Gespeichertes Blatt trägt Berufsfeld, Baustein und Ausbildungsbaustein des Lehrplans | jetzt | nein |

## UC-07: Arbeitsblätter filtern & exportieren

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-07-01 | Volltextsuche | Standard | Soll | Datenbank läuft | 1. Seite Arbeitsblätter, Suchbegriff eingeben | Liste und Anzahl „x Ergebnisse“ aktualisieren sich sofort | jetzt | Unit-Test (App.spec) |
| TF-07-02 | Filter kombinieren | Standard | Soll | – | 1. Berufsfeld, Baustein und Niveau wählen | Nur Blätter, die alle Bedingungen erfüllen | jetzt | Unit-Test (lib.spec) |
| TF-07-03 | Filter zurücksetzen | Alternative (1a) | Soll | Filter gesetzt | 1. Überall „Alle“ wählen | Gesamte Liste wieder sichtbar | jetzt | nein |
| TF-07-04 | Keine Treffer | Fehler | Soll | – | 1. „xyz“ suchen | Hinweis „Keine Arbeitsblätter gefunden.“ | jetzt | Unit-Test (App.spec) |
| TF-07-05 | Word-Export | Standard | Soll | Gespeichertes Blatt | 1. Bei einem Blatt „.docx“ klicken<br>2. Datei in Word öffnen | Download startet; Datei enthält die aktuelle Version mit Aufgaben; Dateiname mit Berufsfeld, Baustein, Titel | jetzt | Unit-Test (Backend docx) |
| TF-07-06 | Favorit bleibt gespeichert | Standard | Kann | Datenbank läuft | 1. Stern klicken<br>2. Seite neu laden<br>3. „Nur Favoriten“ | Stern bleibt gesetzt; Filter zeigt nur Favoriten | jetzt | Unit-Test (ArbeitsblaetterBackend.spec) |
| TF-07-07 | Verlauf ansehen | Standard | Muss | Blatt mit mehreren Versionen | 1. „Verlauf“ klicken | Versionen neueste zuerst, je mit Aktion, Person und Datum | jetzt | Unit-Test (ArbeitsblaetterBackend.spec) |
| TF-07-08 | Liste ohne Datenbank | Fehler | Muss | Datenbank gestoppt | 1. Seite Arbeitsblätter öffnen | Gelber Hinweis mit Grund, Beispieldaten, Knopf „Erneut laden“ | jetzt | Unit-Test + E2E |

## UC-08: Teilnehmerfortschritt verwalten (§ 60 SGB IX)

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-08-01 | Profile sind pseudonymisiert | Standard | Soll | – | 1. Seite Teilnehmende öffnen | Nur Kennungen wie IW3-4421; keine Namen oder Diagnosen | jetzt | Unit-Test (Seiten.spec) |
| TF-08-02 | Profil anlegen | Alternative (1a) | Soll | – | 1. „+ Teilnehmer hinzufügen“<br>2. Kennung IW3-9999 eintragen, speichern<br>3. Dieselbe Kennung noch einmal anlegen | Profil erscheint; zweites Anlegen wird mit Meldung abgelehnt | jetzt | Unit-Test (Seiten.spec) |
| TF-08-03 | Arbeitsblatt zuweisen und erledigen | Standard | Muss | Profil vorhanden | 1. Profil aufklappen, „Arbeitsblatt zuweisen“<br>2. Blatt als „✓ erledigt“ markieren | Fortschritt des Profils steigt; Dashboard zeigt den neuen Stand | jetzt | teilweise |
| TF-08-04 | Daten bleiben erhalten | Standard | Muss | Datenbank läuft | 1. Profil anlegen und Blatt erledigen<br>2. Seite neu laden | Profil und Fortschritt sind noch da | nach BE-02 + FE-12 | nein |

## UC-09: Benutzereinstellungen anpassen

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-09-01 | Darstellung ändern | Standard | Kann | – | 1. Einstellungen: Dunkelmodus und Akzentfarbe ändern<br>2. „Einstellungen speichern“<br>3. Seite neu laden | Änderung sofort sichtbar und nach Neuladen erhalten | jetzt | Unit-Test (Seiten.spec) |
| TF-09-02 | Standard-Berufsfeld | Standard | Kann | – | 1. Standard-Berufsfeld ändern, speichern<br>2. Teilnehmende: neues Profil anlegen | Das gewählte Berufsfeld ist vorausgewählt | jetzt | nein |
| TF-09-03 | Zu kurzes Passwort | Fehler (4a) | Kann | – | 1. Neues Passwort mit 5 Zeichen eingeben, speichern | Meldung „mindestens 8 Zeichen“; nichts geändert | jetzt | Unit-Test (Seiten.spec) |

## UC-10: Mitarbeiter-Zugänge verwalten

| ID | Testfall | Art | Prio | Vorbedingung | Schritte | Erwartetes Ergebnis | Testbar ab | Automatisch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TF-10-01 | Mitarbeiter anlegen | Standard | Muss | Als Admin angemeldet | 1. „+ Mitarbeiter anlegen“<br>2. Name, E-Mail, Rolle eingeben, speichern | Konto erscheint mit Rolle und Datum | jetzt (lokal); nach FE-09 + BE-03 gespeichert | Unit-Test (Seiten.spec) |
| TF-10-02 | Ungültige Eingaben | Fehler | Muss | Als Admin angemeldet | 1. Ohne Namen oder mit ungültiger E-Mail speichern | Fehlermeldung am Feld; kein Konto angelegt | jetzt | Unit-Test (Seiten.spec) |
| TF-10-03 | Mitarbeiter löschen | Standard | Muss | Als Admin angemeldet | 1. „Löschen“ bei einem Konto<br>2. Rückfrage bestätigen<br>3. Beim eigenen Konto „Löschen“ suchen | Konto verschwindet; das eigene Konto kann nicht gelöscht werden | jetzt | Unit-Test (Seiten.spec) |
| TF-10-04 | Zugriff ohne Admin-Rolle | Fehler (1a) | Muss | Als Dozent/in angemeldet | 1. Benutzerverwaltung direkt aufrufen | Kein Zugriff (Seite nicht sichtbar, Backend antwortet 403) | nach FE-08 + BE-01 + BE-03 | nein |

## Hinweise

- **Abweichungen zur Use-Case-Beschreibung:** UC-02 nennt die Stufen „Talent-, Aufbau-, Fach-, Berufsstufe“; die Anwendung verwendet Tätigkeit, Arbeitsplatz, Berufsfeld, Berufsbild (Bestätigung durch den Bildungspark offen, FE-16). UC-09 nennt eine automatische Abmeldung; diese Einstellung gibt es im Prototyp nicht mehr. UC-10 sieht vor, dass Zugangsdaten verschickt werden; das ist nicht umgesetzt.
- **Nicht in den Use Cases, aber im Testkonzept:** Browser- und Gerätetest (FE-17), Barrierefreiheit (FE-15) und die Bewertung der KI-Ergebnisse (QS-04) haben eigene Checklisten.
- **Testdaten:** Datenbank mit `npm run db:seed` in `apps/backend` füllen; für TF-05-03 bis TF-05-05 wird ein Gemini-API-Schlüssel gebraucht.
