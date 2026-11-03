# Benutzerverwaltung-API (BE-03)

Stand: 03.11.2026 · Trello: BE-03 · Grundlage für FE-09 (Seite Benutzerverwaltung) und BE-01 (Anmeldung)

Das Backend verwaltet die Konten der Mitarbeitenden in der Tabelle `users` (aus Migration 001; keine neue Migration).
Rollen wie im Frontend: `admin`, `dozent`, `assistent`. Passwörter werden nur als **scrypt-Hash** gespeichert
(`src/benutzer/passwort.js`, in Node eingebaut, keine zusätzliche Abhängigkeit) und nie zurückgegeben.

## Endpunkte

| Methode | Pfad | Zweck | Antworten |
| --- | --- | --- | --- |
| GET | `/api/benutzer` | alle Konten, sortiert nach Name | `200 { eintraege, gesamt }` |
| POST | `/api/benutzer` | Konto anlegen | `201 { benutzer }`, `400`, `409 email_vergeben` |
| GET | `/api/benutzer/:id` | ein Konto | `200 { benutzer }`, `404` |
| PATCH | `/api/benutzer/:id` | Name, E-Mail, Rolle und/oder Passwort ändern | `200 { benutzer }`, `400`, `404`, `409` |
| DELETE | `/api/benutzer/:id` | Konto löschen | `204`, `404`, `409` |

Ein Konto in der Antwort: `{ id, name, email, rolle, erstelltAm }`.

### Regeln

- E-Mail-Adressen werden kleingeschrieben gespeichert und sind eindeutig (`409 email_vergeben`).
- Passwort mindestens 8 Zeichen. Unbekannte Felder (z. B. `role` statt `rolle`) werden mit `400` abgelehnt.
- Das **letzte Admin-Konto** kann weder gelöscht noch herabgestuft werden (`409 letzter_admin`).
- Das **eigene Konto** kann nicht gelöscht werden (`409 eigenes_konto`) – greift, sobald die Anmeldung `req.benutzer` setzt.
- Ohne Datenbank: `503 db_unavailable`; Eingaben werden vorher geprüft (`400` vor `503`).

### Beispiel

```http
POST /api/benutzer
Content-Type: application/json

{ "name": "A. Mustajbegovic", "email": "a.mustajbegovic@bildungspark.example", "rolle": "dozent", "passwort": "mindestens-8-zeichen" }
```

```json
{ "benutzer": { "id": "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90", "name": "A. Mustajbegovic", "email": "a.mustajbegovic@bildungspark.example", "rolle": "dozent", "erstelltAm": "2026-11-03T09:30:00.000Z" } }
```

## Nur für Admins – Übergabe an BE-01

Die Routen hängen hinter `erfordereRolle('admin')` (`src/auth/rollen.js`). Vertrag für BE-01:

1. Die Anmelde-Middleware prüft das Token und setzt `req.benutzer = { id, rolle }`.
2. Ab dann weist `erfordereRolle('admin')` andere Rollen mit `403 forbidden` ab, und „eigenes Konto löschen“ greift.
3. Zum Anmelden liefert `findForLogin(email)` (`src/benutzer/repository.js`) das Konto samt `passwortHash`;
   geprüft wird mit `pruefePasswort(passwort, passwortHash)`.

**Seit BE-01 (03.11.) setzt `authentifiziere` (`src/auth/anmeldung.js`) `req.benutzer` für jede Anfrage mit gültigem Token – Details in `docs/anmeldung-api.md`. Ohne Token ist die Prüfung bis BE-06 weiter offen, wie bei allen anderen Routen des Prototyps.**
BE-06 („Schreibende Endpunkte absichern“) verlangt danach für jede Anfrage eine Anmeldung.

## Beispieldaten

`npm run db:seed` legt die vier Konten aus dem Frontend an (Celine Hager als Admin, zwei Dozierende, eine Assistenz;
Adressen auf `.example`). Startpasswort für alle: Umgebungsvariable `SEED_PASSWORT`, sonst `bildungspark-demo` –
**nur für lokale Entwicklung und Demos.**

## Zuordnung zum Frontend (für FE-09)

| Frontend (`StaffUser`) | API |
| --- | --- |
| `id`, `name`, `email` | `id`, `name`, `email` |
| `role` | `rolle` |
| `createdAt` | `erstelltAm` (ISO-Zeit; Datum = erste 10 Zeichen) |
| `initials` | im Frontend aus dem Namen berechnet (`initialsOf`) |
