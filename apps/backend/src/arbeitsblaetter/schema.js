/**
 * Schemas der Arbeitsblatt-Verwaltung (gespeicherte Blätter).
 *
 * Das Arbeitsblatt selbst (`inhalt`) folgt dem WorksheetSchema der Generierung
 * in ../arbeitsblatt/schema.js – ein Schema für KI-Ausgabe, Word-Export und
 * Datenbank. Hier kommen nur die Felder der Verwaltung dazu: Status, Favorit,
 * Verlauf, Filter und Seiten.
 */
import { z } from 'zod'
import { FORMATE, SPRACHEN, STUFEN, WorksheetSchema } from '../arbeitsblatt/schema.js'

export const STATUS = ['entwurf', 'freigegeben', 'archiviert']
export const AKTIONEN = ['erstellt', 'bearbeitet', 'KI-angepasst', 'freigegeben', 'archiviert']
export const SORTIERUNGEN = ['neueste', 'aelteste', 'titel']

export const PRO_SEITE_STANDARD = 15
export const PRO_SEITE_MAX = 100

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value)

const uuid = z.string().regex(UUID_RE, 'muss eine UUID sein')
const kurzerText = (max) => z.string().trim().max(max)

/** Was die Generierung als `meta` liefert – wird zur Nachvollziehbarkeit mitgespeichert */
export const KiMetaSchema = z
  .object({
    provider: z.string().max(40).optional(),
    model: z.string().max(80).nullable().optional(),
    mocked: z.boolean().optional(),
    promptVersion: z.string().max(20).optional(),
    validation: z.object({ ok: z.boolean(), hinweise: z.array(z.string().max(500)).max(50) }).optional(),
  })
  .strip()

/** Body von POST /api/arbeitsblaetter */
export const CreateSchema = z.object({
  worksheet: WorksheetSchema,
  /** `meta` aus POST /api/ai/arbeitsblatt – vorhanden = von der KI erzeugt */
  meta: KiMetaSchema.nullable().optional(),
  erstelltVon: kurzerText(120).optional(),
  elternId: uuid.nullable().optional(),
  status: z.enum(STATUS).default('entwurf'),
  favorit: z.boolean().default(false),
  notiz: kurzerText(500).optional(),
})

/** Body von PATCH /api/arbeitsblaetter/:id – mindestens ein Feld */
export const PatchSchema = z
  .object({
    worksheet: WorksheetSchema.optional(),
    status: z.enum(STATUS).optional(),
    favorit: z.boolean().optional(),
    /** Nur bei `worksheet`: 'bearbeitet' (Standard) oder 'KI-angepasst' */
    aktion: z.enum(['bearbeitet', 'KI-angepasst']).optional(),
    autor: kurzerText(120).optional(),
    notiz: kurzerText(500).optional(),
  })
  .refine((body) => body.worksheet !== undefined || body.status !== undefined || body.favorit !== undefined, {
    message: 'Mindestens eines der Felder worksheet, status oder favorit angeben',
  })

// --- Query von GET /api/arbeitsblaetter ------------------------------------

/** "T,A" -> ['T','A']; akzeptiert auch mehrfach gesetzte Parameter (?stufe=T&stufe=A) */
const listeAus = (werte) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === '') return undefined
      const roh = Array.isArray(value) ? value : String(value).split(',')
      return roh.map((v) => v.trim()).filter(Boolean)
    },
    z.array(z.enum(werte)).min(1).optional(),
  )

const bool = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined
  if (value === true || value === 'true' || value === '1') return true
  if (value === false || value === 'false' || value === '0') return false
  return value
}, z.boolean().optional())

const ganzzahl = (min, max, fallback) =>
  z.preprocess((value) => (value === undefined || value === '' ? fallback : value), z.coerce.number().int().min(min).max(max))

export const ListQuerySchema = z.object({
  q: kurzerText(200).optional(),
  berufsfeld: kurzerText(120).optional(),
  baustein: z.preprocess((v) => (v === undefined || v === '' ? undefined : v), z.coerce.number().int().min(0).max(99).optional()),
  ausbildungsbaustein: kurzerText(200).optional(),
  stufe: listeAus(STUFEN),
  format: listeAus(FORMATE),
  sprache: listeAus(SPRACHEN),
  /** Standard: alles außer archiviert. 'alle' zeigt auch archivierte Blätter. */
  status: z.enum([...STATUS, 'alle']).optional(),
  favorit: bool,
  kiGeneriert: bool,
  elternId: uuid.optional(),
  sortierung: z.enum(SORTIERUNGEN).default('neueste'),
  seite: ganzzahl(1, 100_000, 1),
  proSeite: ganzzahl(1, PRO_SEITE_MAX, PRO_SEITE_STANDARD),
})
