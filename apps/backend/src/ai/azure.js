/**
 * Azure-OpenAI-Adapter (spaetere Phase).
 *
 * Install:  npm i @azure/openai
 *
 * Strukturell identisch zu gemini.js – dadurch bleibt der Wechsel
 * auf Provider-Ebene eine reine .env-Aenderung (AI_PROVIDER=azure).
 */
import { config } from '../config.js'

export async function callAzureOpenAI({ system, prompt, temperature = 0.7, maxTokens = 2048, jsonMode = false }) {
  const { AzureOpenAI } = await import('@azure/openai')

  const client = new AzureOpenAI({
    endpoint: config.ai.azure.endpoint,
    apiKey: config.ai.azure.apiKey,
    apiVersion: '2024-10-21', // ggf. an euren Tenant anpassen
  })

  const response = await client.chat.completions.create({
    model: config.ai.azure.deployment,
    messages: [
      { role: 'system', content: system ?? '' },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  })

  return {
    text: response.choices?.[0]?.message?.content ?? '',
    model: config.ai.azure.deployment,
    provider: 'azure',
    usage: response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        }
      : null,
    mocked: false,
  }
}
