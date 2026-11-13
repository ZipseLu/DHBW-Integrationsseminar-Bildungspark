# Frontend: gemeinsamer Stand mit dem Backend

Arbeitsbranch: `feature/fe-08-14-integration`.
Basis: `integration/adi-frontend-backend` bei `ffaa5deaa17ca924dbc564f9ef2ac64a38aea4bf`.
Der vorherige Frontend-Beitrag liegt weiterhin auf GitHub unter `adi/frontend-trello`.

## Ergebnis des Abgleichs

Der gemeinsame Branch enthält Adis sechs Frontend-Commits und Thomas' Backend-Arbeit:
Anmeldung und Rollen, Pflicht-Token, Online-Suche und Vertragstests. Login und Suche
erfüllen die bisher vorgeschlagenen Frontend-Verträge. Details des Backends stehen
in `docs/frontend-schnittstellen.md`, `docs/anmeldung-api.md` und `docs/online-suche.md`.

| Funktion | Bestätigter Vertrag / Stand |
| --- | --- |
| Anmeldung | `POST /api/auth/login`, `{ email, password }` → `{ token, expiresIn, user: { id, name, email, role } }`. Gültigkeit in Sekunden, höchstens 86400. |
| API-Zugriff | Bearer-Token für alle API-Routen außer Health und Login. `401` beendet die Sitzung; `403` beendet sie nicht. |
| Online-Suche | `GET /api/suche?q=...` → `{ results: [{ title, url, snippet }] }`. Suchbegriff 1–200 Zeichen, nur echte Treffer. |
| Suchfehler | `{ error, code, message }`; die konkrete Meldung wird angezeigt. `ApiError.code` hält die Fehlerart, `grund` den spezifischen Backend-Code. |
| Materialvorschläge | Bestehende Arbeitsblatt-Suche nach Lernziel und Berufsfeld, Einzelabruf und DOCX-Download. Keine zusätzliche Empfehlungsroute nötig. |
| Teilnehmerprofile | Kennung ist nach Anlage unveränderlich. Löschen nur für Admin und Dozent. |

## Änderungen dieses Branches

- Kein Aufruf von `AbortSignal.any` mehr: `combineAbortSignals` verbindet Sitzungs-
  und Anfrageabbruch über einen eigenen Controller. Listener werden nach Abschluss
  des Fetch-Aufrufs aufgeräumt. Ohne zusätzliches Anfragesignal bleibt das originale
  Sitzungssignal am Fetch erhalten, auch für den anschließenden Download.
- Online-Suche und Anmeldung zeigen konkrete Backend-Meldungen, etwa fehlende
  Suchkonfiguration oder Rate-Limits. Die Suchlänge wird bereits im Client geprüft.
- Die Assistentenrolle sieht beim Teilnehmerprofil keine Löschaktion. Der Handler
  prüft die Rolle ebenfalls. Bestehende Kennungen sind im Dialog schreibgeschützt.
- End-to-End-Tests melden sich über die echte Login-Maske an. API-Tests verwenden
  ebenfalls Tokens; die Bereinigung des erzeugten Testarbeitsblatts erfolgt als Admin.

Keine Backend-Dateien und keine Datenbankschemata wurden in diesem Frontend-Beitrag
geändert. `main` wurde weder beschrieben noch gemergt. Die Backend-Änderungen im
Arbeitsverzeichnis stammen unverändert aus dem Integrationsbranch.

## Branch-Namen und Inhalt

| Lokaler Branch | Inhalt / letzter bekannter Aufgabenstand |
| --- | --- |
| `feature/fe-08-anmeldung` | Loginformular, Token im Arbeitsspeicher, Logout und Rollenmenü; Stand `1b22bd5`. |
| `feature/fe-iw3-profile-niveaus` | Pflichtkennung, Kennungsprüfung und Niveaus je Berufsbereich; Stand `fd38166`. |
| `feature/fe-26-antwortoptionen` | Antwortoptionen und Zuordnungspaare bearbeiten; Stand `2d5b26c`. |
| `feature/fe-14-online-suche` | API-Suchclient statt simulierter Treffer; Stand `3b0324d`. |
| `feature/fe-19-materialvorschlaege` | Gespeicherte Materialien zum Lernziel suchen und öffnen; Stand `8ae6b50`. |
| `feature/fe-frontend-trello` | Gesamter erster Frontend-Beitrag inklusive Doku; Stand `093f3e9`, inhaltlich wie der bereits gepushte `adi/frontend-trello`. |
| `feature/fe-08-14-integration` | Aktuelle Frontend-Korrekturen auf Basis des gemeinsamen Backend-Stands. Diesen Branch für den nächsten gemeinsamen Test verwenden. |

Die fünf Aufgabenbranches sind aufeinander aufbauende Zwischenstände, keine fünf
voneinander unabhängigen PRs. Für die gemeinsame Arbeit genügt der aktuelle
Integrations-Folgebranch. Die neuen `feature/fe-*`-Namen sind zunächst lokal;
entfernte Referenzen werden beim Push angelegt. Alte Remote-Branches wurden nicht gelöscht.

## Weiterhin getrennte Arbeit

FE-12 (`feature/fe-12-teilnehmende-backend`) und FE-09 befinden sich im ursprünglichen
Trello-Export bereits in Review. Sie wurden hier nicht nebenbei übernommen. Die
Teilnehmer- und Benutzerlisten dieser Frontend-Basis arbeiten deshalb weiterhin mit
lokalem Zustand. Bei der späteren Zusammenführung müssen Rollenprüfung und unveränderliche
Kennung erhalten bleiben. Die Schülerprofil-Persistenz wird nicht als abgeschlossen ausgegeben.

## Prüfung

Ausgeführt: `node tests/trello-core.mjs` im Frontend (tatsächliche TypeScript-Helfer,
gemockte API-Aufrufe, insbesondere Signalkombination ohne `AbortSignal.any`, Logout,
Fehlercodes, Suche, Kennungen, Rollen und Optionen); JavaScript-Syntaxprüfung der
geänderten E2E-Dateien; `git diff --check`.

Vitest-Regressionsfälle sind ergänzt für Abbruch beider Signalquellen, Listener-
Aufräumen, Login- und Suchmeldungen, `403` ohne Logout, Profillöschrechte und feste Kennungen.
Die vollständige Vitest-Suite, Typprüfung, Produktionsbuild und echte Browser-/MySQL-
Tests wurden in dieser Arbeitsumgebung nicht ausgeführt: npm-Netzwerkzugriff ist
blockiert und der lokale Docker-Dienst läuft nicht. Thomas' Browser-/MySQL-Testbericht
auf dem Basisbranch ist in seiner Schnittstellen-Doku festgehalten und ersetzt keinen
Test der hier geänderten Version.

Auf einem Rechner mit den Projektabhängigkeiten im Ordner `apps/frontend` ausführen:

```powershell
npm ci
npm run typecheck
npm run test:run
npm run build
```

Für E2E muss das lokale Testkonto vorher angelegt sein. `E2E_EMAIL` ist standardmäßig
`c.hager@bildungspark.example`. `E2E_PASSWORT` oder `SEED_PASSWORT` muss das passende
Testpasswort enthalten; der Hauptprozesstest benötigt ein Admin-Testkonto für seine
Bereinigung. Keine echten Produktionszugänge nutzen. Die Variablen müssen auch im
E2E-Container ankommen, falls die Tests über Docker laufen. Kein Passwort ist fest codiert.

GitHub Actions bereitet das Testkonto jetzt automatisch vor: Nach dem Start des
temporären Stacks erzeugt der E2E-Job ein zufälliges Passwort, maskiert es im Log,
übergibt es nur dem vorhandenen Seed-Skript und stellt es Playwright als
`E2E_PASSWORT` bereit. Das Seed-Skript läuft ohne `--reset`. Diese CI-Korrektur
behebt den im Lauf `43414823705` belegten Abbruch wegen fehlender Testzugänge.
In diesem Lauf waren Frontend-Unit-Tests, Backend-Unit-Tests, Backend-Integration
und Docker-Build bereits grün; ein erfolgreicher E2E-Lauf nach der Korrektur muss
noch durch GitHub Actions bestätigt werden.

Online-Suche liefert erst Treffer, wenn das Backend-Team einen Anbieter eingerichtet
hat. Die Frontend-Korrektur aktiviert keinen kostenpflichtigen Anbieter.

## Gemeinsamer nächster Schritt

`feature/fe-08-14-integration` pushen und gegen `integration/adi-frontend-backend`
reviewen. Dort gemeinsam Login, Fehlerzustände, Suche, Materialien und Rollen prüfen.
Erst danach über eine Übernahme in `main` entscheiden.
