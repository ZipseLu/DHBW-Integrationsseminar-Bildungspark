/**
 * Schema der Lehrplandaten, die in die Datenbank übernommen werden (Migration 004).
 *
 * Gleiche Form wie ein Eintrag in data/lehrplaene.json (scripts/import-lehrplaene.js):
 *   { id, berufsfeld, tq, baustein, ausbildungsbaustein, abschnitt, titel, niveaus: { T, A, F, B }, quelle }
 * Geprüft wird vor dem Schreiben, damit eine kaputte Datei eine verständliche Meldung
 * bringt statt eines Datenbankfehlers mitten im Import.
 */
import { z } from 'zod'
import { STUFEN } from './parser.js'

const niveau = z.object({
  kompetenz: z.string().max(1000).default(''),
  beispiel: z.string().max(1000).nullable().default('').transform((value) => value ?? ''),
})

const LEERES_NIVEAU = { kompetenz: '', beispiel: '' }

export const LernzielImportSchema = z.object({
  id: z.number().int().positive(),
  berufsfeld: z.string().trim().min(1).max(120),
  tq: z.string().max(255).nullish().transform((value) => value ?? null),
  baustein: z.number().int().min(0).max(255).nullish().transform((value) => value ?? null),
  ausbildungsbaustein: z.string().max(200).nullish().transform((value) => value ?? null),
  abschnitt: z.number().int().min(0).max(255).nullish().transform((value) => value ?? null),
  titel: z.string().trim().min(1).max(500),
  niveaus: z
    .object(Object.fromEntries(STUFEN.map((stufe) => [stufe, niveau.optional()])))
    .default({})
    .transform((niveaus) => Object.fromEntries(STUFEN.map((stufe) => [stufe, niveaus[stufe] ?? LEERES_NIVEAU]))),
  quelle: z.string().trim().min(1).max(255),
})

/** Alle Lernziele eines Imports – jede ID nur einmal */
export const LehrplanImportSchema = z.array(LernzielImportSchema).superRefine((lernziele, ctx) => {
  const gesehen = new Set()
  lernziele.forEach((lernziel, index) => {
    if (gesehen.has(lernziel.id)) ctx.addIssue({ code: 'custom', message: `Lernziel-ID ${lernziel.id} kommt doppelt vor`, path: [index, 'id'] })
    gesehen.add(lernziel.id)
  })
})
