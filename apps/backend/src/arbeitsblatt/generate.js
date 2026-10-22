/**
 * Ablauf der Arbeitsblatt-Generierung:
 *
 *   Prompt bauen -> Provider aufrufen (JSON-Modus + Schema) -> JSON parsen
 *   -> Schema pruefen -> bei Fehler genau EIN Wiederholungsversuch mit
 *   Korrekturhinweis -> Validator -> Ergebnis { worksheet, meta }
 *
 * Ist der Anbieter ueberlastet (HTTP 503), wird einmal kurz gewartet und mit
 * dem Fallback-Modell (GEMINI_FALLBACK_MODEL) erneut aufgerufen.
 *
 * Ohne API-Key liefert der Ablauf ein Mock-Arbeitsblatt (meta.mocked = true).
 *
 * Alle Abhaengigkeiten (Provider, Konfiguration) lassen sich fuer Tests
 * ueber `deps` ersetzen – so testen wir den Wiederholungsversuch ohne Gemini.
 */
import { config } from '../config.js'
import { generateText, isAiConfigured } from '../ai/provider.js'
import { buildPrompt, PROMPT_VERSION } from './prompt.js'
import { LlmWorksheetSchema, WORKSHEET_JSON_SCHEMA, formatZodError } from './schema.js'
import { validateWorksheet } from './validator.js'
import { buildMockWorksheet } from './mock.js'

/** Fehler mit HTTP-Status und Code – die Route gibt ihn als JSON weiter. */
export class ArbeitsblattError extends Error {
  constructor(message, { status = 502, code = 'llm_error', details = null } = {}) {
    super(message)
    this.name = 'ArbeitsblattError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const TEMPERATURE = 0.4
const MAX_OUTPUT_TOKENS = 8192
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2500

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })

/**
 * @param {object} input  Validierter Request (GenerateRequestSchema)
 * @param {object} [deps]
 * @param {Function} [deps.provider]     Ersatz fuer generateText (Tests)
 * @param {boolean}  [deps.configured]   Ersatz fuer isAiConfigured() (Tests)
 * @param {number}   [deps.timeoutMs]    Gesamt-Zeitlimit inkl. Wiederholung
 */
export async function generateArbeitsblatt(input, deps = {}) {
  const provider = deps.provider ?? generateText
  const configured = deps.configured ?? isAiConfigured()
  const timeoutMs = deps.timeoutMs ?? config.ai.timeoutMs
  const providerName = deps.providerName ?? config.ai.provider
  const primaryModel = deps.model ?? (providerName === 'azure' ? config.ai.azure.deployment : config.ai.gemini.model)
  const fallbackModel = deps.fallbackModel ?? (providerName === 'azure' ? null : config.ai.gemini.fallbackModel)
  const started = Date.now()

  // --- Mock-Modus: kein Key -> festes Beispiel, aber mit allen Stationen ---
  if (!configured) {
    const worksheet = buildMockWorksheet(input)
    return {
      worksheet,
      meta: {
        provider: providerName,
        model: 'mock',
        mocked: true,
        fallbackUsed: false,
        durationMs: Date.now() - started,
        promptVersion: PROMPT_VERSION,
        attempts: 0,
        usage: null,
        validation: validateWorksheet(worksheet),
      },
    }
  }

  const signal = AbortSignal.timeout(timeoutMs)
  let model = primaryModel
  let korrektur = null
  let unavailableRetried = false // einmal bei 503 (Anbieter ueberlastet) -> Fallback-Modell
  let jsonRetried = false // einmal bei ungueltigem JSON/Schema -> Korrekturhinweis
  let attempts = 0

  // Hoechstens drei Aufrufe: 503-Wechsel + JSON-Wiederholung + Erfolg
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt
    const { system, prompt } = buildPrompt(input, { korrektur })

    let result
    try {
      result = await provider({
        system,
        prompt,
        model,
        temperature: TEMPERATURE,
        maxTokens: MAX_OUTPUT_TOKENS,
        jsonMode: true,
        jsonSchema: WORKSHEET_JSON_SCHEMA,
        signal,
      })
    } catch (error) {
      const translated = toArbeitsblattError(error, timeoutMs)
      // "Server ueberlastet" (503) ist meist ein kurzer Spitzenwert: einmal kurz warten
      // und – falls konfiguriert – mit dem Fallback-Modell erneut versuchen.
      if (translated.code === 'llm_unavailable' && !unavailableRetried && !signal.aborted) {
        unavailableRetried = true
        const nextModel = fallbackModel && fallbackModel !== model ? fallbackModel : model
        console.warn(`[arbeitsblatt] Versuch ${attempt}: Modell ${model} nicht erreichbar, neuer Versuch mit ${nextModel} in ${RETRY_DELAY_MS} ms`)
        await sleep(RETRY_DELAY_MS, signal)
        model = nextModel
        continue
      }
      throw translated
    }

    if (result.blockReason) {
      throw new ArbeitsblattError(
        `Der KI-Anbieter hat die Anfrage blockiert (${result.blockReason}). Bitte Eingaben prüfen.`,
        { code: 'llm_blocked' },
      )
    }
    if (result.finishReason && !['STOP', 'MAX_TOKENS'].includes(result.finishReason)) {
      throw new ArbeitsblattError(
        `Die KI hat die Antwort abgebrochen (${result.finishReason}). Bitte Eingaben prüfen und erneut versuchen.`,
        { code: 'llm_blocked' },
      )
    }

    const parsed = parseWorksheet(result.text)
    if (parsed.ok) {
      const worksheet = finalizeWorksheet(parsed.worksheet, input)
      return {
        worksheet,
        meta: {
          provider: result.provider ?? providerName,
          model: result.model ?? model,
          mocked: Boolean(result.mocked),
          fallbackUsed: model !== primaryModel,
          durationMs: Date.now() - started,
          promptVersion: PROMPT_VERSION,
          attempts,
          usage: result.usage ?? null,
          validation: validateWorksheet(worksheet),
        },
      }
    }

    korrektur =
      result.finishReason === 'MAX_TOKENS'
        ? 'Die Antwort war zu lang und wurde abgeschnitten. Fasse dich kürzer.'
        : parsed.error
    console.warn(`[arbeitsblatt] Versuch ${attempt} ungültig: ${korrektur}`)

    if (jsonRetried || signal.aborted) break
    jsonRetried = true
  }

  throw new ArbeitsblattError(
    `Die KI-Antwort war auch nach einem zweiten Versuch kein gültiges Arbeitsblatt. Letzter Fehler: ${korrektur}`,
    { code: 'llm_invalid_response' },
  )
}

/**
 * Text des Modells -> geprueftes Arbeitsblatt.
 * Entfernt notfalls ```json-Zaeune, parst JSON und prueft gegen das Schema.
 */
export function parseWorksheet(text) {
  const cleaned = String(text ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  let data
  try {
    data = JSON.parse(cleaned)
  } catch (error) {
    return { ok: false, error: `Kein gültiges JSON (${error.message})` }
  }

  const result = LlmWorksheetSchema.safeParse(data)
  if (!result.success) {
    return { ok: false, error: `Schema verletzt – ${formatZodError(result.error)}` }
  }
  return { ok: true, worksheet: result.data }
}

/**
 * Felder, die aus der Anfrage stammen, werden gesetzt (nicht dem Modell
 * ueberlassen), Aufgaben werden durchnummeriert.
 */
function finalizeWorksheet(worksheet, input) {
  return {
    ...worksheet,
    berufsfeld: input.lernziel.berufsfeld,
    baustein: input.lernziel.baustein,
    ausbildungsbaustein: input.lernziel.ausbildungsbaustein,
    stufe: input.stufe,
    format: input.format,
    sprache: input.sprache,
    lernziel: worksheet.lernziel || input.lernziel.titel,
    aufgaben: worksheet.aufgaben.map((aufgabe, index) => ({ ...aufgabe, nr: index + 1 })),
  }
}

/** Technische Fehler des Anbieters in verstaendliche Meldungen uebersetzen. */
export function toArbeitsblattError(error, timeoutMs) {
  if (error instanceof ArbeitsblattError) return error

  const name = error?.name ?? ''
  const status = Number(error?.status ?? error?.response?.status ?? 0)
  const rawMessage = String(error?.message ?? error ?? '')
  const details = redactSecrets(rawMessage).slice(0, 500)

  if (name === 'TimeoutError' || name === 'AbortError' || /timed? ?out/i.test(rawMessage)) {
    return new ArbeitsblattError(
      `Zeitüberschreitung: Die KI hat nicht innerhalb von ${Math.round(timeoutMs / 1000)} Sekunden geantwortet. Bitte erneut versuchen.`,
      { code: 'llm_timeout', details },
    )
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMessage)) {
    return new ArbeitsblattError(
      'Rate-Limit des KI-Anbieters erreicht (zu viele Anfragen in kurzer Zeit). Bitte eine Minute warten und erneut versuchen.',
      { code: 'llm_rate_limit', details },
    )
  }
  if (status === 401 || status === 403 || /API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(rawMessage)) {
    return new ArbeitsblattError(
      'Der KI-Anbieter hat den API-Key abgelehnt. Bitte GEMINI_API_KEY in apps/backend/.env prüfen.',
      { code: 'llm_auth', details },
    )
  }
  if (status === 404 || /no longer available|not found for API version|is not found/i.test(rawMessage)) {
    return new ArbeitsblattError(
      'Das konfigurierte KI-Modell ist für diesen API-Key nicht verfügbar. Bitte GEMINI_MODEL in apps/backend/.env prüfen (z. B. gemini-flash-latest).',
      { code: 'llm_model_not_found', details },
    )
  }
  if (status === 400) {
    return new ArbeitsblattError('Der KI-Anbieter hat die Anfrage abgelehnt (ungültige Anfrage).', {
      code: 'llm_bad_request',
      details,
    })
  }
  if (status >= 500 || /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|network/i.test(rawMessage)) {
    return new ArbeitsblattError(
      'Der KI-Anbieter ist gerade nicht erreichbar (Server oder Internetverbindung). Bitte später erneut versuchen.',
      { code: 'llm_unavailable', details },
    )
  }
  return new ArbeitsblattError('Unerwarteter Fehler beim KI-Aufruf.', { code: 'llm_error', details })
}

/** Sicherheitsnetz: API-Keys duerfen nie in Fehlermeldungen landen. */
function redactSecrets(text) {
  return text
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted]')
    .replace(/AQ\.[0-9A-Za-z_-]{20,}/g, '[redacted]')
    .replace(/key=[^&\s]+/gi, 'key=[redacted]')
}
