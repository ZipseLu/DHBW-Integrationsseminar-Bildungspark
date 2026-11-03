/**
 * Hash and verify passwords (BE-03, reusable for the login in BE-01).
 *
 * Algorithm: scrypt from `node:crypto` – built into Node, no extra dependency.
 * Stored as a string in the format
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 *
 * The parameters are part of the string so they can be raised later without
 * invalidating existing hashes. Plain-text passwords are never stored, logged
 * or returned by the API.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

/** Recommended minimum values (OWASP): N = 2^15, r = 8, p = 1 */
export const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keyLength: 64, saltLength: 16 }

// N = 2^15 needs 32 MB; Node only allows 32 MB by default – so leave some headroom
const maxmem = (N, r) => 128 * N * r * 2

export async function hashPasswort(passwort) {
  if (typeof passwort !== 'string' || passwort.length === 0) throw new Error('Passwort fehlt')
  const { N, r, p, keyLength, saltLength } = SCRYPT
  const salt = randomBytes(saltLength)
  const hash = await scryptAsync(passwort, salt, keyLength, { N, r, p, maxmem: maxmem(N, r) })
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$')
}

/** true if the password matches the stored hash; never throws on malformed hashes */
export async function pruefePasswort(passwort, gespeichert) {
  if (typeof passwort !== 'string' || typeof gespeichert !== 'string') return false
  const teile = gespeichert.split('$')
  if (teile.length !== 6 || teile[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, hashB64] = teile
  const N = Number(n), R = Number(r), P = Number(p)
  if (![N, R, P].every(Number.isInteger)) return false
  const erwartet = Buffer.from(hashB64, 'base64')
  if (erwartet.length === 0) return false
  const hash = await scryptAsync(passwort, Buffer.from(saltB64, 'base64'), erwartet.length, { N, r: R, p: P, maxmem: maxmem(N, R) })
  return timingSafeEqual(hash, erwartet)
}
