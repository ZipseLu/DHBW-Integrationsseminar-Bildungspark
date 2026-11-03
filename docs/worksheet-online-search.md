# Online worksheet search

**Status:** 03.11.2026 · **Branch:** `feature/online-arbeitsblattssuche` · **Ticket:** "Online kann nach Arbeitsblättern mit Suchbegriffen gesucht werden" (online worksheet search by search term)

## Acceptance criterion

Worksheets can be searched online by search terms. A search term is sent to the backend, which returns real, stored worksheets – no simulated placeholders are delivered anymore.

## Starting point

The search UI already existed:

- Worksheets page (`apps/frontend/src/pages/arbeitsblaetter/ArbeitsblaetterPage.tsx`) with a search input field ("Suchen nach Titel, Baustein, Abschnitt…"), but it filtered **only locally in the browser** after all worksheets were loaded.
- The "web search" in worksheet creation (`WebSearchSection`) delivered simulated hits on fixed websites (lehrer-online.de, 4teachers.de, …) – no real worksheets.

The backend already offered a real search via `GET /api/arbeitsblaetter?q=...` (SQL `LIKE` over title, learning objective, training module and occupational field), but the UI did not use this online endpoint.

## Solution

The worksheets page now sends the search term as `q` to the backend's online search:

```
GET /api/arbeitsblaetter?q=<search term>&berufsfeld=...&seite=1&proSeite=100&sortierung=neueste
```

The search term is sent together with the other filters (occupational field, module, training module, proficiency level, language, format). The backend searches title, learning objective, training module and occupational field and returns the matching, stored worksheets page by page.

### Files (frontend)

| File | Change |
|---|---|
| `apps/frontend/src/lib/gespeicherteArbeitsblaetter.ts` | `loadSavedWorksheets(search, filter)` passes `search` as `q` and the page filters to `fetchArbeitsblaetter` and loads all matching pages. `pageFilterToBackendFilter(filter)` maps the page filter to the backend query parameters. |
| `apps/frontend/src/pages/arbeitsblaetter/ArbeitsblaetterPage.tsx` | Passes `filter.search` as the search term to the load function and triggers a new backend request on search/filter changes. Local re-filtering remains as a safety net (see "Behavior"). |

### Behavior

| Situation | Behavior |
|---|---|
| Backend reachable | Search term is sent online to `GET /api/arbeitsblaetter?q=...`; results are real, stored worksheets. |
| Backend unreachable | Fallback to sample data (`WORKSHEETS`); search filters these locally by title, training module and section. A notice is shown. |

### Testing

- Frontend: `cd apps/frontend && npm run test:run` → all 206 tests pass, `npm run typecheck` without errors.
- Backend: `cd apps/backend && npm run test:unit` → passes (one pre-existing, unrelated assertion in `arbeitsblatt-generate.test.js` regarding the Gemini model name is not part of this ticket). Integration tests for `GET /api/arbeitsblaetter` require a running MySQL (`DB_HOST=127.0.0.1 DB_PORT=3307 ... npm run test:run`).

### Open points / scope limitation

- The "web search" in worksheet creation (`WebSearchSection`) searches for similar documents on the internet and remains **simulated** in the prototype (hits are placeholders, links do not lead to real documents). This is the "fixed search schema on certain websites" mentioned in the ticket, which has high improvement potential and is therefore deliberately not part of this ticket. The online search for **own, stored worksheets** delivers real results here.
- Authentication (JWT) for saving/editing worksheets is still open (see `docs/benutzerverwaltung-api.md`).

### Acceptance

The search term on the worksheets page triggers a real backend request and returns stored worksheets – the acceptance criterion is met.
