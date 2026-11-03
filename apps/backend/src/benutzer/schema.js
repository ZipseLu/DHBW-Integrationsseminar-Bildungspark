/**
 * Schemas der Benutzerverwaltung (BE-03).
 *
 * Konten der Mitarbeitenden des Bildungsparks (Tabelle `users`). Rollen wie im
 * Frontend: admin, dozent, assistent. Objekte sind `strict`, damit Tippfehler
 * in Feldnamen (z. B. `role` statt `rolle`) auffallen statt still verworfen zu werden.
 */
import { z } from 'zod'

export const ROLLEN = ['admin', 'dozent', 'assistent']
export const MIN_PASSWORT = 8

const name = z.string().trim().min(2, 'muss mindestens 2 Zeichen haben').max(120)
const email = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.string().max(255).email('ist keine gültige E-Mail-Adresse'),
)
const passwort = z.string().min(MIN_PASSWORT, `muss mindestens ${MIN_PASSWORT} Zeichen haben`).max(200)

/** Body von POST /api/benutzer */
export const CreateSchema = z.strictObject({
  name,
  email,
  rolle: z.enum(ROLLEN).default('dozent'),
  passwort,
})

/** Body von PATCH /api/benutzer/:id – mindestens ein Feld */
export const PatchSchema = z
  .strictObject({
    name: name.optional(),
    email: email.optional(),
    rolle: z.enum(ROLLEN).optional(),
    passwort: passwort.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: 'Mindestens eines der Felder name, email, rolle oder passwort angeben' })
