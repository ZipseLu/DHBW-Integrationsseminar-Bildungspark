# Web search for worksheets (no API, no Cloud)

**Status:** 03.11.2026 · **Branch:** `feature/online-arbeitsblattssuche` · **Ticket:** "Online kann nach Arbeitsblättern mit Suchbegriffen gesucht werden"

## Acceptance criterion

Worksheets can be searched online by search terms. The frontend sends the search term to the backend (`GET /api/web-search?q=...`), which performs a **real web search** via DuckDuckGo HTML scraping and returns structured results – titles, URLs, snippets, source and file type (PDF, DOCX, …).

**No API key, no Cloud account, no Google Custom Search needed.**

## Two modes

| Mode | Env var `WEB_SEARCH_PROVIDER` | API-Key needed? | Results |
|---|---|---|---|
| `scrape` (default) | `scrape` | No | Real web results via DuckDuckGo HTML scraping |
| `mock` | `mock` | No | Simulated placeholders (no internet needed) |

## How it works

The backend fetches `https://html.duckduckgo.com/html/?q=<Suchbegriff>` and parses the result links, titles and snippets from the HTML. Search operators like `filetype:pdf`, `intitle:` or `"exact phrase"` are passed through as part of the query.

If DuckDuckGo is unreachable or blocks the request, the backend automatically falls back to simulated mock results so the UI keeps working.

## Configuration (`.env`)

```dotenv
WEB_SEARCH_PROVIDER=scrape   # scrape | mock
WEB_SEARCH_MAX_RESULTS=10
```

No other variables needed. The variables are passed to the backend container via `docker-compose.yml`.

## Example

```
GET /api/web-search?q=Gemüse+schneiden+filetype:pdf
```

Response:
```json
{
  "query": "Gemüse schneiden filetype:pdf",
  "results": [
    {
      "title": "Arbeitsblatt: Gemüse schneiden",
      "url": "https://lehrer-online.de/...",
      "snippet": "Direkt downloadbares Arbeitsblatt …",
      "source": "lehrer-online.de",
      "fileType": "pdf",
      "mocked": false
    }
  ],
  "count": 1
}
```

## Frontend behaviour

| Situation | Display in frontend |
|---|---|
| `WEB_SEARCH_PROVIDER=scrape`, DuckDuckGo works | Real web results (`mocked: false`) |
| `WEB_SEARCH_PROVIDER=mock` | Simulated results, yellow hint: "Simulated results (mock mode)" |
| DuckDuckGo unreachable/blocked | Automatic fallback to simulated results (`mocked: true`) |

## Testing

- Backend: `cd apps/backend && npm run test:unit` → all web-search tests pass
- Frontend: `cd apps/frontend && npm run test:run` → all 206 tests pass, `npm run typecheck` clean

## Open points

- Downloading the found PDF/DOCX files is not yet implemented – only the search results (URLs) are returned. Download would be a separate step.
- DuckDuckGo may rate-limit or block scraping from a server IP. In that case the mock fallback kicks in automatically.
