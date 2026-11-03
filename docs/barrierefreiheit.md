# Barrierefreiheit der Oberfläche (FE-15)

Prüfung der Weboberfläche nach **WCAG 2.1, Stufe AA** (Stand: 03.11.2026).
Geprüft wurden alle acht Seiten im hellen und im dunklen Modus.

## Vorgehen

| Prüfpunkt | Wie geprüft | WCAG |
| --- | --- | --- |
| Farbkontrast Text | Automatisch: für jedes sichtbare Textelement Kontrast zur tatsächlichen Hintergrundfarbe berechnet (inkl. Transparenz) | 1.4.3 |
| Tastaturbedienung | Automatisch: 45 × Tab je Seite, Fokusrahmen am fokussierten Element gemessen | 2.1.1, 2.4.7 |
| Namen von Bedienelementen | Buttons und Eingabefelder ohne zugänglichen Namen gesucht | 4.1.2 |
| Klickbare Nicht-Buttons | `div`/`span` mit Klick-Handler ohne Rolle gesucht | 2.1.1 |
| Sprache, Überschriften | `lang="de"`, Überschriftenhierarchie je Seite | 3.1.1, 1.3.1 |
| Bewegung | `prefers-reduced-motion` | 2.3.3 |

## Ergebnis vorher → nachher

| Befund | vorher (hell / dunkel) | nachher |
| --- | --- | --- |
| Texte unter 4,5 : 1 | 144 / 189 | 0 / 0 |
| Fokusrahmen in der Navigation unsichtbar (Primärfarbe auf Primärfarbe) | alle Seiten | heller Rahmen |
| Farbauswahl in den Einstellungen ohne Fokusrahmen | 10 Buttons | sichtbar |
| Buttons/Felder ohne Namen, klickbare `div`s | 0 | 0 |
| Sprunglink zum Inhalt | fehlte | vorhanden |
| Seitentitel im Browser-Tab | immer gleich | je Seite |

## Was geändert wurde

- **Kontrastsichere Farben** (`src/lib/kontrast.ts`, `themeFarben()` in `src/lib/settings.ts`):
  Akzent- und Primärfarbe sind frei wählbar. Beim Anwenden des Themes werden sie bei Bedarf
  abgedunkelt (helle Schrift auf Buttons) bzw. im Dunkelmodus aufgehellt (farbiger Text), bis 4,5 : 1 erreicht ist.
  Neue CSS-Variablen: `--accent-text`, `--primary-text`, `--danger`, `--success`, `--tint-success`,
  `--tint-info` und `--stufe-T|A|F|B-text`.
- **Kein Text mehr mit `opacity`**: abgeschwächte Hinweise („(optional)“, ausstehende Stationen) nutzen
  `--muted-foreground` oder gestrichelte Rahmen statt Transparenz.
- **Dunkelmodus**: Pastellflächen mit heller Schrift ersetzt (getönte Flächen bzw. feste Stufen-Badges).
- **Fokus**: heller Fokusrahmen in der Seitenleiste (`.fokus-hell`); Auswahlring der Farbkreise per
  `box-shadow`, damit der Fokusrahmen nicht überschrieben wird.
- **Sprunglink** „Zum Inhalt springen“ (erster Tab-Stopp) und `<main id="inhalt">`.
- **Seitentitel** `„<Seite> – Arbeitsblattverwaltung“`, damit Screenreader den Seitenwechsel ansagen.
- **Weniger Bewegung**: Animationen und Übergänge bei `prefers-reduced-motion: reduce` abgeschaltet.

## Regeln für neue Oberflächen

1. Farbiger Text auf Seitenflächen nur über die Variablen oben – keine Hex-Farben aus `LEVEL_STYLES`
   direkt auf `--card`/`--background` (im Dunkelmodus unlesbar). Auf den Pastellflächen (`s.bg`) ist `s.text` in Ordnung.
2. Text nicht über `opacity` abschwächen, sondern `--muted-foreground` verwenden.
3. Kein `outline: none` im `style`-Attribut – sonst verschwindet der Fokusrahmen.
4. Neue Buttons mit sichtbarem Text oder `aria-label`, Umschalter mit `aria-pressed`.

## Tests

`tests/unit/Barrierefreiheit.spec.tsx` prüft die Kontrastberechnung, **alle 72 Farbkombinationen**
(6 Akzent- × 6 Primärfarben × hell/dunkel) gegen 4,5 : 1 sowie Sprunglink, Landmarke und Seitentitel.

## Nicht automatisch prüfbar (manuell beim Abnahmetest QS-05)

- Bedienung mit echtem Screenreader (NVDA/VoiceOver): Reihenfolge und Ansagen in Dialogen
- Zoom auf 200 % und schmale Fenster (Seitenleiste)
- Verständlichkeit der Leichten Sprache in den erzeugten Arbeitsblättern (siehe QS-04)
