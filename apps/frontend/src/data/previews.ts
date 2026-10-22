import type { Level } from '@/types'

type PiktoItem = { icon: string; label: string; task: string }

/** Beispielaufgaben fuer Piktogramm-Varianten, je Berufsbild-Gruppe */
const PIKTO_PREVIEW: Record<'lager' | 'kueche' | 'reinigung', PiktoItem[]> = {
  lager: [
    { icon: '📦', label: 'Paket', task: 'Zeige auf das Paket.' },
    { icon: '🏷️', label: 'Etikett', task: 'Klebe das Etikett auf das Paket.' },
    { icon: '🚚', label: 'LKW', task: 'Der LKW kommt. Was machst du?' },
    { icon: '✅', label: 'Haken', task: 'Hake ab, wenn das Paket fertig ist.' },
  ],
  kueche: [
    { icon: '🧼', label: 'Hände waschen', task: 'Erst Hände waschen!' },
    { icon: '🧤', label: 'Handschuhe', task: 'Ziehe Handschuhe an.' },
    { icon: '🍳', label: 'Kochen', task: 'Stelle die Pfanne auf den Herd.' },
    { icon: '🌡️', label: 'Temperatur', task: 'Kontrolliere die Temperatur.' },
  ],
  reinigung: [
    { icon: '🧹', label: 'Besen', task: 'Fege den Boden zuerst.' },
    { icon: '🪣', label: 'Eimer', task: 'Fülle den Eimer mit Wasser.' },
    { icon: '🧽', label: 'Schwamm', task: 'Wische die Oberfläche ab.' },
    { icon: '🚫', label: 'Stopp', task: 'Schild aufstellen: Rutschgefahr!' },
  ],
}

export function piktoPreviewFor(berufsbild: string): PiktoItem {
  if (berufsbild === 'Küche & Gastronomie') return PIKTO_PREVIEW.kueche[0]
  if (berufsbild === 'Reinigung & Gebäudepflege') return PIKTO_PREVIEW.reinigung[0]
  return PIKTO_PREVIEW.lager[0]
}

/** Hinweise und Beispielaufgaben je Niveaustufe fuer die Varianten-Vorschau */
export const TRANSFORM_PREVIEWS: Record<Level, { aufgaben: string[]; hinweis: string }> = {
  T: {
    hinweis: 'Sehr kurze Sätze. Einfache Wörter. Bilder helfen.',
    aufgaben: [
      'Schau das Bild an. Was siehst du?',
      'Zeige mit dem Finger auf die Sicherheitsausrüstung.',
      'Male einen Helm. Ein Helm schützt dich.',
    ],
  },
  A: {
    hinweis: 'Kurze Sätze. Bekannte Wörter. Aufgaben Schritt für Schritt.',
    aufgaben: [
      'Lies die Sicherheitsregeln. Unterstreiche wichtige Wörter.',
      'Was musst du VOR der Arbeit anziehen? Schreibe zwei Dinge auf.',
      'Ordne die Schritte in die richtige Reihenfolge.',
    ],
  },
  F: {
    hinweis: 'Fachbegriffe werden erklärt. Aufgaben mit Kontext.',
    aufgaben: [
      'Beschreibe den Unterschied zwischen PSA Klasse I und Klasse II.',
      'Erkläre, warum Sicherheitsschuhe wichtig sind. Nenne zwei Gründe.',
      'Fülle das Sicherheitsprotokoll für einen Arbeitsunfall aus.',
    ],
  },
  B: {
    hinweis: 'Vollständige Fachsprache. Komplexe Aufgaben. Eigenständiges Arbeiten.',
    aufgaben: [
      'Analysiere die Gefährdungsbeurteilung und identifiziere drei Risikobereiche.',
      'Erstelle einen Maßnahmenplan zur Unfallprävention gemäß DGUV Vorschrift 1.',
      'Bewerte die gegebene Situation und leite geeignete Schutzmaßnahmen ab.',
    ],
  },
}
