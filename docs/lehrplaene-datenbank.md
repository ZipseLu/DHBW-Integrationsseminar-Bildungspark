# Lehrpläne in der Datenbank

Stand: 03.11.2026 · Trello: „Weitere Tabellen in DB erstellen“ (Lehrpläne; Teilnehmende kamen mit BE-02, Mitarbeitende mit BE-03)

Bisher lagen die 96 Lernziele der 14 Lehrplan-Dokumente nur in `apps/backend/data/lehrplaene.json` – erzeugt aus den DOCX des
Bildungsparks und bewusst nicht im Repository (Kundendaten, Repo öffentlich). Seit Migration 005 stehen sie in MySQL.
So sind sie auf dem Staging-Server dauerhaft vorhanden, landen im Datenbank-Backup (OPS-04) und können später per
Fremdschlüssel mit Arbeitsblättern verbunden werden (z. B. für BE-10 „Lehrmaterial vorschlagen“).

## Datenmodell (Migration `005_lehrplaene.sql`)

| Tabelle | Inhalt | Schlüssel |
| --- | --- | --- |
| `lehrplaene` | ein Lehrplan-Dokument (eine DOCX-Datei): `berufsfeld`, `baustein`, `ausbildungsbaustein`, `tq` (Teilqualifizierung), `quelle` (Dateiname), `importiert_am` | `id`; `quelle` eindeutig |
| `lernziele` | Lernziele eines Dokuments: `abschnitt`, `titel` | `id` = laufende Nummer aus dem Import; `lehrplan_id` → `lehrplaene` |
| `lernziel_niveaus` | je Lernziel die Stufen T/A/F/B mit `kompetenz` und `beispiel` | (`lernziel_id`, `stufe`) → `lernziele` |

```
lehrplaene 1 ──< lernziele 1 ──< lernziel_niveaus (genau 4: T, A, F, B)
```

- 14 Lehrpläne · 96 Lernziele (Lager 16, Metall 19, Gastro 61) · 384 Stufen-Einträge.
- Ein neuer Import **ersetzt den kompletten Bestand** in einer Transaktion (`ON DELETE CASCADE`): Danach steht entweder der neue
  oder weiterhin der alte Stand. Die Lernziel-IDs bleiben gleich, solange die Quelldateien gleich bleiben.
- ⚠️ **Bevor eine andere Tabelle per Fremdschlüssel auf `lernziele` zeigt** (z. B. BE-10 „Lehrmaterial vorschlagen“, das
  Arbeitsblätter mit Lernzielen verknüpft), muss `ersetzeAlle` von „löschen und neu aufbauen“ auf **Upsert** umgestellt werden
  (`INSERT … ON DUPLICATE KEY UPDATE`, anschließend nur nicht mehr vorhandene Zeilen löschen). Sonst löscht `DELETE FROM lehrplaene`
  die Verknüpfungen per `CASCADE` mit, oder ein `RESTRICT`-Fremdschlüssel lässt den Re-Import scheitern. Solange keine solche
  Tabelle existiert, ist das Ersetzen unkritisch.

## Befüllen

| Situation | Befehl (in `apps/backend`) | Wirkung |
| --- | --- | --- |
| DOCX liegen vor (Ordner `../context/WG__Unterlagen_BIldungspark` neben dem Repo) | `npm run import:lehrplaene` | liest die DOCX, schreibt `data/lehrplaene.json` **und** ersetzt die Lehrpläne in der Datenbank (ohne Datenbank nur die Datei) |
| nur `data/lehrplaene.json` vorhanden (z. B. Server, Kollegin ohne DOCX) | `npm run db:seed` | übernimmt die Datei in die Datenbank, wenn dort noch keine Lernziele stehen |
| Docker | `docker compose exec backend npm run db:seed` | wie oben, im Container (`apps/backend` ist eingebunden) |

Für den **Staging-Server**: `data/lehrplaene.json` sicher auf den Server kopieren (nicht über GitHub) und einmal `npm run db:seed` ausführen.

Ist die Datei alt oder kaputt (kein gültiges JSON, fehlende `lernziele`), bricht `npm run db:seed` **nicht** ab: `seedLehrplaene`
loggt nur eine Warnung und der Rest (Arbeitsblätter, Konten, Teilnehmende, Zuordnungen) wird trotzdem angelegt.

## API – unverändert für das Frontend

`GET /api/lehrplaene` liefert dieselbe Form wie bisher (`{ stand, anzahl, lernziele }`, Lernziel = `{ id, berufsfeld, tq, baustein,
ausbildungsbaustein, abschnitt, titel, niveaus, quelle }`) und zusätzlich `herkunft`:

| `herkunft` | wann |
| --- | --- |
| `datenbank` | Lernziele stehen in der Datenbank (Normalfall) |
| `datei` | Datenbank nicht erreichbar oder noch leer, aber `data/lehrplaene.json` vorhanden – z. B. KI-Demo ohne Docker; mit `hinweis` |
| `null` | weder noch: leere Liste mit `hinweis`; das Frontend nutzt seine 12 Beispiel-Lernziele |

`stand` ist das Datum des letzten Imports in **Europe/Berlin** (nicht UTC), damit ein Import zwischen 0 und 1 Uhr nicht den Vortag anzeigt.

Ist die Datenbank nicht erreichbar, merkt sich die Route das **30 Sekunden** lang: In dieser Zeit kommt die Antwort sofort aus der
JSON-Datei, statt bei jedem Seitenaufruf erneut einen Verbindungsversuch zu starten (bei `ETIMEDOUT` sonst bis zu 10 s pro Aufruf).

## Lehrplan in der Anwendung hinzufügen (FE-34)

Admins und Dozierende können auf der Seite **Lehrpläne** über „+ Lehrplan hinzufügen“ eine Word-Datei eines
binnendifferenzierten Lehrplans hochladen – ohne Import-Skript und ohne Kommandozeile.

1. Datei (`.docx`) wählen und das Berufsfeld: eines der bekannten, „Anderes Berufsfeld …“ mit eigenem Namen oder
   „Aus dem Dateinamen erkennen“ (wie das Import-Skript: `TQ Lager`, `TQ Metall`, `TQ Gastro`).
2. **Prüfen** – das Backend liest die Datei mit demselben Parser wie `npm run import:lehrplaene` und zeigt
   „12 Lernziele erkannt“ mit der Liste, den vorhandenen Stufen und Hinweisen (fehlende Stufe, fehlender Baustein).
3. **Speichern** – das Backend liest die Datei erneut und speichert sie. Gibt es schon einen Lehrplan aus einer Datei
   mit demselben Namen, wird er ersetzt (neue Version); der Dialog weist vorher darauf hin.

Danach erscheinen die Lernziele sofort in der KI-Erstellung, auf der Seite Lehrpläne und – bei einem neuen Berufsfeld –
in allen Auswahllisten (Arbeitsblätter-Filter, Lernweg der Teilnehmenden, Upload, Einstellungen; `useBerufsfelder()` in
`apps/frontend/src/lib/berufsfelder.ts`).

| Route | Zweck |
| --- | --- |
| `POST /api/lehrplaene/vorschau` | Datei lesen, nichts speichern → `{ lehrplan: { quelle, berufsfeld, tq, baustein, ausbildungsbaustein, lernziele, hinweise }, ersetzt }` |
| `POST /api/lehrplaene` | Datei lesen und speichern → `201 { lehrplan, anzahl, ersetzt }`; mit Token nur `admin`/`dozent` (sonst 403) |

Beide erwarten die Datei als Rohdaten im Body (wie `POST /api/uploads`), den Dateinamen URI-kodiert im Header
`X-Dateiname` und optional `?berufsfeld=`. Fehler: `415` kein Word-Dokument, `400 berufsfeld_fehlt`,
`422 keine_lernziele` (keine Lehrplan-Tabelle erkannt), `413` größer als 20 MB, `503` ohne Datenbank (nur beim Speichern).

Neue Lernziele bekommen die nächsten freien IDs; die IDs der übrigen Lernziele bleiben gleich. Ist die Datenbank noch
leer und kommen die Lernziele bisher aus `data/lehrplaene.json`, übernimmt das Backend die Datei vor dem ersten Speichern
in die Datenbank – sonst würde der neue Lehrplan alle anderen verdecken.

**Achtung:** `npm run import:lehrplaene` ersetzt weiterhin den kompletten Bestand – in der Anwendung hinzugefügte
Lehrpläne sind danach weg, wenn ihre Datei nicht im Import-Ordner liegt.

## Code

| Datei | Zweck |
| --- | --- |
| `apps/backend/db/migrations/005_lehrplaene.sql` | Tabellen |
| `apps/backend/src/lehrplan/repository.js` | `listLernziele()`, `stand()`, `count()`, `ersetzeAlle(lernziele)`, `quelleVorhanden()`, `fuegeLehrplanHinzu()` (FE-34) |
| `apps/backend/src/lehrplan/hochladen.js` | FE-34: hochgeladene Word-Datei prüfen und lesen |
| `apps/backend/src/lehrplan/schema.js` | prüft Importdaten vor dem Schreiben (Pflichtfelder, Längen, doppelte IDs) |
| `apps/backend/src/lehrplan/seed.js` | Datei → Datenbank für `npm run db:seed` |
| `apps/backend/src/routes/lehrplaene.js` | `GET /api/lehrplaene`: Datenbank, sonst Datei; FE-34: `POST /vorschau`, `POST /` |
| `apps/backend/scripts/import-lehrplaene.js` | DOCX → Datei + Datenbank |

## Tests

- `tests/unit/lehrplaene.test.js` – Schema der Importdaten; Reihenfolge Datenbank → Datei → leer (Repository als Stub)
- `tests/integration/lehrplaene-db.test.js` – Rundreise Import → Abfrage, Ersetzen, Abbruch ohne Datenverlust, Seed, `GET /api/lehrplaene`; gegen MySQL
- `tests/integration/lehrplaene-routes.test.js` – Weg über die Datei (wie bisher)
- `tests/unit/lehrplan-hochladen.test.js` – FE-34: Datei lesen, Fehlerfälle, beide Routen, Rollen (Repository als Stub)
- `apps/frontend/tests/unit/LehrplanHinzufuegen.spec.tsx` – FE-34: Dialog Prüfen → Vorschau → Speichern, Ersetzen, Fehler, Rollen, Berufsfelder
