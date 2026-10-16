/**
 * KI-Provider-Abstraktion.
 *
 * Ziel: Beim Wechsel von Gemini auf Azure OpenAI darf sich an der API
 * nichts weiter aendern als `AI_PROVIDER` in der .env – der Aufrufer
 * benutzt immer `generateText()`.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  route.js  ──►  provider.js  ──►  gemini.js | azure.js      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * BEIDE Provider implementieren dieselbe Signatur:
 *   generateText({ system, prompt, temperature, maxTokens })
 *     -> { text, model, provider, usage }
 *
 * -------------------------------------------------------------------
 * NOCH OFFEN (bewusst als Scaffold):
 *   1. SDK installieren:
 *        npm i @google/genai                     (Gemini)
 *        npm i @azure/openai                     (Azure)
 *   2. Hier die echten Aufrufe eintragen.
 *
 * Bis dahin gibt der Provider eine deterministische Mock-Antwort zurueck,
 * damit Frontend, Supertest und Playwright ohne API-Key laufen koennen.
 * -------------------------------------------------------------------
 */
import { config } from '../config.js'
import { callGemini } from './gemini.js'
import { callAzureOpenAI } from './azure.js'

/**
 * @typedef {Object} GenerateOptions
 * @property {string}  system      System-Prompt (Rolle/Anweisung an das Modell)
 * @property {string}  prompt      User-Prompt (die konkrete Aufgabe)
 * @property {number} [temperature=0.7]
 * @property {number} [maxTokens=2048]
 * @property {boolean}[jsonMode]    JSON-Ausgabe erzwingen (fuer strukturierte Daten)
 */

/**
 * @param {GenerateOptions} options
 * @returns {Promise<{text: string, model: string, provider: string, usage: object|null, mocked: boolean}>}
 */
export async function generateText(options) {
  const { provider } = config.ai

  if (provider === 'azure') {
    if (!config.ai.azure.apiKey || !config.ai.azure.endpoint) {
      return mockResponse(options, 'azure')
    }
    return callAzureOpenAI(options)
  }

  if (!config.ai.gemini.apiKey) {
    return mockResponse(options, 'gemini')
  }
  return callGemini(options)
}

/** Ist ein echter KI-Anbieter konfiguriert? (fuer /api/ai/status) */
export function isAiConfigured() {
  return config.ai.provider === 'azure'
    ? Boolean(config.ai.azure.apiKey && config.ai.azure.endpoint)
    : Boolean(config.ai.gemini.apiKey)
}

/**
 * Mock-Antwort – haelt die Frontend- und Test-Pipeline lauffaehig,
 * ohne dass ein API-Key noetig ist.
 */
function mockResponse({ prompt, system }, provider) {
  return {
    text: [
      '[MOCK – kein API-Key konfiguriert]',
      `Provider: ${provider}`,
      `System-Prompt erhalten: ${system ? `${system.length} Zeichen` : 'nein'}`,
      `User-Prompt erhalten: ${prompt.length} Zeichen`,
    ].join('\n'),
    model: 'mock',
    provider,
    usage: null,
    mocked: true,
  }
}
