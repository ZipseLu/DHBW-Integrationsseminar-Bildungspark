# QS-01: Testkonzept und Definition of Done

Stand: 30.10.2026 · Verantwortlich: QS-Tandem Celine Hager und Sinan Oturucu · Trello: QS-01

## Zweck und Geltungsbereich

Dieses Konzept legt fest, wie wir den Prototyp der Arbeitsblattverwaltung bis zum Release Candidate am 06.11.2026 testen und wann ein Ticket als fertig gilt. Es setzt Kapitel 8 der Projektkonzeption (Qualitäts- und Risikomanagement) um und gilt für alle Tickets auf dem Trello-Board (FE, BE, QS, DOC, OPS).

- **Gegenstand:** Web-Anwendung im Repository `ZipseLu/DHBW-Integrationsseminar-Bildungspark` – Frontend (React, TypeScript), Backend (Node.js, Express, MySQL) und die KI-Anbindung (Gemini).
- **Verantwortlich:** QS-Tandem Celine Hager und Sinan Oturucu. Jede Person testet ihre eigenen Änderungen; das Tandem pflegt dieses Konzept und führt den Abnahmetest durch.
- **Nicht Gegenstand:** Last- und Penetrationstests sowie Tests auf Geräten der Teilnehmenden (laut Projektumfang out of scope).

## Teststrategie

Wir prüfen auf vier Stufen nach dem Prinzip der Testpyramide: viele schnelle automatische Tests unten, wenige manuelle Prüfungen oben.

| Stufe | Werkzeug | Was geprüft wird | Wer |
| --- | --- | --- | --- |
| Unit-Tests Frontend | Vitest + Testing Library | Seiten, Formulare, Hilfsfunktionen; Backend-Aufrufe gemockt | wer das Ticket umsetzt |
| Unit-Tests Backend | Vitest | Schemas, Prompt-Aufbau, Validator, Word-Export, Lehrplan-Import | wer das Ticket umsetzt |
| Integration | Vitest + MySQL 8.4 | API-Routen mit echter Datenbank, Migrationen | Backend-Tandem |
| End-to-End | Playwright (Chromium) | Frontend, Proxy, Backend und Datenbank zusammen | QS-Tandem |
| Manuell | Edge, Smartphone, Checklisten | Bedienung, Barrierefreiheit, Qualität der KI-Ergebnisse | QS-Tandem |

Neue Funktionen bringen ihre Tests mit: mindestens ein Test für den Normalfall und einer für den Fehlerfall (z. B. Datenbank nicht erreichbar).

## Automatische Prüfungen im Pull Request

Jeder Pull Request löst fünf GitHub-Actions-Prüfungen aus (`.github/workflows/ci.yml`); gemergt wird nur, wenn alle fünf grün sind und eine zweite Person freigegeben hat (Branch-Schutz auf `main`: mindestens 1 Review).

| Prüfung | Was sie macht | Typischer Grund für Rot |
| --- | --- | --- |
| Unit-Tests (frontend) | Typprüfung und Build (`npm run build`), dann alle Vitest-Tests | Typfehler, ein Test erwartet alten Text |
| Unit-Tests (backend) | Syntaxprüfung (`npm run check`), dann alle Vitest-Unit-Tests | geändertes Schema, Prompt-Test |
| Backend-Integrationstests | Routen gegen eine echte MySQL 8.4, mit Coverage-Bericht | Migration oder SQL passt nicht |
| End-to-End (Playwright) | Startet Datenbank, Backend und Frontend in Docker und klickt die Startseite durch | Smoke-Test erwartet alte Inhalte |
| Docker-Build | Baut die Container-Images | Dockerfile oder Abhängigkeit kaputt |

Vor dem Push lokal mindestens `npm.cmd run typecheck` und `npm.cmd run test:run` im geänderten App-Ordner ausführen. Ist eine Prüfung rot, steht der Grund unter **Checks** im Pull Request; behoben wird auf demselben Branch, der Pull Request aktualisiert sich selbst.

## Manuelle Tests und Prüfung der KI-Ergebnisse

Was sich nicht automatisch prüfen lässt, testet das QS-Tandem von Hand und hält das Ergebnis in Google Drive fest.

| Prüfung | Inhalt | Ergebnis | Ticket |
| --- | --- | --- | --- |
| Testfälle aus den Use Cases | Je Use Case mindestens ein Testfall mit Schritten und erwartetem Ergebnis; alle Muss-Anforderungen abgedeckt | Testfall-Liste | QS-02 |
| Browser und Geräte | Alle Seiten in Edge unter Windows (wie beim Bildungspark), Kurztest in Smartphone-Größe | Fehler als Trello-Karten | FE-17 |
| Barrierefreiheit der Oberfläche | Tastaturbedienung, sichtbarer Fokus, Kontraste nach WCAG AA, beschriftete Felder | Mängelliste, behoben | FE-15 |
| KI-Ergebnisse | Je Niveaustufe T/A/F/B und Format mindestens eine Stichprobe (16 Blätter) mit echten Lernzielen; bewertet werden Leichte Sprache, passendes Niveau und fachliche Richtigkeit | Bewertungstabelle | QS-04 |
| Abnahmetest Release Candidate | Alle Testfälle aus QS-02 auf dem Stand vom 06.11. | Testprotokoll | QS-05 |

Der Validator im Backend gibt zu jedem KI-Blatt Hinweise (Satzlänge je Stufe, verbotene Wörter, Rechenzeichen bei „Ohne Rechnen“). Er ersetzt die Stichproben nicht: Ein Blatt mit „keine Hinweise“ kann fachlich trotzdem falsch sein, deshalb muss jedes KI-Blatt vor der Freigabe von einer Lehrkraft geprüft werden.

## Definition of Done

Ein Ticket darf erst nach **Fertig**, wenn alle Punkte erfüllt sind. Die Liste gilt für Code-Tickets; Dokumentations- und Planungs-Tickets erfüllen die Punkte 1, 7 und 8.

1. Alle Abnahmekriterien der Trello-Karte sind erfüllt.
2. Der Code liegt auf einem eigenen Branch und ist per Pull Request nach `main` gemergt.
3. Neue oder geänderte Funktionen haben Tests: mindestens Normalfall und Fehlerfall.
4. Alle fünf CI-Prüfungen sind grün, ohne neue Warnungen in den Tests.
5. Eine zweite Person hat den Pull Request geprüft und freigegeben (4-Augen-Prinzip).
6. Die Funktion wurde einmal von Hand im Browser durchgeklickt, auch der Fehlerfall (z. B. ohne Datenbank).
7. README bzw. `docs/` sind aktualisiert, wenn sich Bedienung, Start oder Schnittstellen ändern.
8. Die Trello-Karte verweist auf den Pull Request bzw. das Dokument und steht in **Fertig**.

Zusätzlich für das Frontend: keine Fehler in der Browser-Konsole, Texte auf Deutsch, Bedienung per Tastatur möglich. Zusätzlich für das Backend: keine Schlüssel oder Passwörter im Code, keine personenbezogenen Daten von Teilnehmenden in Logs oder KI-Prompts.

## Umgang mit Fehlern

Jeder gefundene Fehler wird eine eigene Trello-Karte mit dem Titel „Bug: …“, dem Label des Bereichs und einer Einstufung; kritische Fehler werden zusätzlich sofort im Gruppenchat gemeldet.

| Stufe | Bedeutung | Beispiel | Bis wann beheben |
| --- | --- | --- | --- |
| Kritisch | Hauptprozess bricht ab oder Daten gehen verloren | Arbeitsblatt kann nicht gespeichert werden | vor dem Release Candidate, sofort |
| Hoch | Funktion falsch, Umweg möglich | Filter zeigt falsche Blätter | vor dem Release Candidate |
| Mittel | Stört, Ergebnis stimmt | Meldung unverständlich | vor der Abschlusspräsentation |
| Niedrig | Kosmetisch | Abstand, Tippfehler | wenn Zeit bleibt |

Auf jede Bug-Karte gehören: Schritte zum Nachstellen, erwartetes und tatsächliches Ergebnis, Browser, Screenshot. Die Karte läuft über **Im Gange** nach **Testing**; dort testet eine andere Person nach und schiebt sie erst dann nach **Fertig**. Wo möglich kommt mit der Behebung ein Test dazu, der den Fehler künftig abfängt (wie bei FE-03).

## Ablauf und Termine

Alle QS-Schritte außer der Fehlerbehebung sind am 06.11. abgeschlossen; der Abnahmetest an diesem Tag ist der Nachweis für den Meilenstein Release Candidate.

| Zeitraum | Ticket | Schritt |
| --- | --- | --- |
| 30.–31.10. | QS-01 | Testkonzept und Definition of Done |
| 01.–03.11. | QS-02 | Testfälle aus den Use Cases |
| 02.–06.11. | QS-03 | E2E-Test für den Hauptprozess |
| 03.–05.11. | QS-04 | Stichproben der KI-Ergebnisse |
| 06.11. | QS-05 | Abnahmetest Release Candidate mit Testprotokoll |
| 07.–13.11. | QS-06 | Fehlerbehebung nach dem Abnahmetest |
| 16.11. | – | Abschlusspräsentation |

Die Termine entsprechen den Fälligkeiten der QS-Karten auf dem Trello-Board. Verschiebt sich der Release Candidate, verschieben sich QS-05 und QS-06 mit.
