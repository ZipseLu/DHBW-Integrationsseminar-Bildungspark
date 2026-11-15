import type { Level } from '@/types'

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
