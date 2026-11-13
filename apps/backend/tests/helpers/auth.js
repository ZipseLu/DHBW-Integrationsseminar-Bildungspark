/**
 * Login helpers for route tests (BE-06: every API route except /api/health and
 * /api/auth/login requires a token).
 *
 *   api(app, 'admin').get('/api/…')   supertest request with "Authorization: Bearer <token>"
 *   bearer('dozent')                  only the header value
 *
 * The tokens are signed with the test secret (vitest.config.js) for fixed test
 * accounts; they need no row in the `users` table. Routes that read the account
 * from the database (GET /api/auth/me) are tested with a real login instead.
 */
import request from 'supertest'
import { erstelleToken } from '../../src/auth/token.js'

export const TEST_KONTEN = {
  admin: { id: '00000000-0000-4000-8000-0000000000a1', rolle: 'admin', name: 'Test Admin' },
  dozent: { id: '00000000-0000-4000-8000-0000000000d1', rolle: 'dozent', name: 'Test Dozent' },
  assistent: { id: '00000000-0000-4000-8000-0000000000e1', rolle: 'assistent', name: 'Test Assistent' },
}

export function bearer(rolle = 'admin') {
  const konto = TEST_KONTEN[rolle]
  if (!konto) throw new Error(`Unbekannte Testrolle: ${rolle}`)
  return `Bearer ${erstelleToken(konto).token}`
}

const METHODEN = ['get', 'post', 'put', 'patch', 'delete']

export function api(app, rolle = 'admin') {
  const header = bearer(rolle)
  return Object.fromEntries(METHODEN.map((methode) => [methode, (url) => request(app)[methode](url).set('Authorization', header)]))
}
