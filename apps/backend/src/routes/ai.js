import { Router } from 'express'
import { generateText, isAiConfigured } from '../ai/provider.js'
import { config } from '../config.js'

export const aiRouter = Router()

/** GET /api/ai/status – welche KI ist konfiguriert? */
aiRouter.get('/status', (_req, res) => {
  res.json({
    provider: config.ai.provider,
    configured: isAiConfigured(),
    model: config.ai.provider === 'azure' ? config.ai.azure.deployment : config.ai.gemini.model,
    hint: isAiConfigured()
      ? null
      : `Kein API-Key gesetzt – ${config.ai.provider.toUpperCase()} laeuft im Mock-Modus.`,
  })
})

/**
 * POST /api/ai/generate
 *
 * Body: { system?, prompt, temperature?, maxTokens?, jsonMode? }
 * Dient als Connectivity-Test fuer die KI-Anbindung (Ticket BE-25).
 */
aiRouter.post('/generate', async (req, res, next) => {
  try {
    const { system, prompt, temperature, maxTokens, jsonMode } = req.body ?? {}

    if (typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Feld "prompt" ist erforderlich und muss ein nicht-leerer String sein.',
      })
    }

    const result = await generateText({
      system,
      prompt,
      temperature,
      maxTokens,
      jsonMode,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})
