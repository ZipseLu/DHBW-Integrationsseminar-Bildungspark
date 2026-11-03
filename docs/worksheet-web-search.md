# Web search for worksheets

**Status:** 03.11.2026 · **Branch:** `feature/online-arbeitsblattssuche` · **Ticket:** "Online kann nach Arbeitsblättern mit Suchbegriffen gesucht werden"

## Acceptance criterion

Worksheets can be searched online by search terms. The frontend sends the search term to the backend, which performs a real web search (via SerpApi or Google Custom Search JSON API) and returns structured results – titles, URLs, snippets, source and file type (PDF, DOCX, …).

## Starting point

The "web search" in worksheet creation (`WebSearchSection`) previously delivered only **simulated placeholders** (`simulateWebResults`) with fake URLs that lead nowhere. No real web search was performed.

## Solution

The frontend calls the backend endpoint `GET /api/web-search?q=...`, which in turn calls a real search API:

| Provider | Endpoint | Required env vars | Cost |
|---|---|---|---|
| `mock` (default) | – | none | Free, simulated results |
| `serpapi` | `https://serpapi.com/search.json` | `WEB_SEARCH_API_KEY` | Free tier, then paid |
| `google` | `https://www.googleapis.com/customsearch/v1` | `WEB_SEARCH_API_KEY`, `WEB_SEARCH_ENGINE_ID` | Free tier (100 queries/day), then paid |

Search operators (Google-style) are passed through as part of the `q` parameter:

| Operator | Example | Effect |
|---|---|---|
| `filetype:` | `Gabelstapler filetype:pdf` | Limits to the given file type |
| `intitle:` | `intitle:"Arbeitsblatt"` | Searches only in titles |
| `"..."` | `"Kochen lernen"` | Exact phrase match |

### Files (backend)

| File | Purpose |
|---|---|
| `apps/backend/src/web-search/service.js` | `searchWeb(query)` – dispatches to mock / SerpApi / Google, extracts `fileType` from URLs |
| `apps/backend/src/web-search/schema.js` | Zod validation for the `q` query parameter |
| `apps/backend/src/routes/web-search.js` | `GET /api/web-search?q=...` – returns `{ query, results[], count }` |
| `apps/backend/src/config.js` | `config.webSearch` – provider, API key, engine ID, max results |
| `apps/backend/src/app.js` | Registers `webSearchRouter` at `/api/web-search` |

### Files (frontend)

| File | Purpose |
|---|---|
| `apps/frontend/src/lib/webSearch.ts` | `searchWebResults(query)` – calls `GET /api/web-search`, falls back to local mocks if backend is unreachable |
| `apps/frontend/src/pages/ki-erstellung/WebSearchSection.tsx` | Calls `searchWebResults` instead of local `simulateWebResults`; displays `fileType` for each result |
| `apps/frontend/src/types.ts` | `WebResult.fileType?: string` |

### Behavior

| Situation | Behavior |
|---|---|
| `WEB_SEARCH_PROVIDER=mock` (default) | Simulated but structurally real results; no API key, no costs |
| `WEB_SEARCH_PROVIDER=serpapi` + key | Real SerpApi search; results from the live web |
| `WEB_SEARCH_PROVIDER=google` + key + engine ID | Real Google Custom Search; results from the live web |
| Backend unreachable | Frontend falls back to local simulated results |

### Testing

- Backend: `cd apps/backend && npm run test:unit` → all tests pass (10 web-search tests + existing suite; one pre-existing unrelated failure in `arbeitsblatt-generate.test.js` regarding the Gemini model name).
- Frontend: `cd apps/frontend && npm run test:run` → all 206 tests pass, `npm run typecheck` without errors.

### Example

```
GET /api/web-search?q=Gabelstapler+Sicherheit+filetype:pdf
```

Response:
```json
{
  "query": "Gabelstapler Sicherheit filetype:pdf",
  "results": [
    {
      "title": "Arbeitsblatt: Gabelstapler Sicherheit",
      "url": "https://example.de/arbeitsblatt.pdf",
      "snippet": "Direkt downloadbares Arbeitsblatt …",
      "source": "example.de",
      "fileType": "pdf"
    }
  ],
  "count": 1
}
```

## Open points

- Downloading the found PDF/DOCX files (Ansatz B from your Python example) is not yet implemented – only the search results (URLs) are returned. Download would be a separate step.
- Authentication (JWT) for saving web-found worksheets to the library is still open.
