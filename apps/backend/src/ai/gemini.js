/**
 * Gemini-Adapter (Anfangsphase).
 *
 * Install:  npm i @google/genai
 * Doku:     https://ai.google.dev/gemini-api/docs
 *
 * DIESE DATEI ENTHALT BIS EINSCHLIESSLICH DEM IMPORT NUR EINE SKIZZE –
 * der Import ist dynamisch, damit der Container auch ohne SDK laeuft.
 */
import { config } from '../config.js'

export async function callGemini({ system, prompt, temperature = 0.7, maxTokens = 2048, jsonMode = false }) {
  // Dynamischer Import: laedt das SDK nur, wenn es wirklich installiert ist.
  const { GoogleGenAI } = await import('@google/genai')

  const client = new GoogleGenAI({ apiKey: config.ai.gemini.apiKey })

  const response = await client.models.generateContent({
    model: config.ai.gemini.model,
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  })

  return {
    text: response.text ?? '',
    model: config.ai.gemini.model,
    provider: 'gemini',
    usage: response.usageMetadata
      ? {
          inputTokens: response.usageMetadata.promptTokenCount,
          outputTokens: response.usageMetadata.candidatesTokenCount,
        }
      : null,
    mocked: false,
  }
}
