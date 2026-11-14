/**
 * Lehrpläne für `npm run db:seed`: übernimmt apps/backend/data/lehrplaene.json in die
 * Datenbank (Migration 004), wenn dort noch keine Lernziele stehen.
 *
 * Die Datei erzeugt `npm run import:lehrplaene` aus den DOCX des Bildungsparks; sie ist
 * nicht im Repository (Kundendaten, Repo öffentlich). Auf einem Server reicht es, die
 * Datei nach apps/backend/data/ zu kopieren und `npm run db:seed` auszuführen.
 *
 * Eine kaputte oder veraltete Datei bricht den Seed nicht ab: `LehrplanDatenError`
 * wird nur als Warnung geloggt, der Rest (Arbeitsblätter, Konten, Teilnehmende,
 * Zuordnungen) läuft weiter.
 */
import { LEHRPLAENE_FILE, loadLehrplaene } from '../routes/lehrplaene.js'
import * as repo from './repository.js'
import { LehrplanDatenError } from './repository.js'

export async function seedLehrplaene({ file = LEHRPLAENE_FILE, log = () => {} } = {}) {
  if ((await repo.count()) > 0) {
    log('[seed] Lehrpläne stehen schon in der Datenbank – nichts zu tun (neu einlesen: `npm run import:lehrplaene`).')
    return { angelegt: 0, uebersprungen: true }
  }
  try {
    const daten = await loadLehrplaene(file)
    if (!daten) {
      log('[seed] Keine data/lehrplaene.json – Lehrpläne mit `npm run import:lehrplaene` aus den DOCX einlesen.')
      return { angelegt: 0, uebersprungen: true }
    }
    const { lehrplaene, lernziele } = await repo.ersetzeAlle(daten.lernziele)
    log(`[seed] ${lernziele} Lernziele aus ${lehrplaene} Lehrplänen in die Datenbank übernommen (data/lehrplaene.json).`)
    return { angelegt: lernziele, uebersprungen: false }
  } catch (error) {
    // Eine alte oder kaputte Datei darf den restlichen Seed (Arbeitsblätter, Konten,
    // Teilnehmende, Zuordnungen) nicht verhindern – nur warnen und überspringen.
    if (error instanceof LehrplanDatenError) {
      log(`[seed] WARNUNG: Lehrpläne nicht übernommen (${error.message}) – der restliche Seed läuft weiter.`)
      return { angelegt: 0, uebersprungen: true }
    }
    throw error
  }
}
