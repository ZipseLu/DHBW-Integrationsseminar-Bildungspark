# Websuche für Arbeitsblätter

Die Suche findet echte Weblecks zu Arbeitsblättern ohne API-Key und ohne
Cloud-Konto. Das Backend fragt zuerst die HTML-Version von DuckDuckGo an
(`https://html.duckduckgo.com/html/`, POST) und liest die Treffer mit
`cheerio` aus. Blockiert DuckDuckGo die Anfrage durch seinen Bot-Schutz, werden
ersatzweise die ebenfalls schlüsselfreien Suchen von Yahoo und Bing abgefragt.

Wichtig: Zurückgegeben werden nur echte Dokumente (PDF, DOC, DOCX, PPT, PPTX,
XLS, XLSX). Normale Webseiten wie Wikipedia oder Rezeptportale werden
herausgefiltert. Ohne explizite Dateityp-Auswahl sucht das Backend standardmäßig
nach PDF und DOCX.

## Demo vs. Betrieb

Das Scraping ist bewusst nur für die Demo gedacht:

- **Fragil:** Die HTML-Struktur der Suchseiten kann sich jederzeit ändern.
  DuckDuckGo blockiert automatisierte Anfragen zusätzlich über einen
  Bot-Schutz; Yahoo und Bing liefern je nach Host unterschiedliche Layouts.
- **Nutzungsbedingungen:** Bing und Yahoo erlauben das automatisierte Auslesen
  ihrer Ergebnislisten in ihren Nutzungsbedingungen nicht.
- **Für den Betrieb beim Bildungspark** ist deshalb eine offizielle Such-API
  nötig, z. B. [SerpAPI](https://serpapi.com). Ein entsprechender Key war in
  `.env.example` bereits vorgesehen (`WEB_SEARCH_API_KEY`). Die Umstellung ist
  ein eigener Schritt; die öffentliche API (`GET /api/web-search`) und das
  Antwortformat bleiben dabei gleich.

## Einrichtung

Es ist keine Konfiguration notwendig. Die Standardwerte funktionieren direkt:

```dotenv
WEB_SEARCH_PROVIDER=scrape
WEB_SEARCH_MAX_RESULTS=10
WEB_SEARCH_TIMEOUT_MS=15000
WEB_SEARCH_TOTAL_TIMEOUT_MS=20000
```

- `scrape` (Standard): echte Suche über DuckDuckGo, mit Yahoo und Bing als Ersatz.
- `mock`: simulierte Platzhalter für die Entwicklung ohne Internet. Dieser Modus
  ist ausdrücklich nur für lokale Entwicklung gedacht und wird im Betrieb nicht
  verwendet.

`WEB_SEARCH_TIMEOUT_MS` begrenzt einen einzelnen Anbieter,
`WEB_SEARCH_TOTAL_TIMEOUT_MS` die komplette Anfrage über alle Anbieter hinweg.
Beim Standard von 20 s kann eine Suche also nicht mehr minutenlang hängen, auch
wenn DuckDuckGo, mehrere Yahoo-Hosts und Bing nacheinander ausfallen.

## Suche und Dateityp

Im Formular kann zwischen PDF & DOCX, PDF und DOCX gewählt werden. Die
Auswahl wird als Suchoperator `filetype:pdf` beziehungsweise `filetype:docx` an
die Suchmaschine übermittelt. Ohne Auswahl wird `(filetype:pdf OR
filetype:docx)` ergänzt. Eigene Suchoperatoren wie `intitle:` oder
Anführungszeichen können weiterhin direkt im Suchfeld verwendet werden.

Beispiel:

```text
GET /api/web-search?q=Kochen%20Arbeitsblatt&fileType=pdf
```

Die API gibt Titel, URL, Snippet, Quelle und den erkannten Dateityp zurück. Sie
lädt die Dateien nicht herunter; die Treffer werden in der Oberfläche
verlinkt und können dort geöffnet werden.

## Verhalten bei Fehlern

- Ungültige Eingaben (leerer Suchbegriff, nicht unterstützter Dateityp)
  werden mit HTTP 400 gemeldet.
- Wenn DuckDuckGo blockiert ist, übernimmt Yahoo (mit Rotation über mehrere
  Yahoo-Hosts), danach Bing.
- Wenn alle Anbieter ausfallen, das Gesamtzeitlimit erreicht ist oder keine
  Dokumente gefunden werden, antwortet die API mit **HTTP 503** und der Meldung
  „Die Websuche ist gerade nicht erreichbar. Bitte später erneut versuchen.“
  Es werden bewusst **keine simulierten oder erfundenen Treffer mit toten
  Links** mehr geliefert.
- Simulierte Treffer (`mocked: true`) gibt es nur, wenn
  `WEB_SEARCH_PROVIDER=mock` ausdrücklich gesetzt ist.

## Rate-Limit

Die Route ist derzeit noch ohne Anmeldung erreichbar (BE-06 folgt). Damit sie
auf Staging nicht als offener Such-Proxy missbraucht werden kann, gilt ein
einfaches In-Memory-Rate-Limit pro Client-IP:

```dotenv
WEB_SEARCH_RATE_LIMIT_MAX=30
WEB_SEARCH_RATE_LIMIT_WINDOW_MS=60000
```

Bei Überschreitung antwortet die API mit **HTTP 429**
(`error: too_many_requests`) und `Retry-After`. Die Zähler liegen im
Prozessspeicher und setzen sich beim Neustart zurück; für mehrere parallele
Backend-Instanzen wäre ein gemeinsamer Speicher (z. B. Redis) nötig.

## Arbeitsblätter-Liste

Auch die Liste der gespeicherten Arbeitsblätter sucht serverseitig: Der
Suchbegriff geht als `q` an `GET /api/arbeitsblaetter` und wird dort per `LIKE`
über Titel, Lernziel, Ausbildungsbaustein und Berufsfeld ausgeführt. Die
Oberfläche wartet nach der Eingabe etwa 300 ms (Debounce), damit nicht jede
Taste eine eigene Anfrage auslöst.
