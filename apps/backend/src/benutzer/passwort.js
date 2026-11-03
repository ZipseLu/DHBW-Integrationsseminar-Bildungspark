/**
 * Passwörter hashen und prüfen (BE-03, wiederverwendbar für die Anmeldung in BE-01).
 *
 * Verfahren: scrypt aus `node:crypto` – in Node eingebaut, keine zusätzliche
 * Abhängigkeit. Gespeichert wird ein String im Format
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 *
 * Die Parameter stehen mit im String, damit sie später erhöht werden können,
 * ohne alte Hashes ungültig zu machen. Klartext-Passwörter werden nie
 * gespeichert, geloggt oder von der API zurückgegeben.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

/** Empfohlene Mindestwerte (OWASP): N = 2^15, r = 8, p = 1 */
export const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keyLength: 64, saltLength: 16 }

// N = 2^15 braucht 32 MB; Node erlaubt standardmäßig nur 32 MB – deshalb etwas Luft
const maxmem = (N, r) => 128 * N * r * 2

export async function hashPasswort(passwort) {
  if (typeof passwort !== 'string' || passwort.length === 0) throw new Error('Passwort fehlt')
  const { N, r, p, keyLength, saltLength } = SCRYPT
  const salt = randomBytes(saltLength)
  const hash = await scryptAsync(passwort, salt, keyLength, { N, r, p, maxmem: maxmem(N, r) })
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$')
}

/** true, wenn das Passwort zum gespeicherten Hash passt; nie eine Ausnahme bei kaputten Hashes */
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
