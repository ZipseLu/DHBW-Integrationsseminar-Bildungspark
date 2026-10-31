/**
 * Schemas der Teilnehmenden-API (BE-02).
 *
 * Datenschutz (§ 60 SGB IX): Ein Profil besteht nur aus einer pseudonymen
 * Kennung, einer Niveaustufe und dem Lernweg. Die Objekte sind `strict` –
 * unbekannte Felder wie `name` oder `diagnose` werden abgelehnt statt still
 * verworfen, damit niemand versehentlich personenbezogene Daten schickt.
 */
import { z } from 'zod'
import { FORMATE, STUFEN } from '../arbeitsblatt/schema.js'

export const STATIONS_STATUS = ['abgeschlossen', 'aktiv', 'ausstehend']
export const MAX_STATIONEN = 10

/** Pseudonyme Kennung, z. B. "IW3-4421" – Kleinschreibung wird in Großbuchstaben umgewandelt */
export const KENNUNG_RE = /^[A-Z][A-Z0-9]{1,4}-\d{1,6}$/
export const normalisiereKennung = (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value)
export const istKennung = (value) => typeof value === 'string' && KENNUNG_RE.test(normalisiereKennung(value))

const kennung = z.preprocess(
  normalisiereKennung,
  z.string().regex(KENNUNG_RE, 'muss eine pseudonyme Kennung wie IW3-4421 sein (keine Namen)'),
)

/** Kalenderdatum YYYY-MM-DD; leer oder null = kein Datum */
const datum = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'muss ein Datum im Format JJJJ-MM-TT sein')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), 'ist kein gültiges Datum')
    .nullable(),
)

export const StationSchema = z
  .strictObject({
    berufsfeld: z.string().trim().min(1, 'darf nicht leer sein').max(120),
    stufe: z.enum(STUFEN),
    format: z.enum(FORMATE),
    status: z.enum(STATIONS_STATUS).default('ausstehend'),
    fortschritt: z.number().int().min(0).max(100).default(0),
    startDatum: datum.default(null),
    endDatum: datum.default(null),
    blaetterErledigt: z.number().int().min(0).max(10_000).default(0),
  })
  .refine((s) => !s.startDatum || !s.endDatum || s.endDatum >= s.startDatum, { message: 'endDatum liegt vor startDatum', path: ['endDatum'] })

const stationen = z
  .array(StationSchema)
  .max(MAX_STATIONEN, `höchstens ${MAX_STATIONEN} Stationen`)
  .default([])
  .superRefine((liste, ctx) => {
    const gesehen = new Set()
    liste.forEach((station, index) => {
      const key = station.berufsfeld.toLowerCase()
      if (gesehen.has(key)) ctx.addIssue({ code: 'custom', message: `Berufsfeld „${station.berufsfeld}“ kommt doppelt vor`, path: [index, 'berufsfeld'] })
      gesehen.add(key)
    })
    if (liste.filter((station) => station.status === 'aktiv').length > 1) {
      ctx.addIssue({ code: 'custom', message: 'höchstens eine Station darf aktiv sein' })
    }
  })

/** Body von POST /api/teilnehmende */
export const CreateSchema = z.strictObject({
  kennung,
  stufe: z.enum(STUFEN),
  stationen,
})

/** Body von PUT /api/teilnehmende/:kennung – ersetzt Stufe und kompletten Lernweg */
export const UpdateSchema = z.strictObject({
  kennung: kennung.optional(),
  stufe: z.enum(STUFEN),
  stationen,
})
