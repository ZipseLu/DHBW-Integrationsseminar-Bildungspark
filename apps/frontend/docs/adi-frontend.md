# Adis Frontend-Arbeit aus Trello

Quelle: Board-Export vom 13.11.2026, Mitglied **A IM / aim24**.
Basis: `main` bei `4e8d04c20286eb7fdf4642946458e3c7c2b3b794`.
Arbeitsbranch: `adi/frontend-trello`. Keine Backend-Dateien, Datenbankschemata,
Serverrouten oder Änderungen an `main` gehören zu diesem Beitrag.

## Karten und Umsetzung

| Karte in To Do / Backlog | Frontend-Stand | Grenze / Abhängigkeit |
| --- | --- | --- |
| FE-08 Anmeldung, Logout, Rollen | Loginformular, Fehlerzustände, Dashboard nach Login, Logout, Rollenmenü und Admin-Seitenschutz; Token nur im Arbeitsspeicher, Authorization-Header für API-Aufrufe, Ablauf und 401 beenden Sitzung | BE-01-Loginroute fehlt auf der Basis. Der unten beschriebene Vertrag ist ein **Vorschlag**, noch keine bestätigte Backend-Schnittstelle. |
| Systemzugang für Dozenten | Durch FE-08 abgedeckt | Echte Zugangsdaten werden ausschließlich vom Backend geprüft. |
| FE-14 Online-Suche | Ersetzt die simulierten Treffer im Suchbereich durch API-Aufrufe; Titel, echte URL und Hostname, Laden/Leer/Fehler/Retry, Abbruch überholter Suchanfragen, Thema übernehmen | Suchroute fehlt auf der Basis. Vertrag unten ist vorgeschlagen. Die Übernahme setzt den Titel als Thema; sie importiert keinen externen Dokumentinhalt. |
| FE-19 Passendes Lehrmaterial | Sucht gespeicherte Arbeitsblätter passend zu Lernziel und Berufsfeld über die vorhandene API; Vorschläge in Lehrplan-Vorschau und KI-Erstellung, Inhalt öffnen und vorhandenen Word-Download nutzen | Benötigt erreichbare Arbeitsblatt-API und gespeicherte Daten. Keine erfundenen Vorschläge oder Links. |
| Verwaltung anonymisierter Schülerprofile | Bestehende Anlage/Bearbeitung/Löschung beibehalten, Pflichtkennung ergänzt, Großschreibung und Formatprüfung wie im vorhandenen BE-02-Schema, doppelte Kennungen/Berufsbereiche abfangen | Profile bleiben im bestehenden Frontend-Zustand. Persistenz ist FE-12 und im Export bereits in Review; sie wurde hier nicht neu implementiert. |
| Individuelle Niveaustufen | Bestehende unabhängige Niveau-/Formatwahl pro Berufsbereich beibehalten und mit Tests abgesichert; aktives Niveau bleibt beim Bearbeiten maßgeblich | Derselbe Frontend-Zustand; Reload-Persistenz gehört weiterhin zur Review-Arbeit FE-12. |
| Suche nach existierenden Materialien | Auf der Basis schon vorhanden: Freitext, Berufsbild- und Niveau-Filter, Ergebnisliste aus der Arbeitsblatt-API mit gekennzeichneten Beispieldaten bei Ausfall | Kein zweiter Suchbildschirm und keine Backend-Änderung nötig. Vorhandene Filtertests bleiben erhalten. |
| FE-26 Antwortmöglichkeiten bearbeiten | Optionen ergänzen/ändern/löschen, Reihenfolge-Schritte verschieben, Zuordnungen in zwei Feldern; vorhandenes PATCH-Format `optionen: string[]` bleibt erhalten | Grenzen des vorhandenen Schemas: maximal 10 Optionen, je 200 Zeichen; Zuordnungen als `links | rechts`. |

Nicht bearbeitet: FE-04 (Testing), FE-09 und FE-12 (Review), fremde Karten sowie
DOC-06 und PM-04 (keine Frontend-Coding-Aufgaben). Trello-Status und Abnahmen wurden
nicht verändert. Eine Karte gilt nicht allein wegen dieses Codes als abgenommen.

## Vorgeschlagener Auth-Vertrag für BE-01

Standard: `POST /api/auth/login`, bei abweichender Route über
`VITE_AUTH_LOGIN_PATH` konfigurierbar. Body:

```json
{"email":"dozent@example.test","password":"wird-nicht-gespeichert"}
```

Erwartete Antwort:

```json
{
  "token": "access-token",
  "expiresIn": 3600,
  "user": {
    "id": "konto-id",
    "name": "Anzeigename",
    "email": "dozent@example.test",
    "role": "dozent"
  }
}
```

Rollen: `admin`, `dozent`, `assistent`. `expiresIn`: positive Sekunden, höchstens
86400. Falsche Daten: HTTP 401. Fehlende Route (404/501) wird verständlich angezeigt.
Kein lokaler Demo-Login, kein automatisch angemeldeter Beispieladmin, keine Speicherung
von Passwort oder Token in Local-/SessionStorage. Neuladen verlangt eine neue Anmeldung.
Abmelden verwirft den Token und den sitzungsbezogenen UI-Zustand und bricht laufende
API-Anfragen ab; eine serverseitige Token-Widerrufsfunktion existiert hier noch nicht.
Der Backend-Service muss seine Endpunkte selbst authentifizieren und autorisieren.
Die Rollenanzeige im Browser ersetzt diese Prüfung nicht.

Die Login-Seite verwendet die vorhandenen Projektfarben, Typografie und Formkonventionen.
Eine pixelgenaue Prüfung gegen eine separate Figma-Loginvorlage wurde nicht durchgeführt.

## Vorgeschlagener Suchvertrag

Standard: `GET /api/suche?q=Holz`, alternativ `VITE_WEB_SEARCH_PATH` setzen.

```json
{"results":[{"title":"Holz bearbeiten","url":"https://example.test/material","snippet":"Kurze Beschreibung"}]}
```

Der sichtbare Quellenname stammt aus dem Hostnamen der URL. Nur vollständige HTTP(S)-
URLs ohne eingebettete Zugangsdaten werden verlinkt; doppelte und unsichere Links
werden entfernt. Die Backend-Suche und ein externer Suchanbieter wurden nicht gebaut.

## Prüfung und nächste Schritte

Ergänzte Vitest-Suiten: `Auth`, `OnlineSearch`, `MaterialSuggestions`,
`ParticipantKennung`, `TaskOptions`. Bestehende Feature-Suiten verwenden einen
expliziten angemeldeten Test-Arbeitsbereich; die echte Anmeldegrenze wird in `Auth`
geprüft. Vorhandene Tests für Materialsuche und Arbeitsblattspeicherung bleiben bestehen.

Ausgeführt: native Node-Prüfung der tatsächlichen TypeScript-Hilfsfunktionen mit
gemocktem Fetch (Kennung, unabhängige Niveaus, Optionsvalidierung, Bereinigung,
Loginvertrag, Authorization-Header, Abbruch bei Logout, 401, Rollenprüfung,
Sitzungsablauf, Suchanfrage und URL-Filter) sowie `git diff --check`.

Nicht ausgeführt: vollständige Vitest-Suite, TypeScript-Typprüfung, Vite-Produktionsbuild,
Browser-/Mobilprüfung und CI. Die Installation der Frontend-Abhängigkeiten scheiterte
in der Arbeitsumgebung beim Abruf von npm. Deshalb besteht noch keine Freigabe oder
bestätigte CI-Abnahme.

Auf einem Rechner mit npm-Zugriff im Ordner `apps/frontend` ausführen:

```powershell
npm ci
npm run typecheck
npm run test:run
npm run build
```

Danach Login und Suche mit den vom Backend-Team bestätigten Verträgen abgleichen;
FE-08/FE-14 erst nach erfolgreichem Zusammenspiel abnehmen. FE-12 aus Review für die
Profilpersistenz berücksichtigen. Backend-Dateien bleiben in einem separaten Beitrag.
