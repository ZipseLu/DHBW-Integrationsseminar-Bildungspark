/**
 * Schemas of the assignments worksheet ↔ participant (BE-04).
 *
 * Objects are `strict` like in the other APIs: unknown fields (e.g. `zugeordnetVon`)
 * are rejected – who assigned a sheet comes from the login (BE-01), not from the body.
 */
import { z } from 'zod'
import { isUuid } from '../arbeitsblaetter/schema.js'

export const ZUORDNUNG_STATUS = ['offen', 'erledigt']

/** Body of POST /api/teilnehmende/:kennung/zuordnungen */
export const CreateSchema = z.strictObject({
  arbeitsblattId: z.string().refine(isUuid, 'muss die ID eines gespeicherten Arbeitsblatts sein'),
})

/** Body of PATCH /api/teilnehmende/:kennung/zuordnungen/:id – tick off or reopen */
export const PatchSchema = z.strictObject({
  status: z.enum(ZUORDNUNG_STATUS),
})

/** Query of GET /api/teilnehmende/:kennung/zuordnungen */
export const ListQuerySchema = z.object({
  status: z.enum(ZUORDNUNG_STATUS).optional(),
})
