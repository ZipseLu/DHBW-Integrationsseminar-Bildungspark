import type { StaffUser } from '@/types'

/**
 * Der Prototyp hat keine Anmeldung. Angezeigt wird immer dieser Benutzer,
 * damit alle Menuepunkte (auch die Benutzerverwaltung fuer Admins) sichtbar sind.
 * Die echte Anmeldung kommt spaeter ueber das Backend.
 */
export const CURRENT_USER: StaffUser = {
  id: 'u1',
  name: 'Celine Hager',
  initials: 'CH',
  role: 'admin',
  email: 'c.hager@bildungspark.de',
}
