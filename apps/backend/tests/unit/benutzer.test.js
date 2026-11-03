import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { hashPasswort, pruefePasswort } from '../../src/benutzer/passwort.js'
import { CreateSchema, PatchSchema } from '../../src/benutzer/schema.js'
import { toApi } from '../../src/benutzer/repository.js'
import { erfordereRolle } from '../../src/auth/rollen.js'
import { createBenutzerRouter } from '../../src/routes/benutzer.js'

describe('Passwort-Hash (scrypt)', () => {
  it('speichert nie den Klartext und prüft das richtige Passwort', async () => {
    const hash = await hashPasswort('geheim-123')
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/)
    expect(hash).not.toContain('geheim-123')
    expect(await pruefePasswort('geheim-123', hash)).toBe(true)
    expect(await pruefePasswort('geheim-124', hash)).toBe(false)
  })

  it('erzeugt für dasselbe Passwort verschiedene Hashes (Salt)', async () => {
    expect(await hashPasswort('geheim-123')).not.toBe(await hashPasswort('geheim-123'))
  })

  it('lehnt kaputte oder fremde Hashes ab, ohne abzustürzen', async () => {
    expect(await pruefePasswort('x', 'kein-hash')).toBe(false)
    expect(await pruefePasswort('x', 'bcrypt$1$2$3$a$b')).toBe(false)
    expect(await pruefePasswort('x', null)).toBe(false)
  })

  it('verlangt ein Passwort', async () => {
    await expect(hashPasswort('')).rejects.toThrow('Passwort fehlt')
  })
})

describe('Schemas', () => {
  it('normalisiert die E-Mail und setzt die Standardrolle', () => {
    expect(CreateSchema.parse({ name: ' Test Person ', email: ' Test@Bildungspark.Example ', passwort: 'abcdefgh' })).toEqual({
      name: 'Test Person', email: 'test@bildungspark.example', rolle: 'dozent', passwort: 'abcdefgh',
    })
  })

  it('verlangt mindestens 8 Zeichen Passwort und eine gültige E-Mail', () => {
    expect(CreateSchema.safeParse({ name: 'Test', email: 'test@x.example', passwort: 'kurz' }).success).toBe(false)
    expect(CreateSchema.safeParse({ name: 'Test', email: 'keine-mail', passwort: 'abcdefgh' }).success).toBe(false)
  })

  it('lehnt unbekannte Felder und Rollen ab', () => {
    expect(CreateSchema.safeParse({ name: 'Test', email: 'test@x.example', passwort: 'abcdefgh', role: 'admin' }).success).toBe(false)
    expect(CreateSchema.safeParse({ name: 'Test', email: 'test@x.example', passwort: 'abcdefgh', rolle: 'chef' }).success).toBe(false)
  })

  it('PATCH braucht mindestens ein Feld', () => {
    expect(PatchSchema.safeParse({}).success).toBe(false)
    expect(PatchSchema.parse({ rolle: 'assistent' })).toEqual({ rolle: 'assistent' })
  })
})

describe('toApi', () => {
  it('gibt keinen Passwort-Hash heraus', () => {
    const api = toApi({ id: 'id-1', name: 'N', email: 'e@x.example', role: 'admin', created_at: '2026-09-23 10:00:00', password_hash: 'scrypt$…' })
    expect(api).toEqual({ id: 'id-1', name: 'N', email: 'e@x.example', rolle: 'admin', erstelltAm: '2026-09-23T10:00:00.000Z' })
  })
})

describe('erfordereRolle', () => {
  const app = (benutzer) => {
    const a = express()
    a.use((req, _res, next) => {
      req.benutzer = benutzer
      next()
    })
    a.get('/geheim', erfordereRolle('admin'), (_req, res) => res.json({ ok: true }))
    return a
  }

  it('lässt ohne Anmeldung durch (bis BE-01)', async () => {
    expect((await request(app(undefined)).get('/geheim')).status).toBe(200)
  })

  it('lässt Admins durch und weist andere Rollen mit 403 ab', async () => {
    expect((await request(app({ id: 'a', rolle: 'admin' })).get('/geheim')).status).toBe(200)
    const response = await request(app({ id: 'd', rolle: 'dozent' })).get('/geheim')
    expect(response.status).toBe(403)
    expect(response.body.error).toBe('forbidden')
  })

  it('schützt die Benutzerverwaltung schon vor der Datenbankabfrage', async () => {
    const a = express()
    a.use((req, _res, next) => {
      req.benutzer = { id: 'd', rolle: 'dozent' }
      next()
    })
    a.use('/api/benutzer', createBenutzerRouter())
    expect((await request(a).get('/api/benutzer')).status).toBe(403)
  })
})
