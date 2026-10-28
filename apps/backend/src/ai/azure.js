/**
 * Azure-OpenAI-Adapter (spaetere Phase – noch ungetestet, kein Key vorhanden).
 *
 * Install:  npm i @azure/openai
 *
 * Strukturell identisch zu gemini.js – dadurch bleibt der Wechsel
 * auf Provider-Ebene eine reine .env-Aenderung (AI_PROVIDER=azure).
 */
import { config } from '../config.js'

export async function callAzureOpenAI({ system, prompt, temperature = 0.7, maxTokens = 2048, jsonMode = false, jsonSchema = null, signal = undefined }) {
  const { AzureOpenAI } = await import('@azure/openai')

  const client = new AzureOpenAI({
    endpoint: config.ai.azure.endpoint,
    apiKey: config.ai.azure.apiKey,
    apiVersion: '2024-10-21', // ggf. an euren Tenant anpassen
  })

  // JSON-Schema -> "Structured Outputs" von OpenAI; nur jsonMode -> freies JSON-Objekt
  const responseFormat = jsonSchema
    ? { response_format: { type: 'json_schema', json_schema: { name: 'arbeitsblatt', schema: jsonSchema } } }
    : jsonMode
      ? { response_format: { type: 'json_object' } }
      : {}

  const response = await client.chat.completions.create(
    {
      model: config.ai.azure.deployment,
      messages: [
        { role: 'system', content: system ?? '' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...responseFormat,
    },
    signal ? { signal } : undefined,
  )

  const choice = response.choices?.[0]
  return {
    text: choice?.message?.content ?? '',
    model: config.ai.azure.deployment,
    provider: 'azure',
    usage: response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        }
      : null,
    mocked: false,
    finishReason: choice?.finish_reason === 'length' ? 'MAX_TOKENS' : choice?.finish_reason === 'content_filter' ? 'SAFETY' : 'STOP',
    blockReason: null,
  }
}
