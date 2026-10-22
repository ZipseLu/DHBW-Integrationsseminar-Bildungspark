import { describe, it, expect, vi } from 'vitest'
import { ArbeitsblattError, generateArbeitsblatt, parseWorksheet, toArbeitsblattError } from '../../src/arbeitsblatt/generate.js'
import { PROMPT_VERSION } from '../../src/arbeitsblatt/prompt.js'
import { REQUEST_T_TEXT, WORKSHEET_T_TEXT } from '../fixtures/arbeitsblatt.js'

/** Fake-Provider: liefert nacheinander die uebergebenen Antworten */
function fakeProvider(...texts) {
  const fn = vi.fn()
  for (const text of texts) {
    if (text instanceof Promise) {
      text.catch(() => {})
      fn.mockImplementationOnce(() => text)
    } else {
      fn.mockResolvedValueOnce(typeof text === 'string' ? { text, model: 'fake-model', provider: 'fake', usage: { inputTokens: 1, outputTokens: 2 }, mocked: false, finishReason: 'STOP' } : text)
    }
  }
  return fn
}

describe('generateArbeitsblatt – Mock-Modus', () => {
  it('liefert ohne Key ein vollstaendiges Arbeitsblatt mit mocked: true', async () => {
    const { worksheet, meta } = await generateArbeitsblatt({ ...REQUEST_T_TEXT, stufe: 'A', format: 'piktogramm' }, { configured: false })
    expect(meta.mocked).toBe(true)
    expect(meta.model).toBe('mock')
    expect(meta.promptVersion).toBe(PROMPT_VERSION)
    expect(meta.validation).toEqual({ ok: true, hinweise: [] })
    expect(worksheet.titel).toBe('Güter entladen')
    expect(worksheet.stufe).toBe('A')
    expect(worksheet.format).toBe('piktogramm')
    expect(worksheet.baustein).toBe(1)
    expect(worksheet.aufgaben.length).toBeGreaterThanOrEqual(4)
    expect(worksheet.aufgaben.every((a) => a.piktogramm)).toBe(true)
    expect(worksheet.woerterbuch.length).toBeGreaterThan(0)
  })
})

describe('generateArbeitsblatt – mit Provider', () => {
  const valid = JSON.stringify(WORKSHEET_T_TEXT)

  it('ruft den Provider mit JSON-Schema auf und ergaenzt die Felder aus der Anfrage', async () => {
    const provider = fakeProvider(valid)
    const { worksheet, meta } = await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true, providerName: 'gemini' })

    expect(provider).toHaveBeenCalledTimes(1)
    const call = provider.mock.calls[0][0]
    expect(call.jsonMode).toBe(true)
    expect(call.jsonSchema).toHaveProperty('properties')
    expect(call.system).toContain('Prompt-Version')
    expect(call.prompt).toContain('Güter entladen')
    expect(call.signal).toBeInstanceOf(AbortSignal)

    expect(call.model).toBe('gemini-3.5-flash')
    expect(meta).toMatchObject({ provider: 'fake', model: 'fake-model', mocked: false, fallbackUsed: false, attempts: 1, promptVersion: PROMPT_VERSION })
    expect(meta.validation.ok).toBe(true)
    expect(worksheet.baustein).toBe(1)
    expect(worksheet.ausbildungsbaustein).toBe('Wareneingang')
    expect(worksheet.aufgaben.map((a) => a.nr)).toEqual([1, 2, 3, 4])
  })

  it('akzeptiert JSON in ```json-Zaeunen', async () => {
    const provider = fakeProvider('```json\n' + valid + '\n```')
    const { meta } = await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true })
    expect(meta.attempts).toBe(1)
  })

  it('wiederholt bei ungueltigem JSON genau einmal – mit Korrekturhinweis', async () => {
    const provider = fakeProvider('das ist kein json', valid)
    const { meta } = await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true })

    expect(provider).toHaveBeenCalledTimes(2)
    expect(provider.mock.calls[1][0].prompt).toContain('Korrekturhinweis')
    expect(provider.mock.calls[1][0].prompt).toContain('Kein gültiges JSON')
    expect(meta.attempts).toBe(2)
  })

  it('wiederholt bei Schemafehler und nennt das fehlerhafte Feld', async () => {
    const provider = fakeProvider(JSON.stringify({ ...WORKSHEET_T_TEXT, stufe: 'Q' }), valid)
    await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true })
    expect(provider.mock.calls[1][0].prompt).toContain('stufe:')
  })

  it('gibt nach zwei ungueltigen Antworten einen 502-Fehler mit Meldung', async () => {
    const provider = fakeProvider('kaputt', 'immer noch kaputt')
    const error = await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true }).catch((e) => e)
    expect(error).toBeInstanceOf(ArbeitsblattError)
    expect(error.status).toBe(502)
    expect(error.code).toBe('llm_invalid_response')
    expect(error.message).toContain('zweiten Versuch')
    expect(provider).toHaveBeenCalledTimes(2)
  })

  it('uebersetzt Provider-Fehler (Rate-Limit) ohne Wiederholung', async () => {
    const provider = vi.fn().mockRejectedValue(Object.assign(new Error('429 Too Many Requests'), { status: 429 }))
    const error = await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true }).catch((e) => e)
    expect(error.status).toBe(502)
    expect(error.code).toBe('llm_rate_limit')
    expect(error.message).toContain('Rate-Limit')
    expect(provider).toHaveBeenCalledTimes(1)
  })

  it('wechselt bei 503 (Anbieter ueberlastet) nach kurzer Wartezeit einmal auf das Fallback-Modell', async () => {
    vi.useFakeTimers()
    try {
      const provider = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('high demand'), { status: 503 }))
        .mockImplementationOnce(async ({ model }) => ({ text: valid, model, provider: 'fake', usage: null, mocked: false, finishReason: 'STOP' }))
      const pending = generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true, model: 'gross', fallbackModel: 'klein' })
      await vi.advanceTimersByTimeAsync(3000)
      const { meta } = await pending
      expect(provider).toHaveBeenCalledTimes(2)
      expect(provider.mock.calls[0][0].model).toBe('gross')
      expect(provider.mock.calls[1][0].model).toBe('klein')
      expect(meta).toMatchObject({ attempts: 2, model: 'klein', fallbackUsed: true })
    } finally {
      vi.useRealTimers()
    }
  })

  it('hat nach dem Modellwechsel noch einen Versuch fuer ungueltiges JSON', async () => {
    vi.useFakeTimers()
    try {
      const provider = fakeProvider(Promise.reject(Object.assign(new Error('high demand'), { status: 503 })), 'kaputt', valid)
      const pending = generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true })
      await vi.advanceTimersByTimeAsync(3000)
      const { meta } = await pending
      expect(provider).toHaveBeenCalledTimes(3)
      expect(meta.attempts).toBe(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('meldet 503 als Fehler, wenn auch der zweite Versuch scheitert', async () => {
    vi.useFakeTimers()
    try {
      const provider = vi.fn().mockRejectedValue(Object.assign(new Error('high demand'), { status: 503 }))
      const pending = generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true }).catch((e) => e)
      await vi.advanceTimersByTimeAsync(3000)
      const error = await pending
      expect(error.code).toBe('llm_unavailable')
      expect(provider).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('bricht bei blockierter Antwort ab', async () => {
    const provider = fakeProvider({ text: '', model: 'm', provider: 'fake', usage: null, mocked: false, finishReason: 'SAFETY' })
    const error = await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true }).catch((e) => e)
    expect(error.code).toBe('llm_blocked')
  })

  it('ueberschreibt Stufe, Format und Sprache aus der Anfrage, selbst wenn das Modell abweicht', async () => {
    const provider = fakeProvider(JSON.stringify({ ...WORKSHEET_T_TEXT, stufe: 'B', sprache: 'Standardsprache' }))
    const { worksheet } = await generateArbeitsblatt(REQUEST_T_TEXT, { provider, configured: true })
    expect(worksheet.stufe).toBe('T')
    expect(worksheet.sprache).toBe('Leichte Sprache')
  })
})

describe('parseWorksheet', () => {
  it('meldet JSON- und Schemafehler getrennt', () => {
    expect(parseWorksheet('{').error).toMatch(/Kein gültiges JSON/)
    expect(parseWorksheet('{"titel":"x"}').error).toMatch(/Schema verletzt/)
    expect(parseWorksheet(JSON.stringify(WORKSHEET_T_TEXT)).ok).toBe(true)
  })
})

describe('toArbeitsblattError', () => {
  it.each([
    ['Timeout', Object.assign(new Error('x'), { name: 'TimeoutError' }), 'llm_timeout'],
    ['Abbruch', Object.assign(new Error('x'), { name: 'AbortError' }), 'llm_timeout'],
    ['429', Object.assign(new Error('x'), { status: 429 }), 'llm_rate_limit'],
    ['Quota-Text', new Error('RESOURCE_EXHAUSTED: quota exceeded'), 'llm_rate_limit'],
    ['401', Object.assign(new Error('x'), { status: 401 }), 'llm_auth'],
    ['403', Object.assign(new Error('x'), { status: 403 }), 'llm_auth'],
    ['400', Object.assign(new Error('x'), { status: 400 }), 'llm_bad_request'],
    ['503', Object.assign(new Error('x'), { status: 503 }), 'llm_unavailable'],
    ['Netz', new Error('fetch failed'), 'llm_unavailable'],
    ['Sonstiges', new Error('???'), 'llm_error'],
  ])('%s -> %s', (_label, error, code) => {
    const result = toArbeitsblattError(error, 60_000)
    expect(result).toBeInstanceOf(ArbeitsblattError)
    expect(result.code).toBe(code)
    expect(result.status).toBe(502)
  })

  it('entfernt API-Keys aus den Details', () => {
    const result = toArbeitsblattError(new Error('Request to https://x?key=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ failed'), 1000)
    expect(result.details).not.toContain('AIzaSy')
  })
})
