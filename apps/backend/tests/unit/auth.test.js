import { describe, it, expect } from 'vitest'
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { config, DEV_JWT_SECRET, jwtLaufzeit } from '../../src/config.js'
import { authentifiziere, erfordereAnmeldung } from '../../src/auth/anmeldung.js'
import { LoginSchema } from '../../src/auth/schema.js'
import { erstelleToken, MIN_SECRET_LAENGE, pruefeJwtKonfiguration, pruefeToken, TokenError } from '../../src/auth/token.js'

/**
 * Login (BE-01) without a database: tokens, middleware, role check and input checks.
 * Login against real accounts: tests/integration/auth-routes.test.js
 */
const KONTO = { id: '11111111-1111-4111-8111-111111111111', rolle: 'dozent', name: 'Test Dozentin' }
const SECRET = config.jwtSecret

/** Token signed by hand, e.g. already expired or with another algorithm */
const signiere = (payload, options = {}) => jwt.sign(payload, SECRET, { algorithm: 'HS256', ...options })

const fehlerVon = (fn) => {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('kein Fehler geworfen')
}

describe('Token', () => {
  it('enthält Konto-ID, Rolle und Name und läuft nach 8 Stunden ab', () => {
    const vorher = Date.now()
    const { token, ablaufAm } = erstelleToken(KONTO)
    expect(pruefeToken(token)).toEqual(KONTO)
    const laufzeit = Date.parse(ablaufAm) - vorher
    expect(laufzeit).toBeGreaterThan(8 * 3600_000 - 5_000)
    expect(laufzeit).toBeLessThanOrEqual(8 * 3600_000 + 1_000)
  })

  it('übernimmt eine andere Laufzeit', () => {
    const { ablaufAm } = erstelleToken(KONTO, { expiresIn: '30m' })
    expect(Date.parse(ablaufAm) - Date.now()).toBeLessThanOrEqual(30 * 60_000 + 1_000)
  })

  it('enthält weder E-Mail noch Passwort', () => {
    const { token } = erstelleToken({ ...KONTO, email: 'x@test.example', passwort: 'geheim' })
    expect(Object.keys(jwt.decode(token)).sort()).toEqual(['exp', 'iat', 'name', 'rolle', 'sub'])
  })

  it('meldet ein abgelaufenes Token als token_abgelaufen', () => {
    const token = signiere({ rolle: 'dozent', name: 'X', exp: Math.floor(Date.now() / 1000) - 60 }, { subject: KONTO.id })
    const fehler = fehlerVon(() => pruefeToken(token))
    expect(fehler).toBeInstanceOf(TokenError)
    expect(fehler.code).toBe('token_abgelaufen')
  })

  it('lehnt einen fremden Schlüssel, „alg: none“ und andere Algorithmen ab', () => {
    const fremd = jwt.sign({ rolle: 'admin' }, 'ein-ganz-anderer-schluessel-mit-genug-zeichen', { subject: KONTO.id })
    const ohneSignatur = jwt.sign({ rolle: 'admin' }, null, { algorithm: 'none', subject: KONTO.id })
    const hs512 = signiere({ rolle: 'admin' }, { algorithm: 'HS512', subject: KONTO.id })
    for (const token of [fremd, ohneSignatur, hs512, 'kein.token', '']) {
      expect(fehlerVon(() => pruefeToken(token)).code).toBe('token_ungueltig')
    }
  })

  it('lehnt Tokens ohne Konto-ID oder mit unbekannter Rolle ab', () => {
    expect(fehlerVon(() => pruefeToken(signiere({ rolle: 'admin' }))).code).toBe('token_ungueltig')
    expect(fehlerVon(() => pruefeToken(signiere({ rolle: 'chef' }, { subject: KONTO.id }))).code).toBe('token_ungueltig')
  })
})

describe('JWT_SECRET in Produktion', () => {
  const sicher = 'x'.repeat(MIN_SECRET_LAENGE)

  it('verweigert den Entwicklungs-Schlüssel, einen leeren und einen zu kurzen Schlüssel', () => {
    for (const secret of [DEV_JWT_SECRET, '', 'zu-kurz']) {
      expect(() => pruefeJwtKonfiguration({ env: 'production', secret })).toThrow(/JWT_SECRET/)
    }
  })

  it('akzeptiert einen langen Schlüssel und lässt die Entwicklung in Ruhe', () => {
    expect(() => pruefeJwtKonfiguration({ env: 'production', secret: sicher })).not.toThrow()
    expect(() => pruefeJwtKonfiguration({ env: 'development', secret: DEV_JWT_SECRET })).not.toThrow()
  })
})

describe('JWT_EXPIRES_IN', () => {
  it('liest eine reine Zahl als Sekunden, alles andere bleibt Text', () => {
    expect(jwtLaufzeit('3600')).toBe(3600)
    expect(jwtLaufzeit(' 900 ')).toBe(900)
    expect(jwtLaufzeit('8h')).toBe('8h')
    expect(jwtLaufzeit(undefined)).toBeUndefined()
    const { ablaufAm } = erstelleToken(KONTO, { expiresIn: jwtLaufzeit('3600') })
    expect(Date.parse(ablaufAm) - Date.now()).toBeGreaterThan(3590_000)
  })

  it('verweigert den Start mit ungültiger oder nicht positiver Laufzeit', () => {
    for (const expiresIn of ['8 Stunden', '0s', 0, -5]) {
      expect(() => pruefeJwtKonfiguration({ env: 'development', expiresIn })).toThrow(/JWT_EXPIRES_IN/)
    }
    for (const expiresIn of ['30m', '8h', '1d', 3600]) {
      expect(() => pruefeJwtKonfiguration({ env: 'development', expiresIn })).not.toThrow()
    }
  })
})

describe('Middleware', () => {
  // Small app that shows what the middleware puts into req.benutzer
  const app = express()
  app.use(authentifiziere)
  app.get('/offen', (req, res) => res.json({ benutzer: req.benutzer ?? null }))
  app.get('/geschuetzt', erfordereAnmeldung, (req, res) => res.json({ benutzer: req.benutzer }))

  it('lässt Anfragen ohne Token unverändert durch', async () => {
    const response = await request(app).get('/offen')
    expect(response.status).toBe(200)
    expect(response.body.benutzer).toBeNull()
  })

  it('setzt req.benutzer aus einem gültigen Bearer-Token', async () => {
    const { token } = erstelleToken(KONTO)
    const response = await request(app).get('/offen').set('Authorization', `Bearer ${token}`)
    expect(response.body.benutzer).toEqual(KONTO)
    expect((await request(app).get('/offen').set('Authorization', `bearer ${token}`)).body.benutzer).toEqual(KONTO)
  })

  it('weist ein abgelaufenes Token mit 401 ab', async () => {
    const token = signiere({ rolle: 'dozent', name: 'X', exp: Math.floor(Date.now() / 1000) - 1 }, { subject: KONTO.id })
    const response = await request(app).get('/offen').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ error: 'unauthorized', code: 'token_abgelaufen' })
    expect(response.headers['www-authenticate']).toBe('Bearer')
  })

  it('weist einen kaputten Bearer-Header mit 401 ab', async () => {
    const { token } = erstelleToken(KONTO)
    for (const header of ['Bearer', `Bearer ${token} extra`, `Bearer ${token} Basic dXNlcjpwdw==`]) {
      const response = await request(app).get('/offen').set('Authorization', header)
      expect(response.status).toBe(401)
      expect(response.body.code).toBe('token_ungueltig')
    }
  })

  it('behandelt fremde Authorization-Schemata wie kein Token', async () => {
    const { token } = erstelleToken(KONTO)
    // "Basic …" kommt z. B. von der nginx-Zugangsabsicherung auf Staging; es darf die
    // API bis BE-06 nicht blockieren. Ein fremdes Schema authentifiziert niemanden.
    for (const header of ['Basic dXNlcjpwdw==', `Token ${token}`]) {
      const response = await request(app).get('/offen').set('Authorization', header)
      expect(response.status).toBe(200)
      expect(response.body.benutzer).toBeNull()
    }
  })

  it('verlangt trotz Basic-Header ein Token für geschützte Routen', async () => {
    const response = await request(app).get('/geschuetzt').set('Authorization', 'Basic dXNlcjpwdw==')
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('anmeldung_erforderlich')
  })

  it('erfordereAnmeldung verlangt ein Token', async () => {
    const response = await request(app).get('/geschuetzt')
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('anmeldung_erforderlich')
    const { token } = erstelleToken(KONTO)
    expect((await request(app).get('/geschuetzt').set('Authorization', `Bearer ${token}`)).status).toBe(200)
  })
})

describe('Anmeldung in der App (ohne Datenbank)', () => {
  const app = createApp()
  const tokenFuer = (rolle) => erstelleToken({ ...KONTO, rolle }).token

  it('Benutzerverwaltung: andere Rollen bekommen 403, bevor die Datenbank gefragt wird', async () => {
    for (const rolle of ['dozent', 'assistent']) {
      const response = await request(app).get('/api/benutzer').set('Authorization', `Bearer ${tokenFuer(rolle)}`)
      expect(response.status).toBe(403)
      expect(response.body.error).toBe('forbidden')
    }
  })

  it('ein ungültiges Token wird auch bei den übrigen Routen abgelehnt', async () => {
    const response = await request(app).get('/api/arbeitsblaetter').set('Authorization', 'Bearer kaputt')
    expect(response.status).toBe(401)
  })

  it('GET /api/auth/me ohne Token: 401', async () => {
    const response = await request(app).get('/api/auth/me')
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('anmeldung_erforderlich')
  })

  it('ein Basic-Header der Staging-Absicherung wird wie kein Token behandelt', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Basic dXNlcjpwdw==')
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('anmeldung_erforderlich')
  })

  it('POST /api/auth/login prüft die Eingaben vor der Datenbank – auch mit altem Token im Header', async () => {
    const response = await request(app).post('/api/auth/login').set('Authorization', 'Bearer abgelaufen').send({ email: 'a@test.example' })
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('validation_error')
  })
})

describe('LoginSchema', () => {
  it('verlangt E-Mail und Passwort und lehnt weitere Felder ab', () => {
    expect(LoginSchema.parse({ email: ' a@test.example ', passwort: 'x' })).toEqual({ email: 'a@test.example', passwort: 'x' })
    expect(LoginSchema.safeParse({ email: 'a@test.example' }).success).toBe(false)
    expect(LoginSchema.safeParse({ email: '', passwort: 'x' }).success).toBe(false)
    expect(LoginSchema.safeParse({ email: 'a@test.example', passwort: 'x', rolle: 'admin' }).success).toBe(false)
  })
})
