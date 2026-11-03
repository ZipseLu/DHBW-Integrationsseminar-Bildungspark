# Zuordnung Arbeitsblatt ↔ Teilnehmende und Lernstand (BE-04)

Stand: 03.11.2026 · Trello: BE-04 · Grundlage für FE-11 (Lernstand anzeigen & Arbeitsblätter zuordnen) und die „Als Nächstes“-Anzeige auf dem Dashboard

Dozierende ordnen Teilnehmenden **gespeicherte Arbeitsblätter** (`/api/arbeitsblaetter`) zu und haken sie ab, wenn sie bearbeitet sind.
Daraus berechnet das Backend den **Lernstand**: was je Berufsfeld erledigt und offen ist und welches Blatt als Nächstes dran ist
(feste Vorgabe des Bildungsparks: „Stand anzeigen“).

## Datenmodell (Migration `003_zuordnungen.sql`)

| Spalte | Inhalt |
| --- | --- |
| `id` | UUID der Zuordnung |
| `kennung` | Teilnehmende/r (pseudonyme Kennung, BE-02) |
| `arbeitsblatt_id` | gespeichertes Arbeitsblatt |
| `status` | `offen` / `erledigt` |
| `zugeordnet_am`, `erledigt_am` | Zeitpunkte (`erledigt_am` nur bei Status `erledigt`) |
| `zugeordnet_von` | Name aus der Anmeldung (BE-01), ohne Token `null` |

- Je Person und Arbeitsblatt höchstens eine Zuordnung (`409 bereits_zugeordnet`). Zum Wiederholen: wieder auf `offen` setzen.
- Das **Berufsfeld kommt aus dem Arbeitsblatt** – keine Kopie, die auseinanderlaufen könnte.
- Profil löschen oder Arbeitsblatt **endgültig** löschen entfernt die Zuordnungen mit (`ON DELETE CASCADE`; BE-08: keine verwaisten Daten).
  Ein **archiviertes** Blatt bleibt zugeordnet (Status im Feld `arbeitsblatt.status`), kann aber nicht neu zugeordnet werden (`409 blatt_archiviert`).

## Endpunkte

| Methode | Pfad | Zweck | Antworten |
| --- | --- | --- | --- |
| GET | `/api/teilnehmende/:kennung/zuordnungen` | Zuordnungen, älteste zuerst; `?status=offen\|erledigt` | `200 { eintraege, gesamt }`, `404` |
| POST | `/api/teilnehmende/:kennung/zuordnungen` | `{ arbeitsblattId }` zuordnen | `201 { zuordnung }`, `400`, `404`, `409` |
| PATCH | `/api/teilnehmende/:kennung/zuordnungen/:id` | `{ status }` abhaken oder wieder öffnen | `200 { zuordnung }`, `400`, `404` |
| DELETE | `/api/teilnehmende/:kennung/zuordnungen/:id` | Zuordnung entfernen (Blatt bleibt) | `204`, `404` |
| GET | `/api/teilnehmende/:kennung/lernstand` | Lernstand einer Person | `200 { lernstand }`, `404` |
| GET | `/api/teilnehmende/lernstand` | Lernstand aller Personen (Übersicht, Dashboard) | `200 { eintraege, gesamt }` |

Ohne Datenbank: `503 db_unavailable`; Eingaben werden vorher geprüft (`400` vor `503`).
Fehlercodes im Feld `code`: `teilnehmer_unbekannt`, `arbeitsblatt_unbekannt`, `zuordnung_unbekannt` (404) · `bereits_zugeordnet`, `blatt_archiviert` (409).

Eine Zuordnung in der Antwort:

```json
{
  "id": "6f1c…",
  "kennung": "IW3-4421",
  "status": "offen",
  "zugeordnetAm": "2026-11-03T08:00:00.000Z",
  "erledigtAm": null,
  "zugeordnetVon": "C. Hager",
  "arbeitsblatt": {
    "id": "0b7e…", "titel": "Güter entladen", "berufsfeld": "Lagerlogistik, Handel & Versand",
    "baustein": 1, "ausbildungsbaustein": "Wareneingang", "lernziel": "Güter entladen",
    "stufe": "A", "format": "text", "sprache": "Leichte Sprache", "status": "freigegeben"
  }
}
```

## Lernstand

```json
{
  "kennung": "IW3-4421",
  "anzahl": { "erledigt": 1, "offen": 2, "gesamt": 3 },
  "alsNaechstes": { "…": "Zuordnung" },
  "berufsfelder": [
    {
      "berufsfeld": "Lagerlogistik, Handel & Versand",
      "station": { "position": 1, "status": "aktiv", "stufe": "A", "format": "text" },
      "fortschritt": 50,
      "anzahl": { "erledigt": 1, "offen": 1, "gesamt": 2 },
      "alsNaechstes": { "…": "Zuordnung" },
      "offen": [ "…" ],
      "erledigt": [ "…" ]
    }
  ]
}
```

Regeln (`src/zuordnungen/lernstand.js`, mit Unit-Tests):

- **Reihenfolge der Berufsfelder = Lernweg** (Stationen aus BE-02). Stationen ohne Zuordnung erscheinen mit 0; Blätter aus einem
  Berufsfeld außerhalb des Lernwegs hängen alphabetisch hinten an (`station: null`).
- **Fortschritt** je Berufsfeld = erledigt / gesamt in Prozent.
- **Als Nächstes** je Berufsfeld = die am längsten offene Zuordnung – die Reihenfolge bestimmen die Dozierenden beim Zuordnen.
- **Als Nächstes insgesamt** = nächstes Blatt der **aktiven** Station; ist dort nichts offen, das nächste offene Blatt entlang des Lernwegs.
- `offen` ist nach Zuordnung sortiert (älteste zuerst), `erledigt` nach Erledigung (zuletzt erledigte zuerst).

**Abgrenzung zum Lernweg (BE-02):** Die Felder `fortschritt` und `blaetterErledigt` einer Station bleiben die Werte aus dem
Profil-Dialog (z. B. Stand vor der Einführung des Systems). Der Lernstand rechnet nur aus den Zuordnungen und ändert sie nicht.
Für FE-11 also die Zahlen aus `/lernstand` anzeigen.

## Frontend (`apps/frontend/src/lib/api.ts`)

| Funktion | Endpunkt |
| --- | --- |
| `fetchZuordnungen(kennung, status?)` | `GET …/zuordnungen` |
| `zuordnen(kennung, arbeitsblattId)` | `POST …/zuordnungen` |
| `setZuordnungStatus(kennung, id, 'erledigt' \| 'offen')` | `PATCH …/zuordnungen/:id` |
| `deleteZuordnung(kennung, id)` | `DELETE …/zuordnungen/:id` |
| `fetchLernstand(kennung)` | `GET …/:kennung/lernstand` |
| `fetchLernstandAlle()` | `GET /api/teilnehmende/lernstand` |

Für den Dialog „Arbeitsblatt zuweisen“ liefert `fetchArbeitsblaetter({ berufsfeld })` die gespeicherten Blätter des aktiven Berufsfelds
(statt der Beispieldaten `WORKSHEETS`); die IDs daraus gehen an `zuordnen`.

## Beispieldaten

`npm run db:seed` legt nach Arbeitsblättern, Teilnehmenden und Konten Beispiel-Zuordnungen an: je Person mit aktiver Station bis zu drei
Blätter dieses Berufsfelds (passende Stufe zuerst), das erste davon erledigt. Nur in eine leere Tabelle; `--reset` leert sie über die
gelöschten Blätter und Profile mit.

## Tests

- `tests/unit/zuordnungen.test.js` – Regeln des Lernstands, Schemas, Prüfungen der Routen vor der Datenbank
- `tests/integration/zuordnungen-routes.test.js` – alle Endpunkte, Löschen per Kaskade, Name aus der Anmeldung, Seed; gegen MySQL
- `apps/frontend/tests/unit/apiClient.spec.ts` – URLs, Methoden und Bodies der Client-Funktionen
