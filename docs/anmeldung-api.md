# Anmeldung mit JWT und Rollen (BE-01)

Stand: 03.11.2026 · Trello: BE-01 · Grundlage für FE-08 (Login-Maske), FE-09 (Benutzerverwaltung), BE-05 (Bearbeiter aus der Anmeldung) und BE-06 (schreibende Endpunkte absichern)

Mitarbeitende melden sich mit E-Mail-Adresse und Passwort an (Konten aus der Benutzerverwaltung, `docs/benutzerverwaltung-api.md`).
Das Backend antwortet mit einem **Token** (JSON Web Token, kurz JWT). Das Frontend schickt es bei jedem weiteren Aufruf im Header mit:

```http
Authorization: Bearer <token>
```

## Endpunkte

| Methode | Pfad | Zweck | Antworten |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ email, passwort }` prüfen | `200 { token, ablaufAm, benutzer }`, `400`, `401 anmeldung_fehlgeschlagen`, `503` |
| GET | `/api/auth/me` | eigenes Konto (frisch aus der Datenbank) | `200 { benutzer }`, `401` |

`benutzer` hat dieselbe Form wie in der Benutzerverwaltung: `{ id, name, email, rolle, erstelltAm }` – nie ein Passwort oder Hash.

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "c.hager@bildungspark.example", "passwort": "bildungspark-demo" }
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs…",
  "ablaufAm": "2026-11-04T05:12:00.000Z",
  "benutzer": { "id": "…", "name": "Celine Hager", "email": "c.hager@bildungspark.example", "rolle": "admin", "erstelltAm": "…" }
}
```

**Abmelden** heißt: Das Frontend verwirft das Token. Das Backend führt keine Sitzungen, deshalb gibt es keinen Logout-Endpunkt.

## Was die Anmeldung schon bewirkt – und was erst mit BE-06 kommt

| Anfrage | heute (BE-01) | ab BE-06 |
| --- | --- | --- |
| ohne Token | wie bisher erlaubt (das Frontend sendet noch keins) | schreibende Endpunkte und KI: `401` |
| mit gültigem Token | `req.benutzer = { id, rolle, name }` ist gesetzt | unverändert |
| mit ungültigem oder abgelaufenem Token | `401` bei allen Routen außer `/api/health` und `/api/auth/login` | unverändert |

Mit Token greifen sofort die Regeln aus BE-03: `/api/benutzer` nur für die Rolle `admin` (sonst `403 forbidden`),
das eigene Konto lässt sich nicht löschen (`409 eigenes_konto`).

**Reihenfolge:** BE-06 erst mergen, wenn FE-08 das Token mitschickt – sonst antwortet das Backend dem Frontend überall mit `401`.

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
| 401 | `anmeldung_erforderlich` | kein Token (heute nur `/api/auth/me`) | Login-Maske |
| 403 | – (`error: forbidden`) | Rolle reicht nicht (z. B. Dozent auf `/api/benutzer`) | Menüpunkt ausblenden |

## Token

- Signiert mit **HS256** und `JWT_SECRET`; beim Prüfen ist der Algorithmus fest vorgegeben (Tokens mit `alg: none` oder anderem Verfahren werden abgelehnt).
- Inhalt: Konto-ID (`sub`), `rolle`, `name`, Ausstellungs- und Ablaufzeit – keine E-Mail, keine Passwortdaten.
- Gültig `JWT_EXPIRES_IN` lang, Standard **8 Stunden** (ein Arbeitstag).
- Die Tokens sind zustandslos: Eine geänderte Rolle oder ein gelöschtes Konto wirkt bei der nächsten Anmeldung, spätestens nach Ablauf.
  `GET /api/auth/me` liest das Konto aber immer frisch aus der Datenbank – ein gelöschtes Konto merkt das Frontend dort sofort.
- Bei unbekannter E-Mail-Adresse rechnet das Backend trotzdem einen scrypt-Vergleich, damit die Antwortzeit nicht verrät, ob es das Konto gibt.

## Frontend (`apps/frontend/src/lib/api.ts`)

| Funktion | Zweck |
| --- | --- |
| `login(email, passwort)` | meldet an, merkt sich das Token, liefert `{ token, ablaufAm, benutzer }`; falsche Daten → `ApiError` mit Status `401` und `grund: 'anmeldung_fehlgeschlagen'` |
| `fetchAktuellesKonto()` | `GET /api/auth/me` – z. B. beim Start der App, um eine Anmeldung nach dem Neuladen wiederherzustellen |
| `logout()` | verwirft das Token |
| `getAuthToken()` / `setAuthToken(token)` | Token lesen/setzen (liegt im `sessionStorage`: übersteht Neuladen, nicht das Schließen des Tabs) |
| `setAbmeldeHandler(fn)` | wird gerufen, wenn das Backend ein mitgeschicktes Token mit `401` ablehnt; das Token ist dann schon verworfen |

`apiFetch` hängt das Token automatisch an **jeden** Aufruf – die bestehenden Funktionen (Arbeitsblätter, KI, Word-Export …) brauchen keine Änderung.
Ohne Token bleiben die Aufrufe unverändert.

Skizze für FE-08:

```ts
// beim Start der App
setAbmeldeHandler(() => setUser(null)) // Token abgelaufen -> Login-Maske
if (getAuthToken()) fetchAktuellesKonto().then(setUser).catch(() => setUser(null))

// Login-Maske
const { benutzer } = await login(email, passwort) // ApiError 401 -> „E-Mail-Adresse oder Passwort ist falsch“

// Sidedrawer
logout(); setUser(null)
```

Zuordnung `Konto` → `StaffUser`: siehe Tabelle in `docs/benutzerverwaltung-api.md` (`rolle` → `role`, Initialen über `initialsOf`).

## Konten zum Ausprobieren

`npm run db:seed` (in `apps/backend`) legt die vier Beispielkonten an – Startpasswort `bildungspark-demo` bzw. `SEED_PASSWORT`,
**nur für lokale Entwicklung und Demos**:

| E-Mail | Rolle |
| --- | --- |
| `c.hager@bildungspark.example` | admin |
| `a.mustajbegovic@bildungspark.example` | dozent |
| `t.neumann@bildungspark.example` | dozent |
| `s.oturucu@bildungspark.example` | assistent |

```bash
curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"c.hager@bildungspark.example","passwort":"bildungspark-demo"}'
```

## Konfiguration

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `JWT_SECRET` | `dev-secret-bitte-aendern` | Schlüssel für die Signatur. **In Produktion (`NODE_ENV=production`) startet das Backend nur mit einem eigenen Schlüssel ab 32 Zeichen**, z. B. `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `8h` | Gültigkeit eines Tokens, z. B. `30m`, `8h`, `1d`; eine reine Zahl gilt als Sekunden. Ungültige oder nicht positive Werte verhindern den Start |

Wer `JWT_SECRET` kennt, kann Tokens für jede Rolle ausstellen – der Schlüssel gehört deshalb nur in GitHub-Secrets bzw. auf den Server (OPS-03), nie ins Repository.

**Neue Abhängigkeit `jsonwebtoken`:** Ohne Docker reicht `npm ci` in `apps/backend`. Mit Docker liegt `node_modules`
in einem benannten Volume, das neue Pakete nicht von selbst bekommt – einmal `docker compose exec backend npm ci`
ausführen (oder Volume löschen und `docker compose up --build`, siehe README „alte Volumes entfernen“).
Symptom sonst: `Cannot find package 'jsonwebtoken'`.

## Bewusste Grenzen (Prototyp)

- **Bis BE-06 ist die API ohne Token offen** – auch `/api/benutzer`: Ohne Token kann jede/r die Kontenliste lesen und Konten anlegen,
  auch mit Rolle `admin`, und sich damit anmelden. Die Rollenprüfung greift nur, wenn ein Token mitkommt.
  **BE-06 muss deshalb auch `/api/benutzer` ohne Token mit `401` sperren** (erstes Admin-Konto über `npm run db:seed` oder direkt in der Datenbank),
  und der Staging-Server (OPS-01) sollte erst danach öffentlich erreichbar sein – oder bis dahin hinter einem Zugangsschutz des Webservers liegen.

- Kein Rate-Limit für Login-Versuche – kommt mit BE-06 (zusammen mit dem Limit für KI-Aufrufe).
- Token im `sessionStorage`: Ein eingeschleustes Skript (XSS) könnte es lesen. React escaped Ausgaben; für den Prototyp akzeptiert.
- Kein „Passwort vergessen“: Admins setzen Passwörter in der Benutzerverwaltung zurück (`PATCH /api/benutzer/:id`).

## Tests

- `tests/unit/auth.test.js` – Token (Ablauf, fremder Schlüssel, `alg: none`, anderer Algorithmus), Middleware, Rollenprüfung, Schlüssel in Produktion; ohne Datenbank
- `tests/integration/auth-routes.test.js` – Login, `/me`, gelöschtes Konto, Rollen in der Benutzerverwaltung; gegen MySQL
- `apps/frontend/tests/unit/apiClient.spec.ts` – Token im Header, Abmelden bei `401`, falsches Passwort
