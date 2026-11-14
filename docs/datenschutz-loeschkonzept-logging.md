# Datenschutz, Löschung und Logs (BE-08)

Stand: 14.11.2026 · Backend-Prüfung

## Teilnehmendendaten

Das Profilmodell (`teilnehmende` und `teilnehmende_stationen`) enthält nur die pseudonyme Kennung, Stufe,
Lernweg, Fortschritt und Datumsangaben. Namen, Diagnosen und freie Profilfelder weist das strikte API-Schema
zurück. Die Kennung ist pseudonym und bleibt deshalb schutzbedürftig.

Zuordnungen enthalten die Kennung, Arbeitsblatt-ID, Bearbeitungsstatus und Zeitpunkte. `zugeordnet_von` ist
der Name des Mitarbeiters, der die Zuordnung vorgenommen hat. Es gibt keinen Teilnehmernamen in diesem Modell.

## KI-Eingaben

`POST /api/ai/arbeitsblatt` akzeptiert nur die festgelegten Lehrplan-, Niveau-, Format- und Sprachfelder sowie
optionale Themen- und Erwartungstexte. Die Anfrage-Schemas sind strikt: zusätzliche Felder wie `teilnehmer`
oder Kennung/Namen im Lernziel werden vor dem Prompt-Aufbau abgewiesen. Die Route lädt keine Teilnehmerprofile.
Der Prompt wird nur aus der validierten Anfrage erstellt.

Themen- und Erwartungstexte sind Freitext und werden an den KI-Anbieter gesendet. Sie dürfen keine Angaben zu
einzelnen Teilnehmenden enthalten. Das Backend kann Namen in frei formuliertem Text nicht zuverlässig erkennen;
Arbeitsblatt- und Upload-Inhalte müssen daher vor dem Speichern bzw. Hochladen von Teilnehmerangaben bereinigt sein.

## Löschung

`DELETE /api/teilnehmende/:kennung` entfernt das Profil. Fremdschlüssel mit `ON DELETE CASCADE` entfernen dabei
auch den Lernweg und alle Zuordnungen zu dieser Kennung (`002_teilnehmende.sql`, `004_zuordnungen.sql`).
Arbeitsblätter bleiben erhalten, da sie nicht einer einzelnen Person gehören. Die Löschung ist manuell; eine
automatische Aufbewahrungsfrist ist derzeit nicht eingerichtet.

## Logging

- HTTP-Logs enthalten Methode, bereinigten Pfad, Status und Antwortzeit. Query-Strings werden ausgelassen;
  dynamische Segmente unter `/api/teilnehmende/:kennung` werden maskiert.
- Request-Bodies und Header werden nicht protokolliert. Der Logger gibt auch keinen Referrer oder User-Agent aus.
- Fehlerlogs enthalten nur HTTP-Status bzw. Fehlercode, nie Request- oder Provider-Fehlertexte. KI-Wiederholungen
  protokollieren weder Prompt noch Antwort/Korrekturtext.
- Beispielkonten speichern Passwörter als scrypt-Hash. Das Seed-Skript protokolliert kein Startpasswort.
  JWTs werden signiert und geprüft, aber serverseitig nicht in einer Sitzungstabelle gespeichert.

## Nachweise

`tests/unit/request-logger.test.js` prüft Pfadmaskierung und Logformat; `tests/unit/arbeitsblatt-schema.test.js`
prüft die Zurückweisung zusätzlicher Teilnehmerdaten. Die Integrationstests für Benutzer-Seeds und
Teilnehmerlöschung prüfen Passwort-Logfreiheit und Löschkaskaden gegen MySQL.
