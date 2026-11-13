# Online-Suche nach Lehrmaterial (FE-14)

Stand: 13.11.2026 · Trello: FE-14 (Frontend, Adi), Backend-Karte „Online Suche nach bestehenden Arbeitsblättern“

`GET /api/suche?q=…` liefert **echte Suchtreffer** aus dem Internet. Es gibt keinen Mock-Modus und keinen Rückfall auf
erfundene Treffer: Ist kein Anbieter eingerichtet oder fällt er aus, kommt eine verständliche Fehlermeldung.
Die Route verlangt wie alle API-Routen eine Anmeldung (`docs/anmeldung-api.md`).

## Vertrag

```http
GET /api/suche?q=Holz%20bearbeiten
Authorization: Bearer <token>
```

```json
{
  "results": [
    { "title": "Holz bearbeiten – Arbeitsblatt", "url": "https://example.org/holz.pdf", "snippet": "Kurze Beschreibung" }
  ]
}
```

- `q`: 1–200 Zeichen (Leerzeichen am Rand werden entfernt), sonst `400 validation_error`.
- Höchstens `WEB_SEARCH_MAX_RESULTS` Treffer (Standard 10, maximal 20). Keine Treffer → `200 { "results": [] }`.
- Nur `http`/`https`-URLs ohne eingebettete Zugangsdaten, keine Dubletten, Titel und Snippet ohne HTML-Tags.
- Das Backend lädt die gefundenen Dateien nicht herunter.

`GET /api/suche/status` → `{ konfiguriert, anbieter, hinweis }` (ohne Schlüssel), z. B. für eine Meldung im Frontend.

### Fehler

Form: `{ error, code, message }` – `message` ist für die Anzeige gedacht.

| Status | `code` | Bedeutung |
| --- | --- | --- |
| 400 | – (`error: validation_error`) | Suchbegriff fehlt oder zu lang |
| 401 | `anmeldung_erforderlich`, `token_*` | nicht angemeldet |
| 429 | `zu_viele_suchanfragen` | mehr als `RATE_LIMIT_SUCHE_MAX` Suchen pro Konto in 10 Minuten |
| 502 | `suchanbieter_nicht_erreichbar`, `suchanbieter_zugang`, `suchanbieter_fehler` | Anbieter nicht erreichbar, Schlüssel abgelehnt, falsche Antwort |
| 503 | `suche_nicht_konfiguriert` | kein Anbieter eingerichtet – `message` nennt, was fehlt |
| 503 | `suchanbieter_limit` | Anbieter meldet zu viele Anfragen |
| 504 | `suchanbieter_timeout` | Anbieter langsamer als `WEB_SEARCH_TIMEOUT_MS` |

## Anbieter

| `WEB_SEARCH_PROVIDER` | Kosten | Einrichtung |
| --- | --- | --- |
| leer (Standard) | – | Suche aus, `503 suche_nicht_konfiguriert` |
| `searxng` | kostenlos | eigene [SearXNG](https://docs.searxng.org/)-Instanz, `SEARXNG_URL` |
| `brave` | **kostenpflichtig** | [Brave Search API](https://brave.com/search/api/), `BRAVE_SEARCH_API_KEY` **und** `WEB_SEARCH_KOSTENPFLICHTIG_ERLAUBT=true` |

Stand der Recherche (13.11.2026): Einen kostenlosen offiziellen Websuch-Dienst gibt es nicht mehr.
Brave hat den Gratis-Tarif abgeschafft (Kreditkarte nötig, etwa 5 $ pro 1.000 Anfragen, monatliches Guthaben nur mit
Quellenhinweis), die Google Custom Search JSON API nimmt keine Neukunden an und wird zum 1.1.2027 abgeschaltet.
**Brave deshalb erst nach Abstimmung im Team freischalten** – ohne `WEB_SEARCH_KOSTENPFLICHTIG_ERLAUBT=true` bleibt die Suche aus,
auch wenn ein Schlüssel gesetzt ist.

SearXNG ist eine Open-Source-Metasuche: Die eigene Instanz fragt ihrerseits Suchmaschinen ab (z. B. DuckDuckGo, Wikipedia).
Für eine kleine private Instanz ist das üblich, die Nutzungsbedingungen der abgefragten Suchmaschinen gelten trotzdem –
das sollte das Team vor dem Einsatz beim Bildungspark kurz bewerten.

### SearXNG lokal (Docker)

```bash
# .env: SEARXNG_SECRET setzen (openssl rand -hex 32) und WEB_SEARCH_PROVIDER=searxng
docker compose --profile suche up -d searxng
docker compose up -d backend   # übernimmt WEB_SEARCH_PROVIDER; SEARXNG_URL ist im Compose-Netz http://searxng:8080
```

`docker/searxng/settings.yml` schaltet das JSON-Format ein (Pflicht), den Bot-Limiter aus und SafeSearch auf „moderat“.
Ohne Docker: `SEARXNG_URL=http://localhost:8888`.

Prüfen: `GET /api/suche/status` → `"konfiguriert": true`.

## Konfiguration

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `WEB_SEARCH_PROVIDER` | leer | `searxng` oder `brave` |
| `SEARXNG_URL` | leer (Compose: `http://searxng:8080`) | Basis-URL der SearXNG-Instanz |
| `SEARXNG_SECRET` | leer | Schlüssel der SearXNG-Instanz (nur für den Container) |
| `BRAVE_SEARCH_API_KEY` | leer | Schlüssel für Brave; nie ins Repository |
| `WEB_SEARCH_KOSTENPFLICHTIG_ERLAUBT` | `false` | muss `true` sein, damit Brave benutzt wird |
| `WEB_SEARCH_MAX_RESULTS` | `10` | Treffer pro Anfrage (1–20) |
| `WEB_SEARCH_TIMEOUT_MS` | `10000` | Zeitlimit pro Anfrage |
| `RATE_LIMIT_SUCHE_MAX` / `RATE_LIMIT_SUCHE_WINDOW_MS` | `60` / `600000` | Suchen pro Konto und Zeitfenster |

## Verhältnis zu `feature/online-arbeitsblattssuche` (Luis)

Der Branch baut `GET /api/web-search` mit HTML-Scraping von DuckDuckGo, Yahoo und Bing und fällt bei Fehlern auf
**simulierte Treffer** (`mocked: true`) zurück. Diese Route ersetzt ihn für Adis Frontend, weil:

| Punkt | `feature/online-arbeitsblattssuche` | `/api/suche` |
| --- | --- | --- |
| Pfad und Antwort | `/api/web-search` → `{ query, results: [{ title, url, snippet, source, fileType, mocked? }], count }` | `/api/suche` → `{ results: [{ title, url, snippet }] }` (Adis Vertrag) |
| Rückfall | simulierte Treffer | Fehlermeldung, nie erfundene Treffer |
| Quelle | Scraping der Ergebnisseiten (bricht bei Layout-Änderungen, Bot-Schutz) | JSON-API (SearXNG oder Brave) |
| Dateityp-Filter | `fileType`, Standard PDF/DOCX | nicht im Vertrag; `filetype:pdf` in `q` wird unverändert weitergereicht, ob es wirkt, hängt von der Suchmaschine ab |
| Anmeldung | offen | Pflicht |

Offen zur Abstimmung mit Luis und Adi: ob der Dateityp-Filter in den Vertrag soll (z. B. `?fileType=pdf`) und ob
Luis' Branch danach geschlossen wird.

## Tests

- `tests/unit/suche.test.js` – Konfiguration, SearXNG- und Brave-Abfrage mit nachgebautem `fetch`, alle Fehlerfälle, URL-Filter
- `tests/integration/suche-routes.test.js` – Anmeldung, Validierung, `503` ohne Anbieter, Rate-Limit, Antwortform
