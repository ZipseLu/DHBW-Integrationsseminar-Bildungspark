/**
 * Routen der Arbeitsblatt-Generierung.
 *
 * Begriff: Ein "API-Endpunkt" ist eine Adresse, unter der das Backend eine
 * bestimmte Aufgabe erledigt. Das Frontend schickt Daten als JSON hin und
 * bekommt JSON (oder eine Datei) zurueck.
 *
 *   POST /api/ai/arbeitsblatt       Lernziel + Stufe + Format + Sprache -> Arbeitsblatt
 *   POST /api/ai/arbeitsblatt/docx  Arbeitsblatt -> Word-Datei
 */
import { Router } from 'express'
import { ArbeitsblattError, generateArbeitsblatt } from '../arbeitsblatt/generate.js'
import { arbeitsblattFileName, buildArbeitsblattDocx, DOCX_MIME } from '../arbeitsblatt/docx.js'
import { GenerateRequestSchema, WorksheetSchema, formatZodError, zodIssues } from '../arbeitsblatt/schema.js'

export const arbeitsblattRouter = Router()

function validationError(res, zodError, einleitung) {
  return res.status(400).json({
    error: 'validation_error',
    message: `${einleitung} ${formatZodError(zodError)}`,
    details: zodIssues(zodError),
  })
}

arbeitsblattRouter.post('/', async (req, res, next) => {
  const parsed = GenerateRequestSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return validationError(res, parsed.error, 'Die Anfrage ist unvollständig oder ungültig:')
  }

  try {
    const result = await generateArbeitsblatt(parsed.data)
    res.json(result)
  } catch (error) {
    if (error instanceof ArbeitsblattError) {
      console.error(`[arbeitsblatt] ${error.code}: ${error.message}`, error.details ?? '')
      return res.status(error.status).json({ error: error.code, message: error.message, details: error.details })
    }
    next(error)
  }
})

arbeitsblattRouter.post('/docx', async (req, res, next) => {
  const parsed = WorksheetSchema.safeParse(req.body?.worksheet ?? null)
  if (!parsed.success) {
    return validationError(res, parsed.error, 'Das Arbeitsblatt im Feld "worksheet" ist ungültig:')
  }

  try {
    const buffer = await buildArbeitsblattDocx(parsed.data)
    const filename = arbeitsblattFileName(parsed.data)
    const asciiName = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')

    res.setHeader('Content-Type', DOCX_MIME)
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`)
    // Damit das Frontend den Dateinamen auch bei getrennten Origins lesen darf
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
    res.send(buffer)
  } catch (error) {
    next(error)
  }
})
