# dhbw-integrationsseminar.bildungspark

Arbeitsblattverwaltung für den Bildungspark Heilbronn-Franken.

> **Status:** Prototyp. Docker, CI und Test-Pipeline stehen.
> Das Frontend zeigt die Seiten **Arbeitsblätter** und **KI-Erstellung** mit lokalen
> Beispieldaten; die übrigen Menüpunkte sind angelegt, aber noch leer.
> KI-Analyse, Websuche und Varianten-Erzeugung sind im Frontend simuliert.

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Backend | Node.js 22 · Express 4 · JavaScript (ESM) |
| Datenbank | MySQL 8.4 (utf8mb4) |
| Frontend | React 19 · TypeScript · Vite 6 · Tailwind CSS 4 |
| KI | Gemini Flash (später Azure OpenAI) – austauschbar über `AI_PROVIDER` |
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

Ohne Docker reicht für das Frontend allein:

```bash
cd apps/frontend
npm install
npm run dev        # http://localhost:5173
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
│   │   │   │   ├── gemini.js     Gemini-Adapter
│   │   │   │   └── azure.js      Azure-OpenAI-Adapter
│   │   │   └── routes/
│   │   │       ├── health.js     GET /api/health
│   │   │       └── ai.js         GET /api/ai/status, POST /api/ai/generate
│   │   └── tests/
│   │       ├── unit/             Vitest, ohne DB
│   │       └── integration/      Supertest + echte MySQL
│   │
│   └── frontend/             Prototyp-Frontend (React + TypeScript)
│       ├── src/
│       │   ├── main.tsx          Einstieg
│       │   ├── App.tsx           Navigation und Seitenwahl
│       │   ├── types.ts          Gemeinsame Typen (Level, Format, Worksheet …)
│       │   ├── data/             Beispieldaten und Konstanten
│       │   ├── lib/              Filter, Word-Export, Datum, Simulation
│       │   ├── components/       Wiederverwendbare Bausteine (Auswahl, Panels)
│       │   ├── layout/           Seitenleiste und Kopfzeile
│       │   └── pages/
│       │       ├── arbeitsblaetter/  Liste, Upload, Vorschau, Verlauf, Anpassen
│       │       └── ki-erstellung/    Formular, Websuche, Ergebnis
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
├── ArbeitsblattverwaltungMockup/   Altes React/TS-Mockup (nur --profile legacy)
├── docs/                            User Stories & Tickets
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
| `VITE_ALLOWED_HOSTS` | `true` | Erlaubt Zugriff über LAN-IP im Team |

> **Ohne `GEMINI_API_KEY` läuft die KI im Mock-Modus.** Das ist Absicht:
> So laufen Frontend, Supertest und Playwright ohne API-Key und ohne Kosten.

---

## KI-Provider wechseln (Gemini → Azure)

Der Aufrufer benutzt immer `generateText()`. Der Wechsel ist eine `.env`-Änderung:

```dotenv
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_DEPLOYMENT=<deployment-name>
```

Vorher das SDK installieren:

```bash
cd apps/backend
npm i @azure/openai     # bzw. npm i @google/genai für Gemini
```

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

Das Volume `bildungspark_e2e_node_modules` muss existieren. Prüfen:

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
- [ ] Auth (JWT) für Dozent/Assistent/Admin
- [x] Entscheidung: Frontend bleibt React (TypeScript), aufgebaut aus dem Mockup
- [ ] `apps/frontend/package-lock.json` erzeugen und committen (`npm install` im Ordner)
- [ ] Frontend an das Backend anbinden (Arbeitsblätter, Anmeldung, KI-Erstellung)
- [ ] Seiten Dashboard, Teilnehmende, Berichte, Benutzerverwaltung, Einstellungen
- [ ] Playwright-Version in `e2e/package.json` und `docker-compose.yml` synchron halten
- [ ] `docker/mysql/init` nur für Erstinbetriebnahme; danach Migrationen

---

*Stack-Anpassung: 16.10.2026*
