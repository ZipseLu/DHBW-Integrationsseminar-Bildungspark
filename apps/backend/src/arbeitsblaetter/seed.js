/**
 * Beispieldaten für die Arbeitsblatt-Liste (`npm run db:seed`).
 *
 * Erzeugt mit dem Mock der Generierung (kein API-Key nötig) je Lernziel ein
 * Arbeitsblatt pro Stufe T/A/F/B, Blätter desselben Lernziels verweisen über
 * `elternId` aufeinander. Lernziele kommen aus data/lehrplaene.json
 * (`npm run import:lehrplaene`); fehlt die Datei, aus einer kleinen festen Liste.
 */
import { buildMockWorksheet } from '../arbeitsblatt/mock.js'
import { STUFEN } from '../arbeitsblatt/schema.js'
import { loadLehrplaene } from '../routes/lehrplaene.js'
import * as repo from './repository.js'

const FORMAT_JE_STUFE = { T: 'piktogramm', A: 'piktogramm', F: 'text', B: 'text' }
const AUTOREN = ['C. Hager', 'T. Neumann', 'S. Oturucu', 'A. Mustajbegovic', 'O. Oláh', 'L. Zipse']

const bsp = (kompetenz, beispiel) => ({ kompetenz, beispiel })

/** Fallback ohne Lehrplan-Import: vier Lernziele aus drei Berufsfeldern (docs/fachliche-grundlagen.md) – 16 Blätter, also mehr als eine Seite */
export const FALLBACK_LERNZIELE = [
  {
    berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 1, ausbildungsbaustein: 'Wareneingang', titel: 'Güter entladen',
    niveaus: {
      T: bsp('Beherrscht einen erlernten Arbeitsschritt bei der Entladung von Gütern', 'Informiert den Anleiter, dass ein LKW zur Entladung bereit steht.'),
      A: bsp('Beherrscht einige erlernte Arbeitsschritte bei der Entladung von Gütern', 'Übernimmt bei der Entladung bekannter Güter vorgegebene Aufgaben.'),
      F: bsp('Beherrscht erlernte Arbeitsschritte bei der Entladung von Gütern und kann diese in bekannten Situationen anwenden', 'Kontrolliert den Lieferschein und übernimmt den innerbetrieblichen Transport.'),
      B: bsp('Beherrscht die gängigen Arbeitsschritte bei der Entladung von Gütern und kann diese in neuen Situationen anwenden', 'Wählt das geeignete Transportmittel aus.'),
    },
  },
  {
    berufsfeld: 'Gastronomie & Hauswirtschaft', baustein: 2, ausbildungsbaustein: 'Arbeiten in der Küche', titel: 'Obst und Gemüse vorbereiten',
    niveaus: {
      T: bsp('Beherrscht einen erlernten Arbeitsschritt bei der Vorbereitung von Obst und Gemüse', 'Wäscht Obst wie gezeigt.'),
      A: bsp('Beherrscht einige erlernte Arbeitsschritte bei der Vorbereitung von Obst und Gemüse', 'Wäscht und schält bekanntes Gemüse.'),
      F: bsp('Beherrscht erlernte Arbeitsschritte bei der Vorbereitung von Obst und Gemüse und kann diese in bekannten Situationen anwenden', 'Bereitet einen Obstsalat nach Rezept vor.'),
      B: bsp('Beherrscht die gängigen Arbeitsschritte bei der Vorbereitung von Obst und Gemüse und kann diese in neuen Situationen anwenden', 'Plant die Vorbereitung für ein neues Gericht.'),
    },
  },
  {
    berufsfeld: 'Lagerlogistik, Handel & Versand', baustein: 3, ausbildungsbaustein: 'Lagerung von Gütern', titel: 'Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden sowie Güter zur Lagerung vorbereiten',
    niveaus: {
      T: bsp('Beherrscht einen erlernten Arbeitsschritt bei der Auszeichnung und/oder Sortierung der Güter', 'Güter auszeichnen und sortieren'),
      A: bsp('Beherrscht einige erlernte Arbeitsschritte bei der Auszeichnung und/oder Sortierung der Güter', 'Güter auszeichnen, sortieren und zu Lager- und Verkaufseinheiten bündeln'),
      F: bsp('Beherrscht erlernte Arbeitsschritte bei der Auszeichnung, Sortierung und Bildung von Lager- und Verkaufseinheiten und kann diese in bekannten Situationen anwenden', 'Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden sowie Güter zur Lagerung vorbereiten'),
      B: bsp('Beherrscht die gängigen Arbeitsschritte bei der Auszeichnung, Sortierung und Bildung von Lager- und Verkaufseinheiten und kann diese in neuen Situationen anwenden', 'Selbständig Güter auszeichnen, sortieren, Lager- und Verkaufseinheiten bilden und Ladungsträger aussuchen'),
    },
  },
  {
    berufsfeld: 'Metalltechnik & Montage', baustein: 2, ausbildungsbaustein: 'Fügen von Bauteilen zu Baugruppen', titel: 'Bauteile nach Montageplan zusammensetzen',
    niveaus: {
      T: bsp('Beherrscht eine erlernte Anwendung eines Montageplans', 'Teile nach Montageplan heraussuchen.'),
      A: bsp('Beherrscht eine vorgegebene bekannte Anwendung eines Montageplans', 'Teile nach Montageplan kontrollieren.'),
      F: bsp('Beherrscht die erlernte Anwendung eines Montageplans und kann diese in bekannten Situationen anwenden', 'Montageplan auswählen und Bauteile nach Maß kontrollieren.'),
      B: bsp('Beherrscht die gängige Anwendung eines Montageplans und kann diese in neuen Situationen anwenden', 'Montageplan anwenden und Handskizzen erstellen.'),
    },
  },
]

/** Nimmt aus einer Lernzielliste je Berufsfeld gleichmäßig verteilt `anzahl` Einträge */
export function waehleLernziele(lernziele, anzahl) {
  const nachBerufsfeld = new Map()
  for (const lz of lernziele) {
    if (!nachBerufsfeld.has(lz.berufsfeld)) nachBerufsfeld.set(lz.berufsfeld, [])
    nachBerufsfeld.get(lz.berufsfeld).push(lz)
  }
  const gruppen = [...nachBerufsfeld.values()]
  const auswahl = []
  for (let i = 0; auswahl.length < anzahl && gruppen.some((g) => g.length > i); i += 1) {
    for (const gruppe of gruppen) if (gruppe[i] && auswahl.length < anzahl) auswahl.push(gruppe[i])
  }
  return auswahl
}

/**
 * @param {object} [options]
 * @param {number}  [options.lernziele=6]   Anzahl Lernziele (je 4 Blätter)
 * @param {boolean} [options.reset=false]   Vorher alle Blätter löschen
 * @param {Function}[options.log]
 * @returns {Promise<{ angelegt: number, uebersprungen: boolean, quelle: string }>}
 */
export async function seedArbeitsblaetter({ lernziele: anzahl = 6, reset = false, log = () => {} } = {}) {
  if (!Number.isInteger(anzahl) || anzahl < 1) throw new Error('lernziele muss eine ganze Zahl ≥ 1 sein')

  if (!reset && (await repo.count()) > 0) {
    log('[seed] Es gibt schon Arbeitsblätter – nichts zu tun. Mit `npm run db:seed -- --reset` neu befüllen.')
    return { angelegt: 0, uebersprungen: true, quelle: null }
  }

  // Lernziele zuerst laden – scheitert das (kaputte JSON-Datei), bleibt der Bestand unangetastet
  const importiert = await loadLehrplaene()
  const quelle = importiert ? 'data/lehrplaene.json' : 'eingebaute Beispiel-Lernziele'
  const auswahl = waehleLernziele(importiert?.lernziele ?? FALLBACK_LERNZIELE, anzahl)

  if (reset) {
    await repo.deleteAll()
    log('[seed] Alle vorhandenen Arbeitsblätter gelöscht (--reset).')
  }

  let angelegt = 0
  for (const [i, lernziel] of auswahl.entries()) {
    let elternId = null
    for (const [j, stufe] of STUFEN.entries()) {
      const format = FORMAT_JE_STUFE[stufe]
      const worksheet = buildMockWorksheet({ lernziel, stufe, format, sprache: 'Leichte Sprache' })
      const blatt = await repo.create({
        worksheet,
        meta: { provider: 'gemini', model: 'mock', mocked: true, promptVersion: '1.0.1' },
        erstelltVon: AUTOREN[(i + j) % AUTOREN.length],
        elternId,
        status: i === 0 && stufe === 'T' ? 'freigegeben' : 'entwurf',
        favorit: j === 0 && i % 2 === 0,
        notiz: 'Beispieldaten (npm run db:seed)',
      })
      elternId ??= blatt.id
      angelegt += 1
    }
  }
  log(`[seed] ${angelegt} Arbeitsblätter aus ${auswahl.length} Lernzielen angelegt (Quelle: ${quelle}).`)
  return { angelegt, uebersprungen: false, quelle }
}
