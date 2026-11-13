# Backend-Schnittstellen für Adis Frontend (`adi/frontend-trello`)

Stand: 13.11.2026 · Backend: Thomas · Frontend: Adi · Abgleich mit `apps/frontend/docs/adi-frontend.md`

Dieses Dokument hält fest, welche Backend-Routen Adis Frontend nutzt, wo sich seine vorgeschlagenen Verträge von bereits
bestehenden unterscheiden und wie das gelöst ist. Frontend-Code ändert das Backend-Team nicht.

## Branches

| Branch | Inhalt | Basis |
| --- | --- | --- |
| `feature/be-01-06-anmeldung-absicherung` | BE-01 (Sinan, übernommen) + Login-Vertrag für FE-08, Pflicht-Anmeldung, Rollen, Rate-Limits (BE-06) | `main` |
| `feature/be-online-suche-api` | `GET /api/suche` (FE-14) | Anmeldung |
| `feature/be-frontend-schnittstellen` | Vertragstests für Materialvorschläge (FE-19) und Teilnehmende (FE-12/13), dieses Dokument | Suche |
| `integration/adi-frontend-backend` | `adi/frontend-trello` + die drei Backend-Branches, nur zum gemeinsamen Testen | – |

Die Backend-Branches bauen aufeinander auf und lassen sich als drei PRs nacheinander mergen. `main` bleibt bis zur gemeinsamen Prüfung unverändert.

## 1. Anmeldung (FE-08)

**Ergebnis: Adis Vorschlag wird ohne Änderung im Frontend erfüllt.** Details: `docs/anmeldung-api.md`.

| Punkt | Adis Vorschlag | BE-01 (Sinan, 03.11.) | jetzt |
| --- | --- | --- | --- |
| Pfad | `POST /api/auth/login` | gleich | gleich |
| Passwortfeld | `password` | `passwort` | beides angenommen (nicht gleichzeitig) |
| Token | `token` | `token` | `token` |
| Gültigkeit | `expiresIn` (Sekunden, ≤ 86400) | `ablaufAm` (ISO-Zeit) | beides; `expiresIn` Standard 28800, Start verweigert bei > 1 Tag |
| Konto | `user { id, name, email, role }` | `benutzer { id, name, email, rolle, erstelltAm }` | beides |
| Falsche Daten | `401` | `401 anmeldung_fehlgeschlagen` | gleich |
| Geschützte Routen | serverseitig prüfen | ohne Token offen | **alle Routen außer Health und Login verlangen ein Token** |
| Token-Speicher im Browser | Arbeitsspeicher | `sessionStorage` (`lib/api.ts`) | Sinans Frontend-Teil **nicht** übernommen – Adis `session.ts` gilt |

Was das Frontend beachten sollte:

- `401` kommt jetzt von **jeder** geschützten Route, wenn das Token fehlt, abgelaufen oder ungültig ist. Adis `apiFetch` beendet
  dann die Sitzung – passt.
- `403` heißt „angemeldet, aber Rolle reicht nicht“ (Tabelle in `docs/anmeldung-api.md`). Für Assistenz betrifft das: Status
  ändern/Freigeben, Archivieren, endgültig löschen, Teilnehmerprofile löschen, Benutzerverwaltung. Buttons dafür am besten
  ausblenden; die Meldung steht in `message`.
- `429` mit `code: zu_viele_anmeldeversuche` (Login) bzw. `zu_viele_ki_anfragen` (KI) – `message` anzeigen.
- `GET /api/auth/me` liefert `{ user, benutzer }`. Adi braucht es nicht, weil Neuladen eine neue Anmeldung verlangt.

Testkonten: `npm run db:seed` mit gesetztem `SEED_PASSWORT` (sonst Zufallspasswort im Log, OPS-07).

## 2. Online-Suche (FE-14)

**Ergebnis: Adis Vertrag wird erfüllt.** Details: `docs/online-suche.md`.

`GET /api/suche?q=Holz` → `{ "results": [{ "title", "url", "snippet" }] }`. Nur echte Treffer, keine simulierten.

| Punkt | Adis Vorschlag | `feature/online-arbeitsblattssuche` (Luis) | jetzt |
| --- | --- | --- | --- |
| Pfad | `/api/suche` | `/api/web-search` | `/api/suche` |
| Felder | `title`, `url`, `snippet` | zusätzlich `source`, `fileType`, `mocked`, `query`, `count` | genau Adis Felder |
| Bei Fehlern | verständlich melden | simulierte Treffer | `502/503/504` mit `message`, nie erfundene Treffer |
| Anbieter | – | Scraping DuckDuckGo/Yahoo/Bing | SearXNG (kostenlos, selbst gehostet) oder Brave (kostenpflichtig, nur nach Abstimmung) |

Für die Anzeige: Ohne eingerichteten Anbieter kommt `503` mit `code: suche_nicht_konfiguriert` und einer `message`, die sagt,
was fehlt. Adis `ApiError` zeigt `message` an – das reicht. `GET /api/suche/status` gibt `{ konfiguriert, anbieter, hinweis }`,
falls der Suchbereich vorab einen Hinweis zeigen soll.

**Abzustimmen:** ob ein Dateityp-Filter (`?fileType=pdf`) in den Vertrag soll; ob Brave (≈ 5 $ pro 1.000 Suchen) freigeschaltet wird;
ob Luis' Branch geschlossen wird.

## 3. Arbeitsblätter für Materialvorschläge (FE-19)

**Ergebnis: Die bestehenden Endpunkte reichen, keine Änderung.** Geprüft mit einem Test, der genau Adis Aufrufe nachstellt
(`tests/integration/arbeitsblaetter-routes.test.js`, Block „Vertrag für Adis Materialvorschläge“).

| Aufruf | Antwort (genutzte Felder) |
| --- | --- |
| `GET /api/arbeitsblaetter?q=<Lernziel>&berufsfeld=<Berufsfeld>&proSeite=5` | `{ eintraege: [{ id, titel, stufe, berufsfeld, … }], seite, proSeite, gesamt, seiten }` – ohne `inhalt` |
| `GET /api/arbeitsblaetter/:id` | `{ arbeitsblatt: { …, inhalt: { einleitung, aufgaben[{ nr, anweisung, optionen? }], woerterbuch[{ wort, erklaerung }], hinweisAnleiter? } } }` |
| `GET /api/arbeitsblaetter/:id/docx` | Word-Datei, `Content-Disposition` mit Dateinamen, per `Access-Control-Expose-Headers` lesbar |

- `q` sucht (Teilwort, ohne Groß-/Kleinschreibung) in Titel, Lernziel, Ausbildungsbaustein und Berufsfeld; `berufsfeld` muss exakt passen.
- `proSeite`: 1 bis zum Maximum aus `src/arbeitsblaetter/schema.js`, sonst `400`. Archivierte Blätter sind standardmäßig ausgeblendet.
- Alle drei Aufrufe brauchen das Token und sind für alle Rollen erlaubt. Der Word-Download läuft über `apiFetch` (mit Header) – passt.

## 4. Teilnehmerprofile (FE-12, FE-13)

**Ergebnis: Die Persistenz aus BE-02 (auf `main`) erfüllt die Anforderungen, keine Backend-Änderung nötig.**
Die Frontend-Anbindung liegt auf `feature/fe-12-teilnehmende-backend` (Celine, Review) und bleibt bei Adi.
Details: `docs/persistenz-teilnehmende.md`.

| Anforderung | Backend |
| --- | --- |
| Pseudonyme Kennung | Muster `^[A-Z][A-Z0-9]{1,4}-\d{1,6}$` (z. B. `IW3-4421`), Kleinschreibung wird umgewandelt; Namen, E-Mails, unbekannte Felder → `400`. Gleiches Muster wie Adis `pruefeProfil` |
| Getrennte Niveaus/Formate je Berufsbereich | Tabelle `teilnehmende_stationen`: je Berufsfeld eigene `stufe` (T/A/F/B) und `format` (`text`, `piktogramm`, `mathefrei`, `piktogramm-mathefrei`) |
| Jeder Berufsbereich nur einmal | `400` (Groß-/Kleinschreibung egal), max. 10 Bereiche |
| Neu laden | `GET /api/teilnehmende` liefert Stationen in gespeicherter Reihenfolge mit Stufe und Format zurück (Test „Pseudonyme Profile mit Niveau je Berufsbereich“) |

| Methode | Pfad | Rollen |
| --- | --- | --- |
| GET | `/api/teilnehmende`, `/api/teilnehmende/:kennung` | alle |
| POST | `/api/teilnehmende` | alle |
| PUT | `/api/teilnehmende/:kennung` (ersetzt Stufe und kompletten Lernweg) | alle |
| DELETE | `/api/teilnehmende/:kennung` | admin, dozent (Assistenz `403`) |

Hinweise für die Zusammenführung mit FE-12:

- **Kennung ändern geht nicht per PUT**: Eine abweichende `kennung` im Body gibt `400`. Der Kommentar in Celines
  `lib/teilnehmende.ts` („a new `kennung` renames the profile“) stimmt damit nicht überein – Umbenennen hieße löschen und neu anlegen.
- `speicherFehlertext` in FE-12 kennt `409` und `404`; `403` (Assistenz löscht) sollte eine eigene Meldung bekommen.
- FE-12 und `adi/frontend-trello` ändern beide `App.tsx`, `ParticipantModal.tsx`, `TeilnehmendePage.tsx` und `Seiten.spec.tsx` –
  beim Zusammenführen sind dort Konflikte zu erwarten.

## Weitere Auswirkungen der Pflicht-Anmeldung

- **E2E-Tests (Playwright, `e2e/`)** rufen die Seiten bisher ohne Anmeldung auf. Mit Adis Login-Maske und BE-06 müssen sie sich
  zuerst anmelden (Testkonto über `SEED_PASSWORT`). Das ist noch nicht angepasst.
- **Bearbeiter im Verlauf** (`autor`) kommt weiterhin aus dem Request-Body. Aus dem Token übernehmen ist BE-05.
- **Staging (OPS-01/02)**: `JWT_SECRET` (≥ 32 Zeichen), `TRUST_PROXY=1` hinter nginx und `SEED_PASSWORT` setzen.

## Lokal zusammen testen

```bash
git checkout integration/adi-frontend-backend
cp .env.example .env          # SEED_PASSWORT setzen; optional WEB_SEARCH_PROVIDER + SearXNG
docker compose up -d db
cd apps/backend && npm ci && npm run db:migrate && npm run db:seed && npm run dev
# zweites Terminal
cd apps/frontend && npm ci && npm run dev
```

Anmelden z. B. als `a.mustajbegovic@bildungspark.example` (dozent) oder `c.hager@bildungspark.example` (admin) mit `SEED_PASSWORT`.
