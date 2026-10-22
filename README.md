# dhbw-integrationsseminar.bildungspark

Arbeitsblattverwaltung für den Bildungspark Heilbronn-Franken.

> **Status (22.10.2026):** Prototyp. Docker, CI und Test-Pipeline stehen.
> Das Frontend zeigt die Seiten **Arbeitsblätter** und **KI-Erstellung**; die übrigen Menüpunkte
> sind angelegt, aber noch leer.
> **Neu: Die KI-Erstellung erzeugt echte Arbeitsblätter über das Backend** (Lernziel aus dem Lehrplan →
> Gemini → Validator → Anzeige → Word-Export; ohne API-Key im Mock-Modus) – siehe
> **[docs/prototyp-ki-arbeitsblatt.md](docs/prototyp-ki-arbeitsblatt.md)**.
> Die Seite Arbeitsblätter arbeitet weiter mit lokalen Beispieldaten; Upload-Analyse, Websuche und
> das „Anpassen“-Panel sind simuliert; die Buttons „Öffnen“, „PDF“ und „Alle zur Bibliothek
> hinzufügen“ haben noch keine Funktion. Gespeichert wird noch nichts.
>
> Die Beispieldaten stammen aus den 14 Lehrplänen des Bildungsparks (TQ Lager, Metall, Gastro).
> Was fachlich belegt ist und was Annahme bleibt, steht in **[docs/fachliche-grundlagen.md](docs/fachliche-grundlagen.md)** –
> insbesondere die Bezeichnungen der Stufen T/A/F/B und die Liste der Berufsfelder sind vom
> Bildungspark noch zu bestätigen.

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Backend | Node.js 22 · Express 4 · JavaScript (ESM) |
| Datenbank | MySQL 8.4 (utf8mb4) |
| Frontend | React 19 · TypeScript · Vite 6 · Tailwind CSS 4 |
| KI | Google Gemini über `@google/genai` (Standard `gemini-3.5-flash`, Fallback `gemini-3.5-flash-lite`; später Azure OpenAI) – austauschbar über `AI_PROVIDER`; ohne API-Key läuft ein Mock |
| Tests Backend | Vitest (Unit) · Supertest (Routen) |
| Tests Frontend | Vitest · React Testing Library |
| E2E | Playwright |
| Infrastruktur | Monorepo · Docker Compose · GitHub Actions |

---

## Schnellstart

```bash
# 1. Konfiguration anlegen
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env

# 2. Stack starten
docker compose up --build
```

| Dienst | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend Health | http://localhost:3000/api/health |
| MySQL | localhost:3307 |

Das Frontend öffnet direkt die Seite **Arbeitsblätter**. Eine Anmeldung gibt es im Prototyp
noch nicht; angezeigt wird immer die Beispielnutzerin Celine Hager (Administrator).

Ohne Docker (zwei Terminals; das Backend braucht für die KI-Routen keine MySQL):

```bash
cd apps/backend  && npm ci && npm run dev   # http://localhost:3000 – Key in apps/backend/.env
cd apps/frontend && npm ci && npm run dev   # http://localhost:5173 – leitet /api an :3000 weiter
```

**Erster Start dauert ca. 1–2 Minuten** (MySQL initialisiert, Images werden gebaut).

---

## ⚠️ Befehle einzeln ausführen

`docker compose up` **blockiert das Terminal** (läuft im Vordergrund). Mehrere
Befehle hintereinander in ein Terminal zu pasten funktioniert deshalb nicht –
der zweite wird nur getippt, nie ausgeführt.

```powershell
# FALSCH – alles landet in einer Eingabe, nur der erste Befehl läuft
docker compose up --build
docker compose --profile prod up --build frontend-prod
docker compose --profile test run --rm e2e

# RICHTIG – einzeln, und mit -d für die Langläufer
docker compose up -d --build
docker compose --profile prod up -d --build frontend-prod
docker compose --profile test run --rm e2e
```

`-d` (detached) ist beim Entwickeln fast immer richtig: das Terminal bleibt frei,
Logs kommen über `docker compose logs -f <dienst>`.

---

## Prototyp KI-Arbeitsblatt

Auf der Seite **KI-Erstellung** wählt man ein Lernziel aus den Lehrplänen des Bildungsparks, dazu
Niveaustufen (T/A/F/B), Format und Sprache. Das Backend baut daraus einen Prompt, lässt Gemini ein
Arbeitsblatt als strukturiertes JSON erzeugen, prüft es gegen ein Schema und einen regelbasierten
Validator und liefert es an das Frontend; ein Klick exportiert es als Word-Datei im Bildungspark-Stil.
Ohne `GEMINI_API_KEY` läuft derselbe Ablauf mit einer festen Beispielantwort (Mock).

| Endpunkt | Zweck |
|---|---|
| `POST /api/ai/arbeitsblatt` | `{ lernziel, stufe, format, sprache, thema?, erwartungen? }` → `{ worksheet, meta }` |
| `POST /api/ai/arbeitsblatt/docx` | `{ worksheet }` → Word-Datei |

Ablauf, Glossar, Demo-Start (mit und ohne Docker), 5-Minuten-Demo-Skript, bewusste Lücken und
Anleitung zum Ändern des Prompts: **[docs/prototyp-ki-arbeitsblatt.md](docs/prototyp-ki-arbeitsblatt.md)**.
Der Prompt selbst liegt lesbar in `apps/backend/src/arbeitsblatt/prompts/arbeitsblatt-system.md`.

---

## Ports und Profile

| Port | Dienst | Profil | Startbefehl |
|---|---|---|---|
| 5173 | Frontend (Vite, Hot Reload) | Standard | `docker compose up -d` |
| 3000 | Backend API | Standard | `docker compose up -d` |
| 3307 | MySQL | Standard | `docker compose up -d` |
| 8080 | Frontend (Nginx-Build) | `prod` | `docker compose --profile prod up -d frontend-prod` |
| 8443 | Altes React-Mockup | `legacy` | `docker compose --profile legacy up -d mockup` |

**Nur Ports der aktiven Profile sind erreichbar.** `docker compose up -d`
startet 5173, 3000 und 3307 – **nicht** 8080 und 8443. Die beiden anderen
brauchen ihr Profil ausdrücklich.

### Zu Port 3307 (MySQL)

MySQL ist **kein HTTP-Dienst**. Im Browser zeigt `localhost:3307` deshalb
nichts – das ist kein Fehler, sondern erwartet. Teste von PowerShell:

```powershell
Test-NetConnection -ComputerName localhost -Port 3307
```

Oder direkt eine Abfrage:

```powershell
docker exec bp-mysql mysql -u root -proot-dev `
  -e "SELECT @@character_set_server, DATABASE();"
```

Mit einem MySQL-Client (DBeaver, MySQL Workbench, VSCode-Extension):
Host `localhost`, Port `3307`, User `root`, Passwort `root-dev`.

### Zu Port 3000 (Backend)

`http://localhost:3000` gibt **HTTP 404** – richtig so. Es gibt keine Route
auf `/`, die API liegt unter `/api`. Nutze `http://localhost:3000/api/health`.

---

## Befehle

```bash
# --- Entwicklung ---
docker compose up -d --build         # alles starten (detached)
docker compose logs -f backend       # Backend-Log
docker compose ps                    # Status + Ports
docker compose restart backend       # Backend neu starten
docker compose stop                  # stoppen (Daten bleiben)
docker compose down                  # Container entfernen (Daten bleiben)
docker compose down -v               # + Datenbank leeren

# --- Tests (jeder Befehl startet den Stack bei Bedarf selbst) ---
docker compose --profile test run --rm backend-test
docker compose --profile test run --rm frontend-test
docker compose --profile test run --rm e2e

# --- Alles gleichzeitig (fuer die Demo) ---
docker compose --profile prod --profile legacy up -d --build
# → 5173 Dev · 8080 Prod · 8443 Mockup · 3000 API · 3307 MySQL

# --- Ohne Docker (wenn MySQL lokal laeuft) ---
npm run dev:backend
npm run dev:frontend
```

---

## Tests lokal ohne Docker

Schnellster Feedback-Loop, kein Container-Overhead:

```bash
cd apps/backend  && npm ci && npm run test:run    # Vitest + Supertest
cd apps/frontend && npm ci && npm run test:run    # Vitest + React Testing Library
cd e2e           && npm ci && npm run install:browsers && npm run test
```

Backend-Integrationstests brauchen eine MySQL. Ohne `DB_HOST` werden sie
**übersprungen statt rot** – so bleibt `npm test` auch ohne DB nutzbar.

Die E2E-Tests starten das Frontend zwar selbst (`webServer` in `playwright.config.js`),
brauchen aber ein laufendes Backend **mit** erreichbarer MySQL auf Port 3000 – der
`global-setup` bricht sonst ab. Ohne Docker also vorher `npm run dev:backend` mit lokaler MySQL.

---

## Projektstruktur

```
.
├── apps/
│   ├── backend/              Express-API (JavaScript, ESM)
│   │   ├── src/
│   │   │   ├── index.js          Server-Start (bindet den Port)
│   │   │   ├── app.js            Express-App (exportiert – Supertest lädt sie)
│   │   │   ├── config.js         Env-Konfiguration ohne Secrets
│   │   │   ├── db.js             MySQL-Pool (mysql2/promise)
│   │   │   ├── ai/
│   │   │   │   ├── provider.js   Provider-Abstraktion (Gemini ↔ Azure)
│   │   │   │   ├── gemini.js     Gemini-Adapter (@google/genai, JSON-Schema-Ausgabe)
│   │   │   │   └── azure.js      Azure-OpenAI-Adapter (ungetestet)
│   │   │   ├── arbeitsblatt/
│   │   │   │   ├── schema.js     Schema des Arbeitsblatts (zod + JSON-Schema für Gemini)
│   │   │   │   ├── prompt.js     Prompt-Builder; Regeln in prompts/arbeitsblatt-system.md
│   │   │   │   ├── generate.js   Ablauf Prompt → Gemini → prüfen → Wiederholung → Validator
│   │   │   │   ├── validator.js  Heuristiken (Satzlänge, Aufgabenanzahl, Formate, Verbotsliste)
│   │   │   │   ├── mock.js       Beispiel-Arbeitsblatt ohne API-Key
│   │   │   │   └── docx.js       Word-Export
│   │   │   └── routes/
│   │   │       ├── health.js     GET /api/health
│   │   │       ├── ai.js         GET /api/ai/status, POST /api/ai/generate
│   │   │       └── arbeitsblatt.js  POST /api/ai/arbeitsblatt, POST /api/ai/arbeitsblatt/docx
│   │   └── tests/
│   │       ├── unit/             Vitest, ohne DB (laufen immer im Mock-Modus)
│   │       ├── integration/      Supertest (+ echte MySQL für db.test.js)
│   │       └── fixtures/         Testdaten (Lernziel, Arbeitsblatt)
│   │
│   └── frontend/             Prototyp-Frontend (React + TypeScript)
│       ├── src/
│       │   ├── main.tsx          Einstieg
│       │   ├── App.tsx           Navigation und Seitenwahl
│       │   ├── types.ts          Gemeinsame Typen (Level, Format, Worksheet …)
│       │   ├── data/             Beispieldaten (aus den Lehrplänen) und Konstanten
│       │   ├── lib/              Filter, Word-Export, Datum, Simulation, api.ts (Backend-Aufrufe)
│       │   ├── components/       Wiederverwendbare Bausteine (Auswahl, Panels)
│       │   ├── layout/           Seitenleiste und Kopfzeile
│       │   └── pages/
│       │       ├── arbeitsblaetter/  Liste, Upload, Vorschau, Verlauf, Anpassen
│       │       └── ki-erstellung/    Formular, Websuche, Ergebnis (GeneratedWorksheetCard)
│       └── tests/unit/       Vitest + React Testing Library (jsdom)
│
├── e2e/                     Playwright-Tests
│   ├── playwright.config.js
│   └── tests/
│       ├── global-setup.js       Prüft die Kette VOR dem ersten Test
│       └── smoke.spec.js         Smoke-Test der Infrastruktur
│
├── docker/
│   └── mysql/
│       ├── init/01-init.sql      Datenbanken + Schema (nur beim 1. Start)
│       └── conf.d/               utf8mb4, Strict-Mode
│
├── ArbeitsblattverwaltungMockup/   Altes React/TS-Mockup aus Figma Make (nur --profile legacy)
├── docs/
│   ├── fachliche-grundlagen.md      Belegte Fakten, Annahmen, offene Fragen (Quelle für Seeds und Prompts)
│   ├── prototyp-ki-arbeitsblatt.md  Prototyp KI-Arbeitsblatt: Ablauf, Glossar, Demo-Start, Demo-Skript
│   └── user-stories-arbeitsblaetter.md   Mockup-Analyse und Ticket-Vorschlag vom 12.10.
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Wichtige Umgebungsvariablen

| Variable | Standard | Bedeutung |
|---|---|---|
| `MYSQL_PASSWORD` | `bildungspark-dev` | DB-Passwort des App-Users |
| `MYSQL_PORT` | `3307` | Host-Port (3306 ist oft belegt) |
| `DB_HOST` | `db` | **Im Compose `db`, nicht `localhost`** |
| `AI_PROVIDER` | `gemini` | `gemini` \| `azure` |
| `GEMINI_API_KEY` | leer | Ohne Key läuft KI im Mock-Modus |
| `GEMINI_MODEL` | `gemini-3.5-flash` | `gemini-2.5-flash` ist seit Oktober 2026 für neue Keys nicht mehr verfügbar |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | Wird einmalig versucht, wenn das Modell mit 503 (überlastet) antwortet |
| `AI_TIMEOUT_MS` | `60000` | Zeitlimit je Generierungsauftrag |
| `VITE_ALLOWED_HOSTS` | `true` | Erlaubt Zugriff über LAN-IP im Team |

> **Ohne `GEMINI_API_KEY` läuft die KI im Mock-Modus.** Das ist Absicht:
> So laufen Frontend, Supertest und Playwright ohne API-Key und ohne Kosten.
> Die Backend-Tests leeren den Key zusätzlich selbst (`vitest.config.js`), damit kein
> Testlauf Gemini-Kontingent verbraucht – auch wenn lokal eine `.env` liegt.

---

## KI-Provider wechseln (Gemini → Azure)

Der Aufrufer benutzt immer `generateText()`. Der Wechsel ist eine `.env`-Änderung:

```dotenv
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_DEPLOYMENT=<deployment-name>
```

Vorher das SDK installieren (`@google/genai` für Gemini ist bereits installiert):

```bash
cd apps/backend
npm i @azure/openai
```

Der Azure-Adapter ist nur strukturell vorbereitet und noch nicht gegen einen echten Tenant getestet.

---

## Fehlerbehebung

### `data directory /var/lib/mysql/ is unusable`

MySQL ist beim ersten Start mit einer ungültigen Konfiguration abgestürzt und
hat einen kaputten Datenordner im Volume hinterlassen. Das Volume muss weg:

```bash
docker compose down
docker volume rm bildungspark_mysql_data
docker compose up --build
```

### Nach einem Stack-Wechsel: alte Volumes entfernen

**Benanntes `node_modules`-Volume:** Docker kopiert beim ersten Start den Inhalt
aus dem Image in ein leeres Volume. Enthält das Volume schon Dateien aus einem
**früheren** Stack, bleiben die stehen und überschreiben die neuen Pakete. Symptom:

```
Cannot find module '@rolldown/binding-linux-x64-gnu'
  /app/node_modules/.pnpm/rolldown@1.0.0-rc.12/...
```

Das ist kein Code-Fehler, sondern ein Altlasten-Volume. Nach jedem Wechsel der
Ordnerstruktur:

```bash
docker compose down
docker volume ls --filter name=bildungspark   # pruefen, was noch da ist
docker volume rm bildungspark_frontend_react_node_modules
docker compose up --build
```

### `World-writable config file ... is ignored`

MySQL ignoriert Konfigurationsdateien, die nicht die Rechte `644` haben. Unter
Docker Desktop für Windows landen Bind-Mounts mit `777`, die `.cnf` wird dann
verworfen – **ohne Fehlermeldung im Alltag**. Deshalb liegt die MySQL-Konfig
im Image (`docker/mysql/Dockerfile`) statt als Mount.

### Frontend erreicht das Backend nicht (500)

Immer `backend:3000`, nie `localhost:3000` – `localhost` ist der eigene
Container. Steht in `VITE_PROXY_TARGET` in der `docker-compose.yml`.

### E2E-Tests finden kein `node_modules`

Das E2E-Image installiert `@playwright/test` beim Build (`e2e/Dockerfile`), ein
Volume gibt es dafür nicht. Nach Änderungen an `e2e/package.json` das Image neu bauen:

```bash
docker compose --profile test build e2e
```

### Kompletter Neustart (Daten weg)

```bash
docker compose down -v && docker compose up --build
```

---

## Noch offen

- [ ] Mapper für die Arbeitsblatt-Tabellen (`mysql2` → Repository-Layer)
- [ ] Auth (JWT) für Dozent/Assistent/Admin – `JWT_SECRET` ist bereits in der Konfiguration, wird aber noch nicht benutzt
- [x] Entscheidung: Frontend bleibt React (TypeScript), aufgebaut aus dem Mockup
- [x] `apps/frontend/package-lock.json` erzeugt und committet
- [ ] Frontend an das Backend anbinden (Arbeitsblätter, Anmeldung) – **KI-Erstellung ist angebunden (22.10.)**
- [ ] Generierte Arbeitsblätter speichern (MySQL), bearbeiten und freigeben – siehe docs/prototyp-ki-arbeitsblatt.md, Abschnitt 6
- [ ] Lehrplan-Import (96 Lernziele aus den 14 DOCX) statt der 12 Beispiel-Lernziele im Frontend
- [ ] `docker-compose.yml`: Default `GEMINI_MODEL` steht noch auf `gemini-2.5-flash` (für neue Keys nicht mehr verfügbar); solange `.env` aus `.env.example` kopiert wird, greift der dortige Wert
- [ ] Seiten Dashboard, Teilnehmende, Berichte, Benutzerverwaltung, Einstellungen
- [ ] Seite **Lehrpläne** (Projektauftrag Teilziel 3, Use Cases UC-03/UC-06) – fehlt bisher in der Navigation
- [ ] Buttons ohne Funktion: „Öffnen“/„PDF“ je Variante, „Alle zur Bibliothek hinzufügen“, „Öffnen“ bei gespeicherten Dokumenten
- [ ] Backend-Skripte `db:migrate` und `db:reset` neu anlegen (am 22.10. aus `package.json` entfernt, die Dateien existierten nie); `db:seed` ist ein Platzhalter
- [x] `@google/genai` installiert und gegen die echte API getestet (22.10.); `@azure/openai` später
- [ ] Playwright-Version in `e2e/package.json` und `e2e/Dockerfile` synchron halten (aktuell 1.49.1)
- [ ] `docker/mysql/init` nur für Erstinbetriebnahme; danach Migrationen
- [ ] Stufenbezeichnungen T/A/F/B und Liste der Berufsfelder vom Bildungspark bestätigen lassen (siehe `docs/fachliche-grundlagen.md`)
- [ ] `ArbeitsblattverwaltungMockup/src/imports/*.pdf` sind Git-LFS-Zeiger ohne hinterlegte Objekte – LFS einrichten oder Dateien entfernen

---

*Stack-Anpassung: 16.10.2026 · Bereinigung von Beispieldaten und Dokumentation: 22.10.2026 · Prototyp KI-Arbeitsblatt: 22.10.2026*
