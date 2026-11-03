/**
 * Routes of the assignments worksheet ↔ participant and the learning status (BE-04, MySQL).
 *
 *   GET    /api/teilnehmende/lernstand                  learning status of all participants
 *   GET    /api/teilnehmende/:kennung/lernstand         done / open per Berufsfeld + next sheet
 *   GET    /api/teilnehmende/:kennung/zuordnungen       assignments (?status=offen|erledigt)
 *   POST   /api/teilnehmende/:kennung/zuordnungen       { arbeitsblattId } – assign a saved sheet
 *   PATCH  /api/teilnehmende/:kennung/zuordnungen/:id   { status } – tick off or reopen
 *   DELETE /api/teilnehmende/:kennung/zuordnungen/:id   remove the assignment
 *
 * Mounted in front of the participants router (app.js); everything else under
 * /api/teilnehmende falls through to it. Who assigned a sheet comes from the login
 * (req.benutzer.name, BE-01). Without a reachable MySQL: 503 db_unavailable.
 * Details: docs/zuordnungen-lernstand.md
 */
import { Router } from 'express'
import { isUuid } from '../arbeitsblaetter/schema.js'
import { validationError, wrap as wrapFuer } from '../http/fehler.js'
import { istKennung, normalisiereKennung } from '../teilnehmende/schema.js'
import * as repo from '../zuordnungen/repository.js'
import { CreateSchema, ListQuerySchema, PatchSchema } from '../zuordnungen/schema.js'

const wrap = wrapFuer('zuordnungen')

const zuordnungFehlt = (res, id) => res.status(404).json({ error: 'not_found', code: 'zuordnung_unbekannt', message: `Zuordnung ${id} existiert nicht` })

export function createZuordnungenRouter() {
  const router = Router()

  router.get(
    '/lernstand',
    wrap(async (_req, res) => {
      const eintraege = await repo.lernstandAlle()
      res.json({ eintraege, gesamt: eintraege.length })
    }),
  )

  // Invalid identifier in the URL -> 404 without a database query (same as the participants router)
  router.param('kennung', (req, res, next, kennung) => {
    if (!istKennung(kennung)) return res.status(404).json({ error: 'not_found', code: 'teilnehmer_unbekannt', message: `Teilnehmende/r ${kennung} existiert nicht` })
    res.locals.kennung = normalisiereKennung(kennung)
    next()
  })
  router.param('id', (req, res, next, id) => (isUuid(id) ? next() : zuordnungFehlt(res, id)))

  router.get(
    '/:kennung/lernstand',
    wrap(async (_req, res) => {
      res.json({ lernstand: await repo.lernstandFuer(res.locals.kennung) })
    }),
  )

  router.get(
    '/:kennung/zuordnungen',
    wrap(async (req, res) => {
      const parsed = ListQuerySchema.safeParse(req.query)
      if (!parsed.success) return validationError(res, parsed.error, 'Ungültiger Filter:')
      const eintraege = await repo.listFuer(res.locals.kennung, parsed.data)
      res.json({ eintraege, gesamt: eintraege.length })
    }),
  )

  router.post(
    '/:kennung/zuordnungen',
    wrap(async (req, res) => {
      const parsed = CreateSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Das Arbeitsblatt kann nicht zugeordnet werden:')
      const zuordnung = await repo.create(res.locals.kennung, { ...parsed.data, zugeordnetVon: req.benutzer?.name ?? null })
      res
        .status(201)
        .location(`/api/teilnehmende/${encodeURIComponent(zuordnung.kennung)}/zuordnungen/${zuordnung.id}`)
        .json({ zuordnung })
    }),
  )

  router.patch(
    '/:kennung/zuordnungen/:id',
    wrap(async (req, res) => {
      const parsed = PatchSchema.safeParse(req.body ?? {})
      if (!parsed.success) return validationError(res, parsed.error, 'Die Änderung ist ungültig:')
      const zuordnung = await repo.updateStatus(res.locals.kennung, req.params.id, parsed.data.status)
      if (!zuordnung) return zuordnungFehlt(res, req.params.id)
      res.json({ zuordnung })
    }),
  )

  router.delete(
    '/:kennung/zuordnungen/:id',
    wrap(async (req, res) => {
      if (!(await repo.remove(res.locals.kennung, req.params.id))) return zuordnungFehlt(res, req.params.id)
      res.status(204).end()
    }),
  )

  return router
}
