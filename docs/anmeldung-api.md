# Anmeldung mit JWT und Rollen (BE-01, BE-06)

Stand: 13.11.2026 · Trello: BE-01, BE-06 · Grundlage für FE-08 (Login-Maske), FE-09 (Benutzerverwaltung) und BE-05 (Bearbeiter aus der Anmeldung)

Mitarbeitende melden sich mit E-Mail-Adresse und Passwort an (Konten aus der Benutzerverwaltung, `docs/benutzerverwaltung-api.md`).
Das Backend antwortet mit einem **Token** (JSON Web Token, kurz JWT). Das Frontend schickt es bei jedem weiteren Aufruf im Header mit:

```http
Authorization: Bearer <token>
```

## Endpunkte

| Methode | Pfad | Zweck | Antworten |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password }` prüfen | `200 { token, expiresIn, user, ablaufAm, benutzer }`, `400`, `401 anmeldung_fehlgeschlagen`, `429`, `503` |
| GET | `/api/auth/me` | eigenes Konto (frisch aus der Datenbank) | `200 { user, benutzer }`, `401` |

### Login

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "c.hager@bildungspark.example", "password": "<Startpasswort aus SEED_PASSWORT>" }
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs…",
  "expiresIn": 28800,
  "user": { "id": "…", "name": "Celine Hager", "email": "c.hager@bildungspark.example", "role": "admin" },
  "ablaufAm": "2026-11-13T18:12:00.000Z",
  "benutzer": { "id": "…", "name": "Celine Hager", "email": "c.hager@bildungspark.example", "rolle": "admin", "erstelltAm": "…" }
}
```

| Feld | Bedeutung |
| --- | --- |
| `token` | JWT für den `Authorization`-Header |
| `expiresIn` | Gültigkeit in Sekunden, ganzzahlig, höchstens `86400` (Standard `28800` = 8 Stunden) |
| `user` | `{ id, name, email, role }`, `role` ∈ `admin`, `dozent`, `assistent` – Vertrag des Frontends (FE-08) |
| `ablaufAm`, `benutzer` | ursprünglicher BE-01-Vertrag (Ablauf als ISO-Zeit, Konto mit `rolle` und `erstelltAm`), bleibt für Abwärtskompatibilität |

Das Passwort darf als `password` (Frontend) oder `passwort` (BE-01) kommen, aber nicht beides gleichzeitig (`400`).
Antworten enthalten nie ein Passwort oder einen Hash.

**Abmelden** heißt: Das Frontend verwirft das Token. Das Backend führt keine Sitzungen, deshalb gibt es keinen Logout-Endpunkt
und keinen serverseitigen Widerruf.

## Zugriffsschutz und Rollen (BE-06)

**Jede API-Route verlangt ein gültiges Token**, außer `GET /api/health` und `POST /api/auth/login`. Ohne Token oder mit
ungültigem Token antwortet das Backend mit `401` (auch für unbekannte Pfade, damit nicht erkennbar ist, welche Routen es gibt).
Die Prüfung läuft vor der Datenbank.

| Bereich | admin | dozent | assistent |
| --- | --- | --- | --- |
| Arbeitsblätter lesen, suchen, Word-Download, Verlauf | ja | ja | ja |
| Arbeitsblätter speichern, Inhalt bearbeiten, Favorit | ja | ja | ja |
| Status ändern (`PATCH` mit `status`: freigeben, zurück auf Entwurf, archivieren) | ja | ja | `403` |
| Archivieren (`DELETE /api/arbeitsblaetter/:id`) | ja | ja | `403` |
| Endgültig löschen (`DELETE …?endgueltig=true`) | ja | `403` | `403` |
| KI-Erstellung, Word-Export, Lehrpläne, Online-Suche | ja | ja | ja |
| Teilnehmerprofile lesen, anlegen, ändern | ja | ja | ja |
| Teilnehmerprofile löschen | ja | ja | `403` |
| Benutzerverwaltung (`/api/benutzer`) | ja | `403` | `403` |

Die Rechte der Rolle Assistent/in sind fachlich noch nicht bestätigt (`docs/fachliche-grundlagen.md`, offene Frage 5).
Die Tabelle ist ein **Vorschlag**: Freigeben und Löschen bleiben bei Dozent/in und Admin, wie in `docs/persistenz-arbeitsblaetter.md`
für FE-10 beschrieben. Änderungen betreffen nur `src/auth/rollen.js` und die Router.

Die Rollenanzeige im Browser ersetzt diese Prüfung nicht: Das Backend prüft jede Anfrage selbst.

### Rate-Limits

| Was | Grenze (Standard) | Antwort |
| --- | --- | --- |
| Fehlgeschlagene Logins pro IP | 10 in 15 Minuten; erfolgreiche Logins zählen nicht | `429 zu_viele_anmeldeversuche` |
| KI-Generierungen (`POST /api/ai/arbeitsblatt`, `/api/ai/generate`) pro Konto | 30 in 10 Minuten | `429 zu_viele_ki_anfragen` |

Die Zähler liegen im Arbeitsspeicher (Neustart setzt sie zurück). Hinter einem Reverse Proxy `TRUST_PROXY=1` setzen,
sonst zählt das Backend alle Anfragen für die IP des Proxys.

## Fehlercodes

Fehlerantworten haben die Form `{ error, code, message }`; bei `401` steht zusätzlich der Header `WWW-Authenticate: Bearer`.
Im Frontend landet `error` in `ApiError.code` (Fehlerart) und `code` in `ApiError.grund` (genauer Grund, z. B. `token_abgelaufen`).

| Status | `code` | Bedeutung | Frontend |
| --- | --- | --- | --- |
| 400 | – (`error: validation_error`) | E-Mail oder Passwort fehlt, unbekannte Felder | Meldung anzeigen |
| 401 | `anmeldung_fehlgeschlagen` | E-Mail oder Passwort falsch (bewusst nicht unterschieden) | Meldung in der Login-Maske |
| 401 | `token_abgelaufen` | Token älter als `JWT_EXPIRES_IN` | neu anmelden |
| 401 | `token_ungueltig` | Token kaputt, gefälscht oder falsches Header-Format | neu anmelden |
| 401 | `konto_unbekannt` | Konto wurde nach der Anmeldung gelöscht (nur `/api/auth/me`) | neu anmelden |
| 401 | `anmeldung_erforderlich` | kein Token (jede Route außer Health und Login) | Login-Maske |
| 429 | `zu_viele_anmeldeversuche` / `zu_viele_ki_anfragen` | Rate-Limit erreicht | Meldung, später erneut |
| 403 | – (`error: forbidden`) | Rolle reicht nicht (z. B. Dozent auf `/api/benutzer`) | Menüpunkt ausblenden |

## Token

- Signiert mit **HS256** und `JWT_SECRET`; beim Prüfen ist der Algorithmus fest vorgegeben (Tokens mit `alg: none` oder anderem Verfahren werden abgelehnt).
- Inhalt: Konto-ID (`sub`), `rolle`, `name`, Ausstellungs- und Ablaufzeit – keine E-Mail, keine Passwortdaten.
- Gültig `JWT_EXPIRES_IN` lang, Standard **8 Stunden** (ein Arbeitstag), höchstens **1 Tag** – längere Werte verhindern den Start.
- Die Tokens sind zustandslos: Eine geänderte Rolle oder ein gelöschtes Konto wirkt bei der nächsten Anmeldung, spätestens nach Ablauf.
  `GET /api/auth/me` liest das Konto aber immer frisch aus der Datenbank – ein gelöschtes Konto merkt das Frontend dort sofort.
- Bei unbekannter E-Mail-Adresse rechnet das Backend trotzdem einen scrypt-Vergleich, damit die Antwortzeit nicht verrät, ob es das Konto gibt.

## Frontend

Die Frontend-Anbindung (Login-Maske, Token im Arbeitsspeicher, `Authorization`-Header, Abmelden bei `401`) liegt auf
`adi/frontend-trello` (`apps/frontend/src/lib/auth.ts`, `session.ts`, `api.ts`) und nutzt `token`, `expiresIn` und `user`.
Die ursprüngliche BE-01-Anbindung in `lib/api.ts` (Token im `sessionStorage`) wurde **nicht** übernommen, damit sich die beiden
Varianten nicht überschneiden; sie liegt weiter auf `feature/be-01-anmeldung`.

## Konten zum Ausprobieren

`npm run db:seed` (in `apps/backend`) legt die vier Beispielkonten an – Startpasswort aus `SEED_PASSWORT` (ohne die Variable: zufällig, steht einmal im Log; siehe OPS-07),
**nur für lokale Entwicklung und Demos**:

| E-Mail | Rolle |
| --- | --- |
| `c.hager@bildungspark.example` | admin |
| `a.mustajbegovic@bildungspark.example` | dozent |
| `t.neumann@bildungspark.example` | dozent |
| `s.oturucu@bildungspark.example` | assistent |

```bash
curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"c.hager@bildungspark.example","password":"<Startpasswort>"}'
```

## Konfiguration

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `JWT_SECRET` | `dev-secret-bitte-aendern` | Schlüssel für die Signatur. **In Produktion (`NODE_ENV=production`) startet das Backend nur mit einem eigenen Schlüssel ab 32 Zeichen**, z. B. `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `8h` | Gültigkeit eines Tokens, z. B. `30m`, `8h`, `1d`; eine reine Zahl gilt als Sekunden. Ungültige, nicht positive oder Werte über `1d` verhindern den Start |
| `RATE_LIMIT_LOGIN_MAX` / `RATE_LIMIT_LOGIN_WINDOW_MS` | `10` / `900000` | fehlgeschlagene Logins pro IP und Zeitfenster |
| `RATE_LIMIT_KI_MAX` / `RATE_LIMIT_KI_WINDOW_MS` | `30` / `600000` | KI-Generierungen pro Konto und Zeitfenster |
| `TRUST_PROXY` | `0` | Anzahl Reverse-Proxys vor dem Backend (Staging hinter nginx: `1`) |

Wer `JWT_SECRET` kennt, kann Tokens für jede Rolle ausstellen – der Schlüssel gehört deshalb nur in GitHub-Secrets bzw. auf den Server (OPS-03), nie ins Repository.

**Neue Abhängigkeit `jsonwebtoken`:** Ohne Docker reicht `npm ci` in `apps/backend`. Mit Docker liegt `node_modules`
in einem benannten Volume, das neue Pakete nicht von selbst bekommt – einmal `docker compose exec backend npm ci`
ausführen (oder Volume löschen und `docker compose up --build`, siehe README „alte Volumes entfernen“).
Symptom sonst: `Cannot find package 'jsonwebtoken'`.

## Bewusste Grenzen (Prototyp)

- Token-Widerruf gibt es nicht: Ein gestohlenes Token gilt bis zum Ablauf. Rolle geändert oder Konto gelöscht → wirkt spätestens nach Ablauf;
  `GET /api/auth/me` merkt ein gelöschtes Konto sofort.
- Rate-Limits nur im Arbeitsspeicher eines Prozesses.
- Kein „Passwort vergessen“: Admins setzen Passwörter in der Benutzerverwaltung zurück (`PATCH /api/benutzer/:id`).
- Das erste Admin-Konto entsteht über `npm run db:seed` oder direkt in der Datenbank – ohne Token lässt sich keines anlegen.
- Der Bearbeiter im Verlauf (`autor`) kommt noch aus dem Request-Body, nicht aus dem Token – das ist BE-05.

## Tests

- `tests/unit/auth.test.js` – Token (Ablauf, fremder Schlüssel, `alg: none`, anderer Algorithmus), Middleware, Rollenprüfung, Schlüssel in Produktion; ohne Datenbank
- `tests/integration/auth-routes.test.js` – Login, `/me`, gelöschtes Konto, Rollen in der Benutzerverwaltung; gegen MySQL
- `tests/integration/zugriffsschutz.test.js` – `401` ohne/mit ungültigem Token für alle Routen, Rollen (`403`), KI-Rate-Limit; ohne Datenbank
- `tests/helpers/auth.js` – signiert Test-Tokens je Rolle für die übrigen Routentests
