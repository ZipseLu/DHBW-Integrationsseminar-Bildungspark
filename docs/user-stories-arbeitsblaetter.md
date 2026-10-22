# User Stories & Trello-Tickets — Unterseite „Arbeitsblätter"

**Projekt:** Arbeitsblattverwaltung Bildungspark Heilbronn-Franken
**Sprint:** Prototyp (2 Wochen)
**Bezugsquelle:** `ArbeitsblattverwaltungMockup/src/App.tsx` (3.604 Zeilen)
**Erstellt:** 12.10.2026

> **Gültigkeit (Stand 22.10.2026).** Dieses Dokument analysiert das Figma-Make-Mockup vom 12.10.
> und schlägt Tickets vor. Seitdem entschieden bzw. umgesetzt:
>
> - **Stack (16.10.):** Backend Node 22 + Express 4 in JavaScript (ESM), MySQL 8.4 über `mysql2`,
>   npm, GitHub Actions. Die Vorschläge Prisma/PostgreSQL (BE-00, BE-01, Abschnitt 4), `pnpm build`
>   (DoD) und OpenAI `gpt-4o` (Abschnitt 9) sind damit überholt. Das Schema steht in
>   `docker/mysql/init/01-init.sql`.
> - **KI-Anbieter:** Gemini (Anfangsphase) → Azure OpenAI, umschaltbar über `AI_PROVIDER`; ohne
>   API-Key läuft ein Mock (`apps/backend/src/ai/`).
> - **Frontend (22.10.):** `apps/frontend` ersetzt das Mockup als Prototyp (Seiten Arbeitsblätter und
>   KI-Erstellung, Komponenten aufgeteilt). FE-00/FE-03/FE-15/FE-31 sind damit teilweise erledigt,
>   Routing (React Router) nicht. Das Mockup läuft nur noch als Profil `legacy`.
> - **Meilenstein:** „Erster Prototyp“ wurde am 13.10. vom 06.10. auf den 23.10. verschoben.
> - **Niveaustufen:** Die Bezeichnungen „Talent-/Aufbau-/Fach-/Berufsstufe“ (Abschnitt 4) stammen
>   aus dem Mockup und sind in keiner Unterlage des Bildungsparks belegt – siehe
>   [fachliche-grundlagen.md](fachliche-grundlagen.md). Ebenso ist „Reinigung & Gebäudepflege“ kein
>   Berufsfeld des Bildungsparks.
>
> Zeilenangaben beziehen sich weiterhin auf `ArbeitsblattverwaltungMockup/src/App.tsx` (Stand 12.10.2026).

---

## 1. Ausgangslage — was im Mockup vorliegt

Das Mockup ist eine **einzelne React-Datei** ohne Backend, ohne Routing, ohne echte Persistenz.

| Kennzahl | Wert | Bedeutung |
|---|---|---|
| Zeilen in `App.tsx` | 3.604 | Alles in einer Datei |
| `useState`-Aufrufe | 66 | Komponenten-Wildwuchs |
| Inline-Styles `style={{…}}` | 471 | Design steckt im Markup, nicht in CSS/Tailwind |
| `setTimeout`-Fake-Asynchron Calls | 7 | Platzhalter statt API |
| Auskommentierte TODO-Stellen | 1 | Zeile 1851 |
| Routing | ❌ | `activeNav` ist ein `useState`, keine URL |
| API-Client | ❌ | existiert nicht |
| Echte Authentifizierung | ❌ | Passwörter liegen im Klartext in `App.tsx` (Z. 389–394) |

**Konsequenz:** Das Mockup ist ein sehr guter *Funktionsumfangs-Prototyp* — aber es ist noch kein
Frontend. Die folgende Liste bildet ab, was zwischen „Mockup läuft" und „Seite läuft gegen ein
echtes Backend" fehlt.

---

## 2. Funktionsumfang der Seite „Arbeitsblätter" (Ist-Zustand)

### 2.1 Block A — Upload-Zone „Vorhandenes Arbeitsblatt hochladen & anpassen" (Z. 1769–1990)

| # | Element | Zeilen | Status im Mockup |
|---|---|---|---|
| A1 | Drag-&-Drop-Zone + Datei-Auswahl | 1776–1799 | ✅ UI komplett, Logik ist `handleFileInput` |
| A2 | Akzeptierte Formate `.pdf,.doc,.docx,.txt,.png,.jpg`, max 20 MB | 1789, 1793 | ⚠️ nur im `accept`-Attribut, keine Validierung |
| A3 | Analyse-Ladezustand („KI analysiert…") | 1802–1814 | 🎭 Fake: `setTimeout(…, 2000)` in `startUpload` (Z. 896–911) |
| A4 | Ergebnis-Karte mit erkanntem Thema/Berufsbild/Niveau + „erkannt"-Badge | 1817–1834 | 🎭 Fake: Thema = Dateiname, Berufsbild hardcodiert, Niveau hardcodiert `'F'` |
| A5 | Aktionswahl „Direkt speichern" / „KI anpassen" | 1837–1862 | ⚠️ „Direkt speichern" funktioniert (lokal), **„KI anpassen" ist leer** (Z. 1851) |
| A6 | Zielniveau-Multi-Select (T/A/F/B) | 1864–1885 | ✅ UI, `toggleBatchLevel` verhindert 0-Auswahl |
| A7 | Barrierefreiheits-Format-Multi-Select (4 Formate) | 1887–1910 | ✅ UI, `toggleBatchFormat` |
| A8 | Sprachformat Leichte/Standardsprache | 1912–1926 | ✅ UI, nur State |
| A9 | Live-Summary „KI erstellt N Varianten: …" | 1929–1933 | ✅ berechnet aus A6×A7 |
| A10 | Generate-Button mit Variantenanzahl + Spinner | 1935–1946 | 🎭 Fake: `handleTransform` (Z. 941–948) |
| A11 | Ergebnis-Grid 2-spaltig mit „Öffnen" / „PDF" | 1949–1975 | ❌ Buttons haben **kein** `onClick` |
| A12 | „Alle speichern & zur Bibliothek hinzufügen" / „Neue Datei" | 1976–1984 | ❌ erster Button ohne `onClick` |

### 2.2 Block B — Filterleiste (Z. 1993–2050)

| # | Element | Zeilen | Status im Mockup |
|---|---|---|---|
| B1 | Freitextsuche über Titel, Ausbildungsbaustein, Abschnittstitel | 1995–2002 | ✅ clientseitig (Z. 966–972), **ohne Debounce** |
| B2 | Ergebniszähler „N Ergebnisse" | 2003 | ✅ |
| B3 | Berufsbild-Dropdown (setzt Ausbildungsbaustein zurück) | 2007–2014 | ✅ |
| B4 | Baustein-Buttongruppe, **aus den Daten abgeleitet** (Z. 961) | 2016–2031 | ✅ |
| B5 | Ausbildungsbaustein-Buttongruppe, **abhängig von B3** (Z. 962–964) | 2033–2048 | ✅ |

### 2.3 Block C — Arbeitsblatt-Liste (Z. 2053–2201)

| # | Element | Zeilen | Status im Mockup |
|---|---|---|---|
| C1 | Kartenkopf: BS-Badge, Ausbildungsbaustein → Titel, KI-Badge | 2060–2077 | ✅ |
| C2 | Metazeile: Berufsbild · Ersteller · Datum | 2078–2084 | ✅ |
| C3 | Format-Badge + 4 Persona-Buchstaben (A–P aus `PERSONA_MAP`) | 2086–2115 | ✅ |
| C4 | Actions: Aufbau · Vorschau · Verlauf · .docx · Anpassen | 2119–2160 | ✅ (4 von 5 funktionieren) |
| C5 | Ausklappbar „Aufbau": Abschnittstitel + 4-Spalten-Niveautabelle | 2164–2192 | ✅ |
| C6 | Leerzustand „Keine Arbeitsblätter gefunden." | 2196–2200 | ✅ |

### 2.4 Block D — „Gespeicherte Dokumente" (Z. 2204–2253)

| # | Element | Zeilen | Status im Mockup |
|---|---|---|---|
| D1 | Kopfzeile mit Stückzahl | 2207–2213 | ✅ |
| D2 | Zeilen: Name, Berufsbild · Thema · Größe · Seiten | 2216–2226 | ✅ |
| D3 | Meta: gespeichert am · gespeichert von | 2229 | ✅ |
| D4 | Actions: Öffnen · Anpassen · Entfernen (✕) | 2230–2247 | ⚠️ Entfernen nur lokal, Öffnen ohne Funktion |
| D5 | **Sichtbar nur, wenn Liste nicht leer** | 2204 | ⚠️ |

### 2.5 Detail-Panel (Slide-over, Z. 1347–1501)

| # | Element | Zeilen | Status |
|---|---|---|---|
| E1 | Kopf: BS-Badge, Berufsbild, Titel, „N Teilnehmer" | 1353–1364 | ⚠️ Teilnehmerzahl ist ein hartkodiertes Feld |
| E2 | Tab-Umschalter Vorschau / Verlauf | 1366–1377 | ✅ |
| E3 | **Vorschau**: Word-Seiten-Simulation (Briefkopf, Titel, Meta, Abschnitt, 4-Spalten-Tabelle, Fußzeile) | 1382–1440 | ✅ hohe Detailtreue — direkt wiederverwendbar |
| E4 | **Verlauf**: Timeline mit Aktions-Badges, Version, Datum, Autor, Notiz | 1442–1481 | ✅ UI, Daten aus `WORKSHEET_HISTORY` (Z. 86–138) |
| E5 | Fußzeile: „✦ Anpassen" + „📄 Als Word speichern" | 1485–1498 | ✅ beide verdrahtet |

### 2.6 Transform-Panel (Slide-over, Z. 1149–1345)

| # | Element | Zeilen | Status |
|---|---|---|---|
| F1 | Kopf „✦ KI-Anpassung" + Original-Info-Box | 1163–1186 | ✅ |
| F2 | Zielniveau-Multi-Select **mit Live-Hinweistext** pro Niveau (aus `TRANSFORM_PREVIEWS`) | 1189–1223 | ✅ Besonderheit, die erhalten bleiben muss |
| F3 | Format-Multi-Select mit Beschreibungen + Häkchen | 1226–1251 | ✅ |
| F4 | Sprachformat | 1254–1267 | ✅ |
| F5 | Summary + Generate-Button | 1270–1289 | 🎭 Fake (`handleTransform`) |
| F6 | Ergebnis-Liste je Variante mit Vorschau-Schnipsel (Emoji bei Piktogramm-Format) | 1292–1332 | ❌ „Öffnen"/„PDF" ohne Funktion |
| F7 | „Alle zur Bibliothek hinzufügen" + „Andere Einstellungen wählen" | 1334–1339 | ❌ ohne `onClick` |

### 2.7 Was funktioniert bereits vollständig

| Feature | Zeilen | Anmerkung |
|---|---|---|
| **DOCX-Export** `generateAndDownloadDocx()` | 495–603 | Läuft clientseitig, `docx`-Lib ist installiert. Real und funktionsfähig. |
| Binnendifferenzierungs-Tabelle (Dokument) | 526–573 | Level-Farben, Header-Row, Kompetenz+Beispiel pro Stufe |
| Farb-/Style-System (`LEVEL_STYLES`, `FORMAT_OPTIONS`, `PERSONA_MAP`) | 52–57, 24–29, 477–482 | reine Konstanten, wandern in eine Config-Datei |

---

## 3. Kritische Lücken (im Mockup nicht vorhanden!)

Diese Punkte fehlen vollständig und müssen **neu** gebaut werden:

| Lücke | Auswirkung |
|---|---|
| **L1 — Kein Anlegen eines Arbeitsblatts von Hand** | Der einzige Weg ist die KI. Es gibt kein Formular. |
| **L2 — Kein Bearbeiten** | „Aufbau" klappt nur auf. Kein einziges Feld ist editierbar. |
| **L3 — Kein Löschen / Archivieren** | `HistoryEntry` kennt `'archiviert'`, aber keine UI dafür. |
| **L4 — Keine Freigabe** | `HistoryEntry` kennt `'freigegeben'`, aber keine UI dafür. |
| **L5 — „KI anpassen" nach Upload ist leer** | Z. 1851, `onClick={() => {/* TODO */}}` |
| **L6 — Keine Persistenz** | Jeder `useState`-Wert ist nach Reload weg. |
| **L7 — Keine echten URLs** | Browser-Back funktioniert nicht, Deep-Links nicht teilbar. |
| **L8 — Passwörter im Klartext im Quellcode** | Z. 389–394, blockiert jedes Deployment. |
| **L9 — Teilnehmerzahl ist ein hartkodiertes Feld** | `w.participants` hat keine Datenquelle. |
| **L10 — Keine Ladezustände, keine Fehlerbehandlung** | Kein Spinner beim Abruf, keine 401/404/500-Darstellung. |
| **L11 — Suche ohne Debounce** | Jeder Tastendruck filtert; bei Server-Suche = Request-Flut. |
| **L12 — `savedDocs` nutzt `parseInt(doc.id.replace('doc-',''))`** | Z. 2236, Krücke die mit echten IDs zusammenbricht. |

---

## 4. Datenmodell (Ziel)

Aus `type Worksheet` (Z. 61–66), `type HistoryEntry` (Z. 78–84) und `type SavedDocument` (Z. 67–76) abgeleitet:

```ts
enum Level   { T, A, F, B }                                   // Stufen der Lehrpläne; Bezeichnung offen, s. fachliche-grundlagen.md
enum Format  { TEXT, PIKTOGRAMM, MATHEFREI, PIKTOGRAMM_MATHEFREI }
enum HistoryAction { ERSTELLT, BEARBEITET, KI_ANGEPASST, FREIGEGEBEN, ARCHIVIERT }
enum Status  { ENTWURF, FREIGEGEBEN, ARCHIVIERT }

model Worksheet {
  id                 String   @id @default(uuid())
  title              String
  berufsbild         String
  baustein           Int
  ausbildungsbaustein String
  format             Format
  sprache            Sprache          // LEICHT | STANDARD
  abschnittTitel     String
  status             Status   @default(ENTWURF)
  aiGenerated        Boolean  @default(false)
  version            Int      @default(1)
  createdById        String
  createdAt          DateTime
  updatedAt          DateTime

  niveaus            LevelContent[]   // 1:1 — genau 4 Einträge T/A/F/B
  history            HistoryEntry[]

  @@index([berufsbild, baustein])
  @@index([status])
}

model LevelContent {              // Binnendifferenzierung
  id          String @id @default(uuid())
  worksheetId String
  level       Level
  kompetenz   String
  beispiel    String
  piktogramme Json?               // nur bei PIKTOGRAMM-Formaten

  @@unique([worksheetId, level])
}

model HistoryEntry {              // revisionssicheres Audit
  id          String        @id @default(uuid())
  worksheetId String
  version     Int
  action      HistoryAction
  authorId    String
  note        String?
  snapshot    Json?          // optional: vollständiger Stand vor der Änderung
  createdAt   DateTime      @default(now())

  @@index([worksheetId, version])
}

model StoredDocument {            // hochgeladene Originale (Block A + D)
  id           String @id @default(uuid())
  filename     String
  mimeType     String
  sizeBytes    Int
  pageCount    Int?
  storageKey   String         // Pfad im Object-Storage-Volume
  berufsbild   String?
  thema        String?
  detectedLevel Level?
  createdById  String
  createdAt    DateTime
}
```

---

## 5. API-Spezifikation (Vorschlag)

| Methode & Pfad | Zweck | benötigt von |
|---|---|---|
| `GET /api/worksheets` | Liste + Filter + Suche + Paging | FE-11, FE-12 |
| `GET /api/worksheets/:id` | Detail inkl. 4 Niveaus + Teilnehmerzahl | FE-21 |
| `GET /api/worksheets/:id/history` | Verlauf (Timeline) | FE-22 |
| `POST /api/worksheets` | Anlegen | FE-31 |
| `PATCH /api/worksheets/:id` | Bearbeiten → erhöht `version`, schreibt History | FE-32 |
| `DELETE /api/worksheets/:id` | Soft-Delete → Status `ARCHIVIERT` | FE-33 |
| `POST /api/worksheets/:id/freigeben` | Statuswechsel | FE-34 |
| `GET /api/worksheets/:id/export.docx` | Server-DOCX (optional, s. FE-40) | FE-40 |
| `GET /api/worksheets/:id/export.pdf` | PDF | FE-41 |
| `GET /api/meta/berufsbilder` | Dropdown-Befüllung | FE-11 |
| `GET /api/meta/bausteine?berufsbild=` | abgeleitete Filterwerte | FE-11 |
| `GET /api/meta/ausbildungsbausteine?berufsbild=` | abhängige Filterwerte | FE-11 |
| `POST /api/documents` | Upload (multipart) | FE-53 |
| `GET /api/documents` | Liste „Gespeicherte Dokumente" | FE-54 |
| `GET /api/documents/:id/file` | Original streamen („Öffnen") | FE-54 |
| `DELETE /api/documents/:id` | ✕ Entfernen | FE-54 |
| `POST /api/ai/analyze` | Datei → Thema/Berufsbild/Niveau | FE-52 |
| `POST /api/ai/transform` | Level×Format-Batch-Transformation | FE-63 |
| `POST /api/worksheets/batch` | generierte Varianten einmassenspeichern | FE-65 |
| `POST /api/auth/login` · `GET /api/auth/me` | JWT | FE-02 |

**Filter-Parameter für `GET /api/worksheets`:**
`?berufsbild=&baustein=&ausbildungsbaustein=&level=&format=&status=&q=&sort=&page=&limit=`

---

## 6. User Stories & Tickets

> **Definition of Done (DoD) für jedes Ticket:**
> 1. Läuft gegen das echte Backend (kein Mock mehr)
> 2. Lade-, Leer- und Fehlerzustand vorhanden
> 3. `pnpm build` ohne TypeScript-Fehler
> 4. Pull Request mit Link zum Trello-Card

> **Aufwandsschätzung:** XS = < 2 h · S = ½ Tag · M = 1 Tag · L = 2 Tage

---

### EPIC 0 — Fundament (Blocker für alles andere)

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **BE-00** | Express + TypeScript + Prisma Projekt aufsetzen | *Als Entwickler möchte ich ein lauffähiges Backend, damit das Frontend etwas ansprechen kann.* Health-Endpoint `GET /health`, Ordnerstruktur, ESLint, `.env.example`, läuft in `docker compose --profile backend up` | S | — |
| **BE-01** | Datenmodell + Migration | *Als Entwickler möchte ich das Worksheet-Schema in der DB, damit Daten persistent sind.* Prisma-Schema nach Abschnitt 4, `prisma migrate dev`, Indizes | M | BE-00 |
| **BE-02** | Seed-Skript mit den 12 Mock-Arbeitsblättern | *Als Team möchten wir realistische Demo-Daten, damit die Präsentation etwas zeigt.* 12 Worksheets + 7 History-Einträge aus `WORKSHEET_HISTORY` (Z. 86–138) | M | BE-01 |
| **BE-03** | Auth: Login + JWT + Middleware | *Als Nutzer möchte ich mich anmelden, damit meine Aktionen zugeordnet werden.* `POST /auth/login` (argon2), `GET /auth/me`, `requireAuth`, `requireRole(admin\|dozent\|assistent)` | M | BE-00 |
| **FE-00** | `App.tsx` aufteilen + React Router | *Als Entwickler möchte ich echte URLs, damit Deep-Links und Back-Button funktionieren.* Aufteilung in `pages/`, `components/`, `features/worksheets/`, `lib/`; Routen `/login`, `/arbeitsblaetter`, `/ki-erstellung`; Nav über `useNavigate` statt `activeNav`-State | L | — |
| **FE-01** | API-Client + Env-Konfiguration | *Als Entwickler möchte ich einen zentralen HTTP-Client, damit Auth-Token und Fehlerbehandlung überall gleich sind.* `fetch`-Wrapper mit Base-URL aus `VITE_API_URL`, Bearer-Interceptor, 401 → Redirect `/login`, einheitliches Fehlerformat | S | BE-03 |
| **FE-02** | Login-Seite an echtes Auth anbinden | *Als Nutzer möchte ich mich mit E-Mail/Passwort anmelden, damit ich arbeiten kann.* Formular aus Z. 1101–1135 auf API umstellen, Token speichern, `AuthContext` + `ProtectedRoute` | S | FE-01, BE-03 |
| **FE-03** | Stammdaten in Config-Dateien auslagern | *Als Entwickler möchte die Konstanten an einer Stelle, damit sie nicht in 6 Komponenten dupliziert sind.* `LEVEL_STYLES`, `FORMAT_OPTIONS`, `PERSONA_MAP`, `LEVEL_DOCX_COLORS`, `TRANSFORM_PREVIEWS` nach `src/config/` | S | FE-00 |

---

### EPIC 1 — Bibliothek: Liste, Filter, Suche

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **BE-10** | `GET /api/worksheets` mit Filter + Paging | *Als Nutzer möchte ich nur passende Arbeitsblätter sehen, damit ich schnell finde was ich brauche.* Alle Filter aus Abschnitt 5, `ILIKE`-Suche über Titel/Ausbildungsbaustein/Abschnittstitel, Antwort mit `{ items, total, page, limit }` | M | BE-01 |
| **BE-11** | `GET /api/meta/*` Stammdaten-Endpoints | *Als Frontend möchte ich Filteroptionen, die wirklich zu den Daten passen.* Drei Endpoints liefern distinct Bausteine/Ausbildungsbausteine, optional nach `berufsbild` gefiltert | S | BE-01 |
| **BE-12** | `GET /api/worksheets/:id` inkl. Niveaus | *Als Nutzer möchte ich ein einzelnes Arbeitsblatt vollständig laden.* Worksheet + 4 `LevelContent` + berechnete Teilnehmerzahl | S | BE-01 |
| **FE-10** | Listenansicht: Kartenkopf | *Als Nutzer möchte ich pro Karte Titel, Baustein, Format und Ersteller sehen, damit ich scannen kann.* Z. 2060–2115 gegen API; Format-Badge + 4 Persona-Buchstaben übernehmen `PERSONA_MAP` | S | BE-10, FE-03 |
| **FE-11** | Filterleiste gegen Server-Filter | *Als Nutzer möchte ich nach Berufsbild/Baustein/Ausbildungsbaustein filtern.* Z. 1993–2050; Filterwerte aus `GET /api/meta/*`; Berufsbild-Wechsel setzt Ausbildungsbaustein zurück; Filter in URL-Query spiegeln; „N Ergebnisse" aus `total` | M | BE-10, BE-11 |
| **FE-12** | Suche mit Debounce | *Als Nutzer möchte ich suchen, ohne dass die Seite bei jedem Tastendruck hängt.* 300 ms Debounce, Suchbegriff an Server, `isFetching`-Indikator, Suche + Filter kombinierbar | S | FE-11 |
| **FE-13** | Aufklappbarer „Aufbau"-Bereich | *Als Nutzer möchte die Binnendifferenzierung direkt in der Liste sehen, ohne die Detailansicht zu öffnen.* Z. 2164–2192; Inhalt aus gecachten Daten, kein zusätzlicher Request | S | FE-10 |
| **FE-14** | Paging / „Mehr laden" | *Als Nutzer möchte auch bei vielen Arbeitsblättern performant bleiben.* Z. 2053ff; Infinite Scroll oder Seitenbuttons, ab 100 Datensätzen relevant | S | FE-10 |

---

### EPIC 2 — Detail-Panel (Vorschau & Verlauf)

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **BE-13** | `GET /api/worksheets/:id/history` | *Als Nutzer möchte sehen, wer wann was geändert hat.* Sortiert nach `version DESC` | S | BE-01 |
| **BE-14** | Teilnehmerzahl berechnen | *Als Nutzer möchte sehen, wie viele Teilnehmende ein Arbeitsblatt nutzen.* Aggregation statt hartkodiertem Feld (schließt L9) | S | BE-01 |
| **FE-15** | Slide-over-Shell wiederverwendbar | *Als Entwickler möchte eine gemeinsame Panel-Komponente, weil Detail- und Transform-Panel identisch aufgebaut sind.* Backdrop + Panel (480 px) + ESC-Close + Fokus-Falle, analog Z. 1149–1161 und 1347–1351 | S | FE-00 |
| **FE-16** | Tab „Vorschau" — Word-Simulation | *Als Nutzer möchte sehen, wie das Arbeitsblatt später ausgedruckt aussieht.* Z. 1382–1440 **1:1 übernehmen**; Drucktaste „Drucken" → `window.print()` | M | FE-15, BE-12 |
| **FE-17** | Tab „Verlauf" — Timeline | *Als Nutzer möchte den Änderungsverlauf nachvollziehen.* Z. 1442–1481; Aktions-Badge-Farben aus `actionColors` (Z. 1448–1454) in Config; „N Versionen · Neueste zuerst" | M | FE-15, BE-13 |
| **FE-18** | Panel-Footline: Anpassen + Word-Export | *Als Nutzer möchte vom Detail direkt exportieren oder die KI anstoßen.* Z. 1485–1498; „Anpassen" öffnet das Transform-Panel mit diesem Worksheet | S | FE-15 |

---

### EPIC 3 — Schreiben: Anlegen, Bearbeiten, Löschen, Freigeben
*(schließt L1–L4 — im Mockup komplett fehlend)*

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **BE-15** | Validierungsschema (Zod) | *Als Nutzer möchte verlässliche Fehlermeldungen, statt dass die App abstürzt.* Schema für Worksheet-Request; alle 8 Pflichtfelder + genau 4 Niveaus mit nicht-leerer Kompetenz und Beispiel | S | BE-01 |
| **BE-16** | `POST /api/worksheets` | *Als Dozent möchte ein Arbeitsblatt anlegen.* Erster History-Eintrag `ERSTELLT` (v1), `createdById` aus JWT | M | BE-15 |
| **BE-17** | `PATCH /api/worksheets/:id` mit Auto-Versionierung | *Als Dozent möchte Änderungen speichern, ohne die Historie zu verlieren.* `version++`, Eintrag `BEARBEITET`, optional `note` | M | BE-15 |
| **BE-18** | `DELETE /api/worksheets/:id` (Soft-Delete) | *Als Dozent möchte ein Arbeitsblatt archivieren, ohne es zu verlieren.* Status → `ARCHIVIERT`, Eintrag `ARCHIVIERT`, standardmäßig aus der Liste ausgefiltert | S | BE-17 |
| **BE-19** | `POST /api/worksheets/:id/freigeben` | *Als Dozent möchte ein geprüftes Arbeitsblatt freigeben.* Status `ENTWURF` → `FREIGEGEBEN`, Eintrag `FREIGEGEBEN` | S | BE-17 |
| **FE-20** | Wiederverwendbares Worksheet-Formular | *Als Entwickler möchte ein Formular für Anlegen **und** Bearbeiten.* Stammdaten (Titel, Berufsbild, Baustein, Ausbildungsbaustein, Format, Sprache) + 4 Niveaus; `mode: 'create' \| 'edit'`; Zod-Validierung clientseitig, Server-Fehlerfeldgenau anzeigen | L | BE-15, FE-03 |
| **FE-21** | Anlegen: Modal & „+ Arbeitsblatt erstellen" | *Als Dozent möchte ein neues Arbeitsblatt anlegen.* Modal wie Z. 2664–2807 stilisiert; Startpunkt ist der Top-Bar-Button (Z. 1586–1592) — der zeigt aktuell auf KI-Erstellung und muss umgestellt werden | M | FE-20 |
| **FE-22** | Bearbeiten: Zugriff von der Karte | *Als Dozent möchte ein bestehendes Arbeitsblatt ändern.* Neuer „Bearbeiten"-Button auf der Karte (neben den 5 bestehenden Actions, Z. 2119–2160); Formular mit vorausgefüllten Daten | M | FE-20, FE-10 |
| **FE-23** | Löschen mit Bestätigungsdialog | *Als Dozent möchte ein Arbeitsblatt archivieren.* Dialog mit Warnung, Grund optional, nach Erfolg Toast + Row verschwindet | S | FE-22 |
| **FE-24** | Freigeben-Aktion + Status-Badge | *Als Dozent möchte meine Freigabe dokumentieren.* „Freigeben"-Button nur bei Status `ENTWURF`; Karten zeigen Status-Badge; Sichtbarkeit abhängig von Rolle | S | FE-22 |

---

### EPIC 4 — Export

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **FE-25** | DOCX-Export: Mockup-Logik ausbauen | *Als Nutzer möchte ein bearbeitbares Word-Dokument.* `generateAndDownloadDocx()` (Z. 495–603) refactoren: Worksheet-Objekt rein, Blob raus; zusätzlich Format-Variante (Piktogramm-Spalte, Mathefrei-Hinweis); funktioniert offline ohne Backend | M | FE-03 |
| **FE-26** | PDF-Export | *Als Nutzer möchte ein druckfertiges PDF.* Entweder (a) Client-seitig aus dem generierten Docx oder (b) Button zunächst deaktiviert mit Tooltip „in Kürze" | S | FE-25 |
| **BE-21** | Server-DOCX-Endpoint (optional) | *Als Betreiber möchte die Dokumenterzeugung zentral, damit sie einheitlich ist.* Nutzt dieselbe Vorlage wie FE-25; **im Prototyp verzichtbar**, wenn FE-25 clientseitig läuft | M | BE-01 |

---

### EPIC 5 — Upload & gespeicherte Dokumente (Block A + D)

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **BE-22** | Upload-Endpoint mit Validierung | *Als Nutzer möchte ein bestehendes Dokument hochladen.* `POST /api/documents` (multipart); Grenzen: 20 MB, `.pdf/.doc/.docx/.txt/.png/.jpg`; Virus-Scan-Platzhalter; Ablage im Volume | M | BE-01 |
| **BE-23** | Analyse-Endpoint | *Als Nutzer möchte Vorschläge für Thema, Berufsbild und Niveaustufe.* `POST /api/ai/analyze`; **Fallback-Regel**, falls kein KI-Key gesetzt: Thema = Dateiname ohne Endung, Niveau = `'F'` (entspricht dem aktuellen Mock-Verhalten) | M | BE-22 |
| **BE-24** | `StoredDocument` CRUD | *Als Nutzer möchte meine Originale wiederfinden und löschen.* `GET /api/documents`, `GET /api/documents/:id/file`, `DELETE /api/documents/:id` | S | BE-22 |
| **FE-27** | Dropzone mit echter Validierung | *Als Nutzer bekomme sofort eine Fehlermeldung, wenn die Datei nicht passt.* Z. 1776–1799; Client-Check Größe/Format **vor** dem Upload; mehrere Fehler gleichzeitig anzeigen | M | BE-22 |
| **FE-28** | Upload- & Analyse-Zustände | *Als Nutzer sehe, was gerade passiert.* Z. 1802–1834; echter Fortschritt statt `setTimeout`; bei Fehler: Retry anbieten | M | FE-27, BE-23 |
| **FE-29** | Aktionswahl „Direkt speichern" / „KI anpassen" | *Als Nutzer entscheide nach dem Upload, was passieren soll.* Z. 1837–1862; **beide Buttons verdrahten** — schließt L5; „KI anpassen" öffnet das Transform-Panel und füllt dessen Felder vor | S | FE-28 |
| **FE-30** | Block D: Liste „Gespeicherte Dokumente" | *Als Nutzer möchte meine hochgeladenen Originale sehen.* Z. 2204–2253; Daten aus `GET /api/documents`; „Öffnen" streamt die Datei (statt der `parseInt`-Krücke in Z. 2236); „✕" löscht serverseitig | M | BE-24 |

---

### EPIC 6 — KI-Anbindung des Transform-Panels

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **BE-25** | `POST /api/ai/transform` (Batch) | *Als Dozent möchte ein Arbeitsblatt auf mehrere Niveaus und Formate anpassen lassen.* Body: `worksheetId` oder `documentId`, `levels[]`, `formats[]`, `sprache`; Anzahl Varianten = `levels.length × formats.length`; Antwort: Array von Entwürfen | L | BE-01 |
| **FE-31** | Transform-Panel-Shell + Auswahlkomponenten | *Als Dozent möchte Niveaus und Formate wählen.* Z. 1149–1267; **Level-/Format-/Sprachauswahl als eigene Komponente extrahieren**, weil sie an drei Stellen identisch vorkommen (Z. 1864–1926, 2386–2422, 1189–1267) | L | FE-15, FE-03 |
| **FE-32** | Live-Hinweistext je Niveaustufe | *Als Dozent möchte vor der Generierung wissen, was die KI für dieses Niveau tut.* Z. 1218–1222 + `TRANSFORM_PREVIEWS` (Z. 441–474); bei Mehrfachauswahl „N Niveaus ausgewählt: …" | S | FE-31 |
| **FE-33** | Ergebnis-Liste der Varianten | *Als Dozent möchte die erzeugten Varianten sehen.* Z. 1292–1332; echte Daten statt `TRANSFORM_PREVIEWS`-Platzhalter; „Öffnen" lädt die Vorschau; „PDF" wird schreibgeschützt, bis FE-26 fertig ist | M | FE-31, BE-25 |
| **FE-34** | „Alle zur Bibliothek hinzufügen" | *Als Dozent möchte generierte Varianten dauerhaft sichern.* Z. 1334–1339; `POST /api/worksheets/batch`; danach Toast + Verweis auf die Liste; schließt das tote `onClick` | M | FE-33, BE-16 |
| **FE-35** | „Andere Einstellungen wählen" + Zustandsreset | *Als Dozent möchte nach der Generierung nochmal anpassen.* Z. 1337–1339; Panel zurück auf Auswahlzustand, Batch-Level/-Format bleiben erhalten | S | FE-33 |

---

### EPIC 7 — Durchgängige Qualität

| ID | Ticket | Story | Aufwand | Abhängt von |
|---|---|---|---|---|
| **FE-36** | Loading-, Empty- und Error-Zustände | *Als Nutzer möchte immer wissen, was gerade passiert.* Skeletons für Liste und Panels, Empty-States (leere Liste, keine Treffer, kein Verlauf), Fehlerbanner mit Retry; schließt L10 | M | FE-01 |
| **FE-37** | Toast-System | *Als Nutzer möchte Rückmeldung über Erfolg oder Fehler.* `sonner` anbinden; Erfolg, Fehler, Info; `role="alert"` für Screenreader | S | FE-01 |
| **FE-38** | URL als Zustandsquelle für Filter & Panel | *Als Nutzer kann ich einen gefilterten Stand teilen und der Back-Button funktioniert.* Query-Params + `useSearchParams`; Detail-Panel über `?ws=<id>&tab=vorschau\|verlauf` | M | FE-11 |
| **FE-39** | Tastaturbedienung & Fokus | *Als Nutzer mit Tastatur oder Screenreader kann die Seite bedienen.* ESC schließt Panels, Tab-Fokus gefangen, Panels mit `role="dialog"` + `aria-modal`, Fokus zurück auf Auslöser | M | FE-15 |
| **FE-40** | Responsive Verhalten | *Als Nutzer mit Tablet oder Handy kann die Seite nutzen.* Panels unter 768 px als Full-Screen-Sheet, Filterleiste umbricht, Aktionsleiste scrollbar | M | FE-10 |
| **FE-41** | Design-Tokens aus Inline-Styles ziehen | *Als Entwickler möchte die 471 Inline-Styles auflösen, damit Tailwind und Dark Mode funktionieren.* Die Farbwerte liegen bereits in `index.css` als `--primary` etc.; Umstellung als **eigene Story**, parallelisierbar, kein Blocker | L | FE-03 |
| **FE-42** | Komponententests für Filterlogik | *Als Team wollen wir keine Regressionen in der Filterlogik.* Tests für Filterkombinationen, Suche, abhängige Ausbildungsbausteine | S | FE-11 |
| **BE-26** | API-Tests für Filter & Versionierung | *Als Team wollen wir die Regeln absichern.* Testfall: PATCH erhöht `version`, erzeugt History-Eintrag, ändert nichts an älteren Einträgen | M | BE-17 |
| **QA-01** | Demo-Skript & Seed-Refresh | *Als Projektleiter möchte ich eine abgesicherte Demo.* Skript `npm run db:reset`, Liste der Login-Zugänge (4 Rollen), 5-minütiges Ablauf-Skript für die Präsentation | S | BE-02 |

---

## 7. Empfohlene Trello-Struktur

**Listen**
```
📥 Backlog         → alles aus Abschnitt 6
🏁 Sprint Ready     → geschätzt und eingeplant
🚀 In Progress      → max. 3 pro Person
👀 Code Review      → max. 2 pro Person
✅ Done
🚧 Blocked / Fragen
```

**Labels**
`epic:bibliothek` · `epic:detail` · `epic:schreiben` · `epic:export` · `epic:upload` · `epic:ki` · `epic:qualität`
`frontend` · `backend` · `design` · `bug`
`size:xs` · `size:s` · `size:m` · `size:l`

**Schabl pro Card**
```
Titel:    [FE-21] Modal "Neues Arbeitsblatt" von Top-Bar öffnen
Labels:   frontend · size:m · epic:schreiben
Story:    Als Dozent möchte ich ein neues Arbeitsblatt anlegen.
Mockup:   App.tsx Z. 1586–1592 + 2664–2807
DoD:      [ ] Formular aus FE-20 angebunden
          [ ] POST /api/worksheets
          [ ] Erfolgs-Toast + Navigation zur Liste
          [ ] Fehlerfall 400 zeigt Feldmeldungen
          [ ] pnpm build fehlerfrei
          [ ] PR verlinkt
```

---

## 8. Sprintplanung (2 Wochen)

### Woche 1 — Bibliothek steht

| Tag | Fokus | Tickets |
|---|---|---|
| Mo | Fundament | BE-00, BE-01, FE-00 |
| Di | Auth + Daten | BE-02, BE-03, FE-01, FE-02, FE-03 |
| Mi | Liste | BE-10, BE-11, BE-12, FE-10 |
| Do | Filter + Suche | FE-11, FE-12, FE-13 |
| Fr | Review + Puffer | QA-01, Code-Review-Fixes |

**Woche-1-Abnahme:** anmelden, Liste mit echten Daten aus der DB, filtern, suchen, Detail-Vorschau öffnen.

### Woche 2 — Schreiben, Upload, KI

| Tag | Fokus | Tickets |
|---|---|---|
| Mo | Schreiben | BE-15, BE-16, BE-17, FE-20 |
| Di | Schreiben UI | FE-21, FE-22, FE-23, BE-18, BE-19, FE-24 |
| Mi | Upload | BE-22, BE-23, BE-24, FE-27, FE-28, FE-29 |
| Do | KI | BE-25, FE-31, FE-32, FE-33 |
| Fr | Abschluss | FE-25, FE-30, FE-34, FE-36, FE-37, QA-01 |

**Woche-2-Abnahme:** Arbeitsblatt anlegen und bearbeiten, Dokument hochladen und analysieren, KI-Batch erzeugen und in die Bibliothek übernehmen, DOCX-Export.

### Was bewusst gestrichen wurde

| Ticket | Grund |
|---|---|
| FE-14 Paging | Bei 12 Demo-Daten unnötig; code-seitig vorbereitet |
| FE-26 / BE-21 PDF & Server-DOCX | Für die Demo reicht der Client-Export |
| FE-39 Tastaturbedienung | Pflicht für den Produktivbetrieb, nicht für die Demo |
| FE-41 Design-Tokens | Kann parallel laufen, blockiert aber nichts |
| EPIC „Teilnehmende", „Berichte" | Nicht Teil des 2-Wochen-Prototyps |

---

## 9. Offene Entscheidungen

| # | Frage | Blockiert |
|---|---|---|
| 1 | ~~Backend-Stack final bestätigen (Vorschlag: Express + TypeScript + Prisma + PostgreSQL)~~ **Entschieden 16.10.:** Express 4 in JavaScript, MySQL 8.4 mit `mysql2` | – |
| 2 | ~~KI-Anbieter für BE-23/BE-25 (Vorschlag: OpenAI, Modell `gpt-4o`)~~ **Entschieden 16.10.:** Gemini, später Azure OpenAI (`AI_PROVIDER`) | – |
| 3 | Wird Bearbeiten von Hand (FE-21/22) gezeigt, oder nur KI-generierte Arbeitsblätter? | Sprint-Scope Woche 2 |
| 4 | Sollen hochgeladene Originale in der Demo sichtbar sein, oder erst nach Upload? (Block D erscheint aktuell nur bei Inhalt) | FE-30 |
| 5 | Rollenrechte: darf ein Assistent Arbeitsblätter anlegen und freigeben? (Rollen existieren bereits ab Z. 389–394) | BE-03, FE-24 |

---

*Alle Zeilenangaben beziehen sich auf `ArbeitsblattverwaltungMockup/src/App.tsx` in der Fassung vom 12.10.2026.*
