# Websuche fuer Arbeitsblaetter

Die Suche findet echte Weblecks zu Arbeitsblaettern ohne API-Key und ohne
Cloud-Konto. Das Backend fragt zuerst die HTML-Version von DuckDuckGo an
(`https://html.duckduckgo.com/html/`, POST) und liest die Treffer mit
`cheerio` aus. Blockiert DuckDuckGo die Anfrage durch seinen Bot-Schutz, werden
ersatzweise die ebenfalls schluesselfreien Suchen von Yahoo und Bing abgefragt.

Wichtig: Zurueckgegeben werden nur echte Dokumente (PDF, DOC, DOCX, PPT, PPTX,
XLS, XLSX). Normale Webseiten wie Wikipedia oder Rezeptportale werden
herausgefiltert. Ohne explizite Dateityp-Auswahl sucht das Backend standardmaessig
nach PDF und DOCX.

## Einrichtung

Es ist keine Konfiguration notwendig. Die Standardwerte funktionieren direkt:

```dotenv
WEB_SEARCH_PROVIDER=scrape
WEB_SEARCH_MAX_RESULTS=10
WEB_SEARCH_TIMEOUT_MS=15000
```

- `scrape` (Standard): echte Suche ueber DuckDuckGo, mit Yahoo und Bing als Ersatz.
- `mock`: simulierte Platzhalter fuer die Entwicklung ohne Internet.

## Suche und Dateityp

Im Formular kann zwischen PDF & DOCX, PDF und DOCX gewaehlt werden. Die
Auswahl wird als Suchoperator `filetype:pdf` beziehungsweise `filetype:docx` an
die Suchmaschine uebermittelt. Ohne Auswahl wird `(filetype:pdf OR
filetype:docx)` ergaenzt. Eigene Suchoperatoren wie `intitle:` oder
Anfuehrungszeichen koennen weiterhin direkt im Suchfeld verwendet werden.

Beispiel:

```text
GET /api/web-search?q=Kochen%20Arbeitsblatt&fileType=pdf
```

Die API gibt Titel, URL, Snippet, Quelle und den erkannten Dateityp zurueck. Sie
laedt die Dateien nicht herunter; die Treffer werden in der Oberflaeche
verlinkt und koennen dort geoeffnet werden.

## Verhalten bei Fehlern

- Ungueltige Eingaben (leerer Suchbegriff, nicht unterstuetzter Dateityp)
  werden mit HTTP 400 gemeldet.
- Wenn DuckDuckGo blockiert ist, uebernimmt Yahoo (mit Rotation ueber mehrere
  Yahoo-Hosts), danach Bing. Schlaegt auch das fehl oder liefern alle Anbieter
  keine Dokumente, greift das Backend auf simulierte Treffer zurueck. Diese
  sind im Feld `mocked: true` markiert und werden in der Oberflaeche als
  simuliert gekennzeichnet.
