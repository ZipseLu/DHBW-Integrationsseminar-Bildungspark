/**
 * Schemas of the user administration (BE-03).
 *
 * Staff accounts of the Bildungspark (table `users`). Roles as in the frontend:
 * admin, dozent, assistent. Objects are `strict`, so typos in field names
 * (e.g. `role` instead of `rolle`) are rejected instead of silently dropped.
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

/** Body of POST /api/benutzer */
export const CreateSchema = z.strictObject({
  name,
  email,
  rolle: z.enum(ROLLEN).default('dozent'),
  passwort,
})

/** Body of PATCH /api/benutzer/:id – at least one field */
export const PatchSchema = z
  .strictObject({
    name: name.optional(),
    email: email.optional(),
    rolle: z.enum(ROLLEN).optional(),
    passwort: passwort.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: 'Mindestens eines der Felder name, email, rolle oder passwort angeben' })
