# Web search for worksheets (real Google search)

**Status:** 03.11.2026 · **Branch:** `feature/online-arbeitsblattssuche` · **Ticket:** "Online kann nach Arbeitsblättern mit Suchbegriffen gesucht werden"

## Acceptance criterion

Worksheets can be searched online by search terms. The frontend sends the search term to the backend (`GET /api/web-search?q=...`), which performs a **real web search** via Google Custom Search JSON API (or SerpApi) and returns structured results – titles, URLs, snippets, source and file type (PDF, DOCX, …).

Without an API key, the backend runs in **mock mode** and returns simulated placeholders. To get real Google results, you must configure the Google Custom Search JSON API (see below).

## Three providers

| Provider | Endpoint | Required env vars | Results |
|---|---|---|---|
| `mock` (default) | none | none | Simulated placeholders, no real web search |
| `serpapi` | `https://serpapi.com/search.json` | `WEB_SEARCH_API_KEY` | Real web results |
| `google` | `https://www.googleapis.com/customsearch/v1` | `WEB_SEARCH_API_KEY` + `WEB_SEARCH_ENGINE_ID` | **Real Google results** |

## Setup: Echte Google-Suche (Google Custom Search JSON API)

Damit die Suche wirklich im Web über Google sucht (nicht nur in bestimmten Seiten oder der Datenbank), müssen Sie die Google Custom Search JSON API einrichten:

### Schritt 1: Google Cloud Projekt erstellen

1. Gehen Sie auf die [Google Cloud Console](https://console.cloud.google.com/)
2. Erstellen Sie ein neues Projekt (oder wählen Sie ein bestehendes)
3. Aktivieren Sie die **Custom Search API**:
   - APIs & Dienste → Bibliothek → "Custom Search API" suchen und aktivieren

### Schritt 2: API Key erstellen

1. APIs & Dienste → Zugangsdaten → Anmeldeinformationen erstellen → API Key
2. Kopieren Sie den Key in die `.env`: `WEB_SEARCH_API_KEY=<Ihr-Key>`

### Schritt 3: Programmierte Suchmaschine (Search Engine) erstellen

1. Gehen Sie auf [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Erstellen Sie eine neue Suchmaschine
3. Unter "Suchen in" können Sie "Das gesamte Web" wählen (dann suchen Sie wirklich im ganzen Web, nicht nur auf bestimmten Seiten)
4. Kopieren Sie die **Suchmaschinen-ID** (Search Engine ID) in die `.env`: `WEB_SEARCH_ENGINE_ID=<Ihre-ID>`

### Schritt 4: `.env` konfigurieren

```dotenv
WEB_SEARCH_PROVIDER=google
WEB_SEARCH_API_KEY=<Ihr-API-Key-von-Schritt-2>
WEB_SEARCH_ENGINE_ID=<Ihre-Suchmaschinen-ID-von-Schritt-3>
WEB_SEARCH_MAX_RESULTS=10
```

### Schritt 5: Docker neu bauen und starten

```bash
docker compose down
docker compose up -d --build
```

Die `WEB_SEARCH_*` Variablen werden aus der Root-`.env` in den Backend-Container durchgereicht (siehe `docker-compose.yml`).

## Kosten

Die Google Custom Search JSON API hat ein **kostenloses Kontingent** (100 Abfragen pro Tag). Danach fällt eine Gebühr pro 1.000 Abfragen an. Details: [Google Cloud Pricing](https://cloud.google.com/custom-search/docs/overview#pricing)

## Suchoperatoren (Google-Hacks)

Die Suchanfrage wird 1:1 an die Google API übergeben, daher funktionieren Suchoperatoren:

| Operator | Beispiel | Wirkung |
|---|---|---|
| `filetype:` | `Gemüse schneiden filetype:pdf` | Nur PDF/DOCX |
| `intitle:` | `intitle:"Arbeitsblatt"` | Nur in Titeln suchen |
| `"..."` | `"Kochen lernen"` | Exakte Wortgruppe |

Beispiel-Request:
```
GET /api/web-search?q=Gemüse+schneiden+filetype:pdf
```

## Frontend-Verhalten

| Situation | Anzeige im Frontend |
|---|---|
| `WEB_SEARCH_PROVIDER=mock` (Standard) | Gelber Hinweis: "Simulierte Treffer (Mock-Modus)" |
| Echte Google-Suche konfiguriert | Grün: "Echte Websuchergebnisse vom Backend" |
| Backend nicht erreichbar | Lokale simulierte Treffer als Fallback |

## Testen

- Backend: `cd apps/backend && npm run test:unit` → alle Web-Search-Tests grün
- Frontend: `cd apps/frontend && npm run test:run` → alle 206 Tests grün, `npm run typecheck` sauber
- Manuell mit Docker: `docker compose up -d --build`, dann auf `http://localhost:5173` → KI-Erstellung → Websuche
