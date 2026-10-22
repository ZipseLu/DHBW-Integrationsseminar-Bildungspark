/**
 * Testdaten fuer die Arbeitsblatt-Tests.
 * Das Lernziel "Gueter entladen" stammt aus dem Lehrplan TQ Lager, Baustein 1
 * (identisch mit apps/frontend/src/data/worksheets.ts, Eintrag 2).
 */
export const LERNZIEL_GUETER_ENTLADEN = {
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  baustein: 1,
  ausbildungsbaustein: 'Wareneingang',
  titel: 'Güter entladen',
  niveaus: {
    T: { kompetenz: 'Beherrscht einen erlernten Arbeitsschritt bei der Entladung von Gütern', beispiel: 'Informiert den Anleiter, dass ein LKW zur Entladung bereit steht.' },
    A: { kompetenz: 'Beherrscht einige erlernte Arbeitsschritte bei der Entladung von Gütern', beispiel: 'Übernimmt bei der Entladung von bekannten Gütern vorgegebene Aufgaben, zum Beispiel das kontrollierte Gut mit dem Hubwagen abtransportieren.' },
    F: { kompetenz: 'Beherrscht erlernte Arbeitsschritte bei der Entladung von Gütern und kann diese in bekannten Situationen anwenden', beispiel: 'Kontrolliert den Lieferschein und übernimmt den innerbetrieblichen Transport.' },
    B: { kompetenz: 'Beherrscht die gängigen Arbeitsschritte bei der Entladung von Gütern und kann diese in neuen Situationen anwenden', beispiel: 'Kontrolliert den Lieferschein und übernimmt den innerbetrieblichen Transport. Wählt hierfür das geeignete Transportmittel aus.' },
  },
}

export const REQUEST_T_TEXT = {
  lernziel: LERNZIEL_GUETER_ENTLADEN,
  stufe: 'T',
  format: 'text',
  sprache: 'Leichte Sprache',
}

/** Ein gueltiges Arbeitsblatt, wie es das Modell liefern koennte (Stufe T, 4 Aufgaben) */
export const WORKSHEET_T_TEXT = {
  titel: 'Der LKW ist da',
  berufsfeld: 'Lagerlogistik, Handel & Versand',
  stufe: 'T',
  format: 'text',
  sprache: 'Leichte Sprache',
  lernziel: 'Güter entladen',
  einleitung: 'Ein LKW bringt Ware. Du sagst dem Anleiter Bescheid. Das ist dein Arbeits-schritt.\nAchtung: Der LKW fährt rückwärts. Bleib hinter der gelben Linie.',
  aufgaben: [
    { nr: 1, typ: 'ankreuzen', anweisung: 'Was machst du, wenn der LKW kommt? Kreuze an.', optionen: ['Ich sage dem Anleiter Bescheid.', 'Ich gehe nach Hause.'], loesung: 'Ich sage dem Anleiter Bescheid.' },
    { nr: 2, typ: 'zuordnen', anweisung: 'Verbinde das Bild mit dem Wort.', optionen: ['LKW | Bringt die Ware', 'Anleiter | Hilft dir'] },
    { nr: 3, typ: 'malen', anweisung: 'Male einen LKW in den Rahmen.' },
    { nr: 4, typ: 'praxis', anweisung: 'Ein LKW steht am Tor. Sage es dem Anleiter. Frage deinen Anleiter: War das richtig?' },
  ],
  woerterbuch: [
    { wort: 'Ent-laden', erklaerung: 'Die Ware aus dem LKW holen.' },
    { wort: 'Anleiter', erklaerung: 'Die Person, die dir die Arbeit zeigt.' },
  ],
  hinweisAnleiter: 'Zeit: 20 Minuten. Aufgabe 4 am Tor üben.',
}
