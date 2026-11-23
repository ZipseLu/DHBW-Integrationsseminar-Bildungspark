/**
 * Validation of per-account UI settings (FE-20).
 *
 * The fields mirror `AppSettings` in apps/frontend/src/types.ts. Everything is
 * optional so an older client can send only the values it knows; the frontend
 * merges the result with its own defaults. Unknown fields are rejected, so a
 * typo like `darkmode` does not silently disappear.
 */
import { z } from 'zod'

const hexFarbe = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'muss eine Hex-Farbe wie #009FE3 sein')

export const EinstellungenSchema = z
  .strictObject({
    darkMode: z.boolean().optional(),
    accentColor: hexFarbe.optional(),
    primaryColor: hexFarbe.optional(),
    sidebarCompact: z.boolean().optional(),
    defaultBerufsbild: z.string().trim().min(1).max(120).optional(),
    aiAutoExpand: z.boolean().optional(),
    showPersonaBadges: z.boolean().optional(),
    language: z.enum(['de', 'en']).optional(),
    dateFormat: z.enum(['DD.MM.YYYY', 'YYYY-MM-DD']).optional(),
    exportFormat: z.enum(['docx', 'pdf']).optional(),
    emailNotifications: z.boolean().optional(),
    worksheetReminders: z.boolean().optional(),
    autoSave: z.boolean().optional(),
  })
  .refine((werte) => Object.keys(werte).length > 0, { message: 'Mindestens eine Einstellung angeben' })

/** Account identification in the prototype: email of the displayed account (FE-20). */
export const KontoSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.string().max(255).email('ist keine gültige E-Mail-Adresse'),
)
