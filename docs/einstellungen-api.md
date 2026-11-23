# Einstellungen pro Konto (FE-20)

Die Einstellungen der Oberfläche (Darstellung, Standard-Berufsbild – see `AppSettings` in
`apps/frontend/src/types.ts`) lagen bisher nur im `localStorage` des Browsers. Für dieselbe
Person auf mehreren Geräten liegen sie jetzt zusätzlich in MySQL: **ein Datensatz pro Konto**
(Tabelle `einstellungen`, Migration `007_einstellungen.sql`).

## API

| Methode | Route | Antwort |
|---|---|---|
| `GET` | `/api/einstellungen?konto=<email>` | `{ "einstellungen": { … } \| null }` |
| `PUT` | `/api/einstellungen?konto=<email>` | `{ "einstellungen": { … } }` |

Der Body von `PUT` ist `{ "einstellungen": { … } }` (das reine Objekt wird ebenfalls
akzeptiert). Felder, die nicht gesendet werden, behalten ihren bisherigen Wert. Unbekannte
Felder und falsche Typen werden mit `400 validation_error` abgelehnt.

### Welches Konto?

- **Mit gültigem Login-Token:** die Konto-ID aus dem Token (`req.benutzer.id`) hat Vorrang
  vor `?konto=…`. Damit kann man nur die eigenen Einstellungen lesen und schreiben.
- **Ohne Token (aktueller Prototyp):** `?konto=` ist die E-Mail-Adresse des angezeigten
  Kontos. Sie wird in der Tabelle `users` aufgelöst; unbekannte Adressen ergeben `404`.
  Fehlt der Parameter, antwortet die API mit `400`.

Der Prototyp hat noch keine Login-Maske (FE-08), deshalb nutzt das Frontend im Moment
`c.hager@bildungspark.example` aus `data/users.ts`. Beim Anmelden (spätestens mit BE-06)
kommt das Token hinzu; die Token-Reihenfolge in der API bleibt dann unverändert gültig.

Ohne erreichbare MySQL antworten beide Routen mit `503 db_unavailable`.

## Frontend-Ablauf

1. Beim Start rendert die App sofort mit den Einstellungen aus dem `localStorage`
   (oder den Standardwerten) – das Theme flackert nicht.
2. Danach lädt `fetchEinstellungen(konto)` die Werte des Kontos aus dem Backend und
   überschreibt den lokalen Stand (`mischeEinstellungen` ergänzt fehlende Felder).
   Bei `null`, Fehler oder fehlendem Konto bleibt der lokale Stand erhalten.
3. „Einstellungen speichern“ schreibt über `saveEinstellungen(konto, einstellungen)`
   nach MySQL und zusätzlich in den `localStorage` (Cache und Fallback).

Die Hilfsfunktionen liegen in `apps/frontend/src/lib/api.ts`, die Merge-Logik in
`apps/frontend/src/lib/settings.ts`. Das Laden sitzt in `App.tsx` in einem `useEffect`
mit `user.email` als Abhängigkeit – beim späteren Login muss sich also nur die E-Mail
des angemeldeten Kontos ändern.

## Bewusste Grenzen

- Bis BE-06 sind die Routen ohne Token erreichbar; dann kann bei Kenntnis einer
  E-Mail-Adresse der Wert gelesen/gesetzt werden (wie bei den anderen Prototyp-Routen
  auch). Mit Token zählt ausschließlich die eigene Konto-ID.
- Die Werte sind reine Oberflächen-Einstellungen, keine sicherheitsrelevanten Daten.
- Das Backend kennt keine Standardwerte; ein älterer Datensatz wird im Frontend mit
  `DEFAULT_SETTINGS` aufgefüllt.

## Tests

- `apps/backend/tests/integration/einstellungen-routes.test.js` (MySQL, nur mit `DB_HOST`):
  Speichern/Lesen, getrennte Konten, Token-Vorrang, Validierung, Löschen mit Konto
- `apps/frontend/tests/unit/Einstellungen.spec.tsx`: Laden beim Start, Speichern per PUT,
  Fallback auf lokale Werte
