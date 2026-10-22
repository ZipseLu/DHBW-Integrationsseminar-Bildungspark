# Fachliche Grundlagen – was belegt ist und was Annahme bleibt

**Projekt:** Arbeitsblattverwaltung Bildungspark Heilbronn-Franken
**Stand:** 22.10.2026
**Zweck:** Eine Stelle, an der steht, welche Fakten aus den Unterlagen des Auftraggebers stammen,
welche das Team selbst festgelegt hat und was noch zu klären ist. Jede Beispiel- und Seed-Datei,
jeder Prompt und jede Präsentation soll sich hierauf beziehen.

Quellen (Ordner `context/` des Teams, nicht im Repository):
Projektauftrag · Aufgabenstellung Projektkonzeption · Infoblatt „Der Andere Leistungsanbieter im
Bildungspark“ · 14 Lehrplan-Dokumente (DOCX) · 2 Beispiel-Arbeitsblätter (PDF) · Begrüßungsfolien
und Mail der Professorin · Trello-Board.

---

## 1. Auftraggeber

| Fakt | Quelle |
|---|---|
| Bildungspark Heilbronn-Franken gGmbH, Tochter der Aufbaugilde Heilbronn gGmbH | Infoblatt |
| „Anderer Leistungsanbieter“ nach § 60 SGB IX – inklusive Alternative zur Werkstatt für behinderte Menschen (WfbM) | Infoblatt |
| Ziel: Inklusion der Teilnehmenden in den allgemeinen Arbeitsmarkt | Infoblatt |
| Zwei Phasen: Eingangsverfahren (EV, i. d. R. 3 Monate) und Berufsbildungsbereich (BBB, 2 Jahre) | Infoblatt |
| Lernen „schrittweise (tätigkeits- bis berufsbildorientiert)“, Informationen „zielgruppengerecht (z. B. Leichte Sprache)“ | Infoblatt |
| Entscheiderin Jessica Jagel; Projektmanagerinnen Hannah Novela (Hauptansprechpartnerin) und Carina Rehbock | Projektauftrag, Konzeption |
| Nutzung auf Windows-Laptops mit Edge | Trello / Konzeption |

## 2. Berufsfelder

Laut Infoblatt orientiert sich die Qualifizierung an **fünf Berufsfeldern** (Teilqualifikationen, TQ):

| Berufsfeld (Bezeichnung des Bildungsparks) | Lehrpläne erhalten | TQ-Bezeichnung im Lehrplan |
|---|---|---|
| Lagerlogistik, Handel & Versand | ja – Baustein 1, 2, 3 | „für die Ausbildungsberufe als Fachlagerist (IHK)“ |
| Gastronomie & Hauswirtschaft | ja – Baustein 1 bis 5 | „für die Ausbildungsberufe im Gastrobereich“ |
| Metalltechnik & Montage | ja – Baustein 2 (6 Abschnitte) | „für die Ausbildungsberufe Industriemechaniker, Feinwerkmechaniker, Maschinen- und Anlagenführer (HWK)“ |
| Garten- und Landschaftsbau | nein | – |
| Pflege & unterstützende Tätigkeiten | nein | – |

Die Berufsbild-Liste im Frontend (`apps/frontend/src/data/constants.ts`) verwendet genau diese fünf
Bezeichnungen. **„Reinigung & Gebäudepflege“** aus dem Figma-Mockup ist **kein** Berufsfeld des
Bildungsparks und wurde am 22.10.2026 entfernt. Das Backend-Konzept erwähnt „Dashboard nennt 7“ –
die vollständige Liste ist beim Auftraggeber zu bestätigen (offene Frage 3 im Konzept AP4).

## 3. Aufbau der Lehrpläne

```
Teilqualifizierung (TQ, je Berufsfeld)
└── Ausbildungsbaustein (nummeriert, mit Titel – z. B. „Baustein 1: Wareneingang“)
    └── Abschnitt (nummeriert)
        └── Lernziel (Freitext, z. B. „Güter entladen“)
            └── vier Stufen T · A · F · B
                ├── Spalte „Binnendifferenzierung“ = Kompetenzbeschreibung
                └── Spalte „Beispiel“ = konkrete Tätigkeit
```

| Lehrpläne | Bausteine | Lernziele (gezählt über die T-Zeilen) |
|---|---|---|
| TQ Lager: 3 Dokumente | 1 Wareneingang · 2 Innerbetrieblicher Transport · 3 Lagerung von Gütern | 6 + 5 + 5 = 16 |
| TQ Metall: 6 Dokumente | 2 Fügen von Bauteilen zu Baugruppen (Abschnitte 1–6) | 5 + 2 + 2 + 4 + 4 + 2 = 19 |
| TQ Gastro: 5 Dokumente | 1 Grundlagen/Arbeitssicherheit/Umweltschutz/Hygiene · 2 Küche und Zubereitung · 3 Service · 4 Lager/Warenwirtschaft · 5 Hygiene | 11 + 21 + 16 + 10 + 3 = 61 |
| **Summe: 14 Dokumente** | **9 Bausteine** | **96 Lernziele**, je Lernziel 4 Stufen |

**Datenqualität der Quelldateien** (relevant für jeden Import):

- Die Kopfzeile „Berufsanschlussfähige Teilqualifizierung Baustein N“ ist in 10 von 14 Dokumenten
  falsch (Copy-Paste): Lager Baustein 2 trägt „Baustein 1“, alle 6 Metall-Dokumente tragen
  „Baustein 1“ (sind Baustein 2), Gastro Baustein 3/4/5 tragen „Baustein 2“. Verlässlich ist nur die
  Zeile „Ausbildungs-baustein N“ im Tabellenkopf.
- Einzelne Beispielzellen sind leer, einzelne Zeilen enthalten Tippfehler oder Copy-Paste-Reste
  (z. B. Metall Abschnitt 1, Stufe F: „in neuen Situationen“ statt „in bekannten Situationen“).
- Abschnitts- und Lernzieltitel sind uneinheitlich formatiert (Groß-/Kleinschreibung, Leerzeichen).

## 4. Niveaustufen T · A · F · B

**Belegt** ist in den Lehrplänen ausschließlich:

- die vier Buchstaben als Spalte „Stufe“ und
- eine wiederkehrende Kompetenzformel je Stufe:

| Stufe | Kompetenzformel (wörtlich wiederkehrend) |
|---|---|
| T | „Beherrscht **einen erlernten** Arbeitsschritt …“ |
| A | „Beherrscht **einige erlernte** Arbeitsschritte …“ / „vorgegebene bekannte …“ |
| F | „Beherrscht erlernte Arbeitsschritte … und kann diese in **bekannten Situationen** anwenden“ |
| B | „Beherrscht die **gängigen** Arbeitsschritte … und kann diese in **neuen Situationen** anwenden“ |

**Nicht belegt** ist, wofür die Buchstaben stehen. Zwei Kandidaten:

| Variante | Herkunft | Bewertung |
|---|---|---|
| Tätigkeits-, Arbeitsplatz-, Berufsfeld-, Berufsbildorientiert | Vier-Stufen-Modell der harmonisierten Bildungsrahmenpläne der BAG WfbM („Binnendifferenzierung in vier Niveaustufen: tätigkeits-, arbeitsplatz-, berufsfeld- und berufsbildorientiert“); das Infoblatt des Bildungsparks formuliert „tätigkeits- bis berufsbildorientiert“; Initialen passen exakt zu T/A/F/B | **Arbeitshypothese seit 22.10.2026**, im Frontend verwendet |
| Talent-, Aufbau-, Fach-, Berufsstufe | Figma-Mockup vom 05.10.2026, von dort in Konzept AP4, Use-Case-Beschreibung und User Stories übernommen | keine Quelle beim Auftraggeber; am 22.10.2026 aus dem Frontend entfernt |

Die Projektplanung (23.09.) führte das Thema bereits als Risiko 3 („Stufen T/A/F/B in keiner
Unterlage definiert“) mit dem Plan, es am 06.10. beim Bildungspark zu klären. **Ein Ergebnis dieser
Klärung ist nirgends dokumentiert** → beim nächsten Termin mit Hannah Novela bestätigen lassen und
hier eintragen.

Quellen zum BAG-WfbM-Modell: [EvaBi-Studie (wbv, Open Access)](https://www.wbv.de/shop/openaccess-download/BB2202W014),
[Umsetzungsbegleitung BTHG, Heyder 2019](https://umsetzungsbegleitung-bthg.de/w/files/barrierefreie-pdfs/2019/p21_19_heyder_bf.pdf),
[Baier/Ebert/Kranert, Universität Würzburg](https://sonderpaedagogik.uni-wuerzburg.de/fileadmin/06040900/img/Forschung/MEGBAA/Vortrag_Baier__Ebert__Kranert.pdf).

## 5. Beispiel-Arbeitsblätter des Bildungsparks

| Datei | Merkmale |
|---|---|
| „Waren sicher ver-packen“ (5 Seiten) | Leichte Sprache mit Silbentrennung durch Bindestrich („Ver-packung“, „Hohl-raum-aus-füllung“), Anrede wechselt zwischen „du“ und „Sie“, 7 nummerierte Aufgaben (Nachdenken, Prüfen, Praxis-Übung, Malen, Hör-Test), Rückfragen an den Anleiter („Frage deinen Anleiter“), kleines Wörterbuch am Ende |
| „Warenannahme im Lager“ (3 Seiten) | Kopf mit Name/Datum/Themenfeld, Aufgabentypen: Reihenfolge nummerieren, Bilder verbinden, Werkzeug zuordnen, Strichliste zählen |

Beide Blätter tragen **weder Stufe noch Lernzielbezug** (Risiko 2 der Projektplanung). Sie sind die
Stilvorlage für die KI-Erstellung.

## 6. Festlegungen des Teams (keine Vorgaben des Auftraggebers)

| Festlegung | Herkunft |
|---|---|
| Vier Barrierefreiheits-Formate: Standard-Text, Mit Piktogrammen, Ohne Rechnen (mathefrei), Piktogramm + Mathefrei | Projektkonzeption / Mockup |
| Persona-Raster 4 Stufen × 4 Formate = 16 Personas A–P | Projektkonzeption / Mockup |
| Sprachformat „Leichte Sprache“ oder „Standardsprache“ | Mockup |
| Rollen Admin / Dozent/in / Assistent/in | Mockup, Trello |
| Pseudonyme Teilnehmerkennung (Beispiel „IW3-4421“) statt Namen | Trello-Story S2 („Iw3-Nummer Pflichtfeld“), Konzept AP4 |
| Verlaufsaktionen erstellt / bearbeitet / KI-angepasst / freigegeben / archiviert | Mockup |

## 7. Projektrahmen

| Thema | Belegter Stand |
|---|---|
| Ziele (Projektauftrag) | 1 Arbeitsfortschritt der Teilnehmer verfolgen · 2 Arbeitsblätter für unterschiedliche Profile erstellen · 3 Pflege/Übersicht der Lehrpläne · 4 Ablage der Teilnehmerprofile · 5 Such- und Filterfunktionen |
| Nicht-Ziele (Projektauftrag) | Benutzerverwaltung, automatische Zuordnung |
| MUSS (Konzeption) | Arbeitsblätter in verschiedenen Stufen erstellen · Stand anzeigen (behandelt / als Nächstes) · User Management und Speicherung von Content |
| Widerspruch | „Benutzerverwaltung“ als Nicht-Ziel vs. „User Management“ als MUSS → Team-Annahme: einfacher Login für Dozierende ja, Rollen-/Rechtesystem nein (Risiko 7, Bestätigung durch H. Novela ausstehend) |
| Scope-Lücke im Prototyp | Ziel 3 „Lehrpläne“ hat im Frontend keinen Menüpunkt (Use Cases UC-03/UC-06 beschreiben eine Lehrplan-Seite aus dem Figma-Klick-Dummy) |
| Termine 2026 | 23.09. Präsentation Projektplanung · 28.09. Projektkonzeptions-Bericht · 06.10. Vorstellung am Bildungspark · **Erster Prototyp am 13.10. auf den 23.10. verschoben** · 06.11. Release Candidate (Feature Freeze) · 16.11. Abschlusspräsentation (60 % der Note, inkl. LinkedIn-Post) · 07.12. Projektbericht (40 %) |
| Aufwand | ca. 40 PT (Projektauftrag); Planning Poker 23.09.: LZ 8, CH 8, AM 8, OO 5,5, SO 5,5, TN 5 |
| Budget | Sachmittel ca. 500 € Projekt; Betrieb ca. 35–80 €/Monat (Konzeption: LLM 20–50 €, Hosting 15–30 €) |
| Datenschutz | Teilnehmende sind Menschen mit Behinderung (§ 60 SGB IX): keine Namen, keine Diagnosen, keine Teilnehmerdaten an das LLM; AVV mit dem LLM-Anbieter |
| Werkzeuge laut Konzeption vs. Praxis | Konzeption nennt GitLab; tatsächlich liegt der Code auf GitHub (`ZipseLu/DHBW-Integrationsseminar-Bildungspark`), CI über GitHub Actions |

## 8. Offene Fragen an den Auftraggeber (Auszug, vollständig in Konzept AP4 Kap. 16)

1. Bedeutung der Stufen T/A/F/B (Abschnitt 4) bestätigen.
2. Vollständige Liste der Berufsfelder und Ausbildungsbausteine; dürfen die Lehrpläne als Few-Shots für das LLM verwendet werden?
3. Verbindliches Regelwerk für Leichte Sprache (Anrede „du“ oder „Sie“?), Piktogramm-Sets im Haus.
4. Ist die Verarbeitung von Lehrinhalten über einen externen LLM-Anbieter (aktuell Gemini, später Azure OpenAI) unter AVV akzeptabel?
5. Rechte der Rolle Assistent/in; wer gibt Arbeitsblätter frei?
