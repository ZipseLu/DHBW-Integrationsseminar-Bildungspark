import type { AufgabeTyp } from '@/lib/api'

/** Headings of the task types – same as AUFGABEN_TYP_LABEL in apps/backend/src/arbeitsblatt/schema.js */
export const AUFGABEN_TYP_LABEL: Record<AufgabeTyp, string> = {
  offen: 'Nach-denken',
  reihenfolge: 'Reihenfolge',
  zuordnen: 'Zuordnen',
  ankreuzen: 'Ankreuzen',
  malen: 'Malen',
  praxis: 'Praxis-Übung',
}

/** Symbols of the pictogram whitelist – copy of PIKTOGRAMME in apps/backend/src/arbeitsblatt/schema.js */
export const PIKTOGRAMM_SYMBOL: Record<string, string> = {
  denken: '💭', lesen: '📖', schreiben: '✏️', sprechen: '🗣️', fragen: '❓', anleiter: '🧑‍🏫', reihenfolge: '🔢',
  verbinden: '🔗', ankreuzen: '☑️', malen: '🎨', zaehlen: '🧮', uhr: '⏰', achtung: '⚠️', stopp: '🛑', haende: '🤲',
  handschuhe: '🧤', helm: '⛑️', schutzbrille: '🥽', werkzeug: '🔧', messer: '🔪', paket: '📦', lkw: '🚚', hubwagen: '🛒',
  regal: '🗄️', waage: '⚖️', liste: '📋', computer: '💻', besen: '🧹', topf: '🍲', teller: '🍽️', kuehlschrank: '🧊', pflanze: '🌱',
}
