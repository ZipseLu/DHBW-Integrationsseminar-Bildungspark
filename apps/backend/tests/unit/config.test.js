import { describe, it, expect } from 'vitest'
import { config, describeConfig } from '../../src/config.js'

describe('config', () => {
  it('liefert einen numerischen Port', () => {
    expect(typeof config.port).toBe('number')
    expect(config.port).toBeGreaterThan(0)
  })

  it('normalisiert CORS_ORIGINS zu einem Array ohne Leerstrings', () => {
    expect(Array.isArray(config.cors.origins)).toBe(true)
    expect(config.cors.origins.every((origin) => origin.length > 0)).toBe(true)
  })

  it('faellt auf sinnvolle Defaults zurueck, wenn nichts gesetzt ist', () => {
    // Die Testumgebung setzt bewusst nichts – hier darf nichts "undefined" sein.
    expect(config.db.host).toBeTruthy()
    expect(config.db.database).toBeTruthy()
    expect(config.ai.provider).toBeTruthy()
  })
})

describe('describeConfig()', () => {
  it('gibt niemals Secrets preis', () => {
    const described = describeConfig()

    const serialised = JSON.stringify(described)
    expect(serialised).not.toContain('ai-gemini-key-literal')
    // Passwoerter/Keys duerfen nicht im Output stehen
    expect(Object.keys(described)).not.toContain('password')
    expect(Object.keys(described)).not.toContain('jwtSecret')
  })

  it('meldet, ob ein KI-Provider konfiguriert ist', () => {
    expect(typeof describeConfig().aiConfigured).toBe('boolean')
  })
})
