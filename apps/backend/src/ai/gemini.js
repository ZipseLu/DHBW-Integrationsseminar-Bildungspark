/**
 * Gemini-Adapter.
 *
 * SDK:   @google/genai (npm i @google/genai)
 * Doku:  https://ai.google.dev/gemini-api/docs
 *
 * Strukturierte Ausgabe: Mit `responseMimeType: 'application/json'` und
 * `responseJsonSchema` MUSS das Modell ein JSON-Objekt liefern, das dem
 * Schema entspricht (siehe src/arbeitsblatt/schema.js).
 *
 * Der Import ist dynamisch und wird erst beim ersten echten Aufruf geladen –
 * im Mock-Modus (Tests, kein Key) bleibt das SDK ungeladen.
 */
import { config } from '../config.js'

let clientPromise = null

async function getClient() {
  if (!clientPromise) {
    clientPromise = import('@google/genai').then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey: config.ai.gemini.apiKey }))
  }
  return clientPromise
}

export async function callGemini({ system, prompt, temperature = 0.7, maxTokens = 2048, jsonMode = false, jsonSchema = null, signal = undefined, model = undefined }) {
  const client = await getClient()
  const wantsJson = jsonMode || Boolean(jsonSchema)
  const usedModel = model || config.ai.gemini.model

  const response = await client.models.generateContent({
    model: usedModel,
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature,
      maxOutputTokens: maxTokens,
      ...(wantsJson ? { responseMimeType: 'application/json' } : {}),
      ...(jsonSchema ? { responseJsonSchema: jsonSchema } : {}),
      ...(signal ? { abortSignal: signal } : {}),
    },
  })

  const candidate = response.candidates?.[0]
  const usage = response.usageMetadata

  return {
    text: response.text ?? '',
    model: usedModel,
    provider: 'gemini',
    usage: usage
      ? {
          inputTokens: usage.promptTokenCount ?? null,
          outputTokens: usage.candidatesTokenCount ?? null,
          thinkingTokens: usage.thoughtsTokenCount ?? null,
          totalTokens: usage.totalTokenCount ?? null,
        }
      : null,
    mocked: false,
    finishReason: candidate?.finishReason ?? null,
    blockReason: response.promptFeedback?.blockReason ?? null,
  }
}
