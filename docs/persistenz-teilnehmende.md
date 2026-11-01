# Teilnehmende speichern (BE-02)

Stand: 30.10.2026 · Trello: BE-02 · Grundlage für FE-12 (Profile) und FE-13 (Niveaustufen je Berufsfeld)

Das Backend speichert anonymisierte Teilnehmerprofile mit ihrem Lernweg in MySQL. Ein Profil besteht nur aus einer
**pseudonymen Kennung** (z. B. `IW3-4421`), einer Niveaustufe und den Stationen des Lernwegs. Namen, Diagnosen und
freie Textfelder gibt es bewusst nicht (§ 60 SGB IX, siehe `docs/fachliche-grundlagen.md`); die API lehnt unbekannte
Felder wie `name` mit `400` ab, statt sie still zu verwerfen.

## Datenmodell (Migration `002_teilnehmende.sql`)

| Tabelle | Inhalt |
| --- | --- |
| `teilnehmende` | `kennung` (Primärschlüssel), `stufe` (T/A/F/B), `erstellt_am`, `geaendert_am` |
| `teilnehmende_stationen` | Lernweg: je Berufsfeld `position`, `stufe`, `format`, `status` (abgeschlossen/aktiv/ausstehend), `fortschritt` (0–100), `start_datum`, `end_datum`, `blaetter_erledigt` |

- Je Profil ist jedes Berufsfeld höchstens einmal im Lernweg, und höchstens eine Station ist `aktiv`.
- Der **Gesamtfortschritt** wird nicht gespeichert: Er ist der Fortschritt der aktiven Station (alle abgeschlossen → 100, sonst 0).
- Löschen eines Profils löscht seinen Lernweg mit (`ON DELETE CASCADE`).
- `blaetter_erledigt` wird bis BE-04 (Zuordnung Arbeitsblatt ↔ Teilnehmende) von Hand gepflegt.

## Endpunkte

| Methode | Pfad | Zweck | Antworten |
| --- | --- | --- | --- |
| GET | `/api/teilnehmende` | alle Profile mit Lernweg, sortiert nach Kennung | `200 { eintraege, gesamt }` |
| POST | `/api/teilnehmende` | Profil anlegen | `201 { teilnehmer }`, `400`, `409` Kennung vergeben |
| GET | `/api/teilnehmende/:kennung` | ein Profil | `200 { teilnehmer }`, `404` |
| PUT | `/api/teilnehmende/:kennung` | Stufe und kompletten Lernweg ersetzen | `200 { teilnehmer }`, `400`, `404` |
| DELETE | `/api/teilnehmende/:kennung` | Profil samt Lernweg löschen | `204`, `404` |

Kennungen werden in Großbuchstaben umgewandelt (`iw3-4421` → `IW3-4421`). Ohne Datenbank antworten alle Routen mit
`503 db_unavailable`; Eingaben werden trotzdem vorher geprüft (`400` vor `503`).

### Beispiel: Profil anlegen

```http
POST /api/teilnehmende
Content-Type: application/json

{
  "kennung": "IW3-4421",
  "stufe": "A",
  "stationen": [
    { "berufsfeld": "Garten- und Landschaftsbau", "stufe": "T", "format": "piktogramm", "status": "abgeschlossen", "fortschritt": 100, "startDatum": "2026-06-01", "endDatum": "2026-07-12", "blaetterErledigt": 8 },
    { "berufsfeld": "Lagerlogistik, Handel & Versand", "stufe": "A", "format": "text", "status": "aktiv", "fortschritt": 68, "startDatum": "2026-07-13" },
    { "berufsfeld": "Metalltechnik & Montage", "stufe": "A", "format": "mathefrei" }
  ]
}
```

Antwort (`201`, gekürzt):

```json
{
  "teilnehmer": {
    "kennung": "IW3-4421",
    "stufe": "A",
    "fortschritt": 68,
    "zuletztAktiv": "2026-10-30",
    "erstelltAm": "2026-10-30T20:15:00.000Z",
    "geaendertAm": "2026-10-30T20:15:00.000Z",
    "stationen": [
      { "berufsfeld": "Garten- und Landschaftsbau", "stufe": "T", "format": "piktogramm", "status": "abgeschlossen", "fortschritt": 100, "startDatum": "2026-06-01", "endDatum": "2026-07-12", "blaetterErledigt": 8 }
    ]
  }
}
```

Fehlende Felder einer Station bekommen Standardwerte: `status` = `ausstehend`, `fortschritt` = 0, Daten = `null`,
`blaetterErledigt` = 0.

## Beispieldaten

`npm run db:seed` (in `apps/backend`) legt neben den Arbeitsblättern die fünf Profile aus dem Frontend an
(`IW3-4421`, `IW3-4388`, `IW3-4412`, `IW3-4399`, `IW3-4401`) – nur in eine leere Tabelle; `--reset` löscht vorher.

## Zuordnung zum Frontend (für FE-12)

| Frontend (`Participant`, `BerufStation`) | API |
| --- | --- |
| `id` | `kennung` |
| `level` | `stufe` |
| `progress` | `fortschritt` |
| `lastActive` | `zuletztAktiv` |
| `berufsbilder[].berufsbild` | `stationen[].berufsfeld` |
| `level`, `format`, `status`, `progress` | `stufe`, `format`, `status`, `fortschritt` |
| `startDate`, `endDate` | `startDatum`, `endDatum` (`''` im Frontend = `null`) |
| `worksheetsDone` | `blaetterErledigt` |

## Noch offen

- Anmeldung und Rechte (BE-01, BE-06): bis dahin sind die Routen ohne Anmeldung erreichbar.
- Zuordnung von Arbeitsblättern und Lernstand (BE-04) füllt später `blaetterErledigt` automatisch.
