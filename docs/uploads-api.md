# Upload von Arbeitsblättern – API

**Stand:** 12.11.2026 · **Trello:** „Upload von Arbeitsblättern“ (Backend) · Grundlage für **FE-05**

Dozierende laden vorhandene Arbeitsblätter hoch (PDF, Word, Text, Bild) oder fügen ihren Text ein.
Das Backend speichert die Originaldatei und – wo möglich – den Text. Aus dem Text kann die KI das Blatt
später in die Niveaustufen T/A/F/B übertragen (FE-05).

---

## 1. Modell

Tabelle `uploads` (Migration `003_uploads.sql`, läuft beim Start automatisch):

| Spalte | Bedeutung |
|---|---|
| `dateiname`, `dateityp`, `groesse` | Originalname, erkannter Typ (`pdf`, `docx`, `doc`, `txt`, `md`, `png`, `jpg`), Bytes |
| `datei` | Originaldatei (LONGBLOB); `NULL` bei eingefügtem Text |
| `text`, `text_quelle` | lesbarer Text; Quelle `datei` (beim Hochladen gelesen), `eingefuegt` (Copy & Paste) oder `bearbeitet` (von Hand); `NULL` = noch kein Text |
| `berufsfeld`, `thema` | optionale Zuordnung für Suche und KI |
| `hochgeladen_von`, `hochgeladen_am`, `geaendert_am` | Name aus der Anfrage (`?hochgeladenVon=`); sobald BE-01 gemergt ist, aus der Anmeldung |

Uploads sind **Ausgangsmaterial**, keine Arbeitsblätter im Sinne von `arbeitsblaetter` (dort: eine Stufe,
ein Format, Versionsverlauf). Was die KI aus einem Upload erzeugt, wird wie bisher mit `POST /api/arbeitsblaetter` gespeichert.

## 2. Was gelesen wird

| Typ | Datei gespeichert | Text |
|---|---|---|
| Word `.docx` | ja | Absätze und Tabellenzellen aus `word/document.xml` (gleicher ZIP-Leser wie der Lehrplan-Import) |
| Text `.txt`, `.md` | ja | Dateiinhalt (UTF-8) |
| PDF, Word `.doc`, PNG/JPEG | ja | kein Text – Hinweis in der Antwort; Text kann per `PATCH` ergänzt werden |

Ohne neue Bibliotheken. PDF-Text und Texterkennung (OCR) für Scans wären der nächste Schritt (eigene Karte).
Texte über 100 000 Zeichen werden gekürzt (Hinweis in der Antwort).

**Prüfungen:** höchstens **20 MB** (`413 datei_zu_gross`). Der Typ wird am **Inhalt** erkannt („Magic Bytes“), nicht am
Namen oder am `Content-Type` des Browsers; Endung und Inhalt müssen zusammenpassen
(`415 dateityp_nicht_erlaubt` / `415 inhalt_passt_nicht`). Pfade im Dateinamen werden entfernt.

## 3. API

| Methode und Pfad | Anfrage | Antwort |
|---|---|---|
| `POST /api/uploads` | **Datei als roher Body**, Header `X-Dateiname` (URI-kodiert), `Content-Type` beliebig; Query `?berufsfeld=&thema=&hochgeladenVon=` | `201 { upload, hinweise[] }`, Header `Location` |
| `POST /api/uploads` | `Content-Type: application/json` `{ text, titel?, berufsfeld?, thema?, hochgeladenVon? }` – eingefügter Text | `201 { upload, hinweise[] }` |
| `GET /api/uploads` | `?q=` (Name, Thema, Text), `?berufsfeld=` | `{ eintraege[], gesamt }` – ohne Datei und vollen Text, mit `textVorschau` (200 Zeichen) |
| `GET /api/uploads/:id` | – | `{ upload }` mit vollem `text` |
| `GET /api/uploads/:id/datei` | `?anzeigen=true` zeigt PDF/Bilder im Browser an (sonst Download) | Originaldatei, `404 datei_unbekannt` bei eingefügtem Text |
| `PATCH /api/uploads/:id` | `{ text?, berufsfeld?, thema? }` (`null` bzw. `""` löscht) | `{ upload }`, geänderter Text → `textQuelle: 'bearbeitet'` |
| `DELETE /api/uploads/:id` | – | `204` |

Warum kein `multipart/form-data`? Dafür bräuchte Express eine zusätzliche Bibliothek (z. B. multer). Der rohe Body
reicht für eine Datei pro Anfrage und ist im Frontend genauso einfach:

```ts
await fetch(`/api/uploads?thema=${encodeURIComponent(thema)}`, {
  method: 'POST',
  headers: { 'X-Dateiname': encodeURIComponent(datei.name), 'Content-Type': datei.type || 'application/octet-stream' },
  body: datei,
})
```

Fertig in `apps/frontend/src/lib/api.ts`: `uploadArbeitsblatt(datei, info)`, `saveEingefuegtenText(text, info)`,
`fetchUploads(filter)`, `fetchUpload(id)`, `updateUpload(id, patch)`, `deleteUpload(id)`, `uploadDateiUrl(id)`,
`downloadUploadDatei(upload)`. Der genaue Fehlergrund steht im Feld `code` der Antwort (z. B. `inhalt_passt_nicht`).

Ohne erreichbare MySQL antworten alle Routen mit `503 db_unavailable` – Prüfungen der Anfrage (400, 413, 415) kommen vorher.

## 4. Betrieb

- **nginx** (Frontend-Image) erlaubt Anfragen bis 21 MB an `/api/` (`client_max_body_size`, Standard wäre 1 MB).
- **MySQL 8.4:** `max_allowed_packet` ist standardmäßig 64 MB – reicht für 20-MB-Dateien.
- **Backup (OPS-04):** Die Dateien liegen in der Datenbank und sind damit im Dump enthalten (Größe beachten).
- **Datenschutz:** Hochgeladene Blätter können Namen enthalten (z. B. ausgefüllte Blätter). Nur leere Vorlagen hochladen –
  Hinweis gehört in die Oberfläche (FE-05) und das Benutzerhandbuch (DOC-02).

## 5. Tests

- `tests/unit/uploads.test.js` – Typerkennung, Text aus Word/Text, Schemas, Prüfungen der Routen ohne Datenbank (400/413/415/404)
- `tests/integration/uploads-routes.test.js` (MySQL) – Hochladen, Liste/Suche, Download/Ansicht, Ändern, Löschen
- Frontend `tests/unit/apiClient.spec.ts` – alle Upload-Funktionen in `lib/api.ts`
