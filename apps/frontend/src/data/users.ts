import type { StaffRole, StaffUser } from '@/types'

/**
 * Der Prototyp hat keine Anmeldung. Angezeigt wird immer dieser Benutzer,
 * damit alle Menuepunkte (auch die Benutzerverwaltung fuer Admins) sichtbar sind.
 * Die echte Anmeldung kommt spaeter ueber das Backend.
 *
 * Name und Adresse sind Platzhalter aus dem Projektteam (reservierte
 * .example-Domain), keine echten Konten des Bildungsparks.
 */
export const CURRENT_USER: StaffUser = {
  id: 'u1',
  name: 'Celine Hager',
  initials: 'CH',
  role: 'admin',
  email: 'c.hager@bildungspark.example',
  createdAt: '2026-09-23',
}

/** Beispiel-Mitarbeiterkonten fuer die Benutzerverwaltung (Platzhalter, keine echten Konten) */
export const STAFF_USERS: readonly StaffUser[] = [
  CURRENT_USER,
  { id: 'u2', name: 'A. Mustajbegovic', initials: 'AM', role: 'dozent', email: 'a.mustajbegovic@bildungspark.example', createdAt: '2026-09-23' },
  { id: 'u3', name: 'T. Neumann', initials: 'TN', role: 'dozent', email: 't.neumann@bildungspark.example', createdAt: '2026-09-30' },
  { id: 'u4', name: 'S. Oturucu', initials: 'SO', role: 'assistent', email: 's.oturucu@bildungspark.example', createdAt: '2026-10-06' },
]

export const ROLE_COLORS: Record<StaffRole, { bg: string; color: string }> = {
  admin: { bg: '#FAD9C8', color: '#7A2E00' },
  dozent: { bg: '#D0E4F7', color: '#1A3A5C' },
  assistent: { bg: '#D4EDDA', color: '#1A5C32' },
}

/** "Celine Hager" -> "CH", "A. Mustajbegovic" -> "AM" */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
