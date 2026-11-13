// Dependency-free verification of the actual TypeScript helper sources.
import { readFile, readdir } from 'node:fs/promises'
import { resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
const root = fileURLToPath(new URL('../src/', import.meta.url))
const cache = new Map()
let parsed = 0
async function moduleUrl(path) {
  if (cache.has(path)) return cache.get(path)
  let code = stripTypeScriptTypes(await readFile(path, 'utf8'), { mode: 'transform', sourceUrl: path }).replaceAll('import.meta.env', '({})')
  for (const match of [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)]) {
    const spec = match[1]
    let url
    if (spec === 'file-saver') url = 'data:text/javascript,' + encodeURIComponent('export const saveAs = () => {}')
    else if (spec.startsWith('@/')) url = await moduleUrl(resolve(root, spec.slice(2) + '.ts'))
    else if (spec.startsWith('.')) url = await moduleUrl(resolve(dirname(path), spec + '.ts'))
    else throw new Error('Unexpected import: ' + spec)
    code = code.replace(match[0], 'from ' + JSON.stringify(url))
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  cache.set(path, url)
  return url
}
async function parseAll(path) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    const p = resolve(path, item.name)
    if (item.isDirectory()) await parseAll(p)
    else if (extname(p) === '.ts' && !p.endsWith('.d.ts')) { stripTypeScriptTypes(await readFile(p, 'utf8'), { mode: 'transform' }); parsed++ }
  }
}
await parseAll(root)
const load = async (p) => import(await moduleUrl(resolve(root, p + '.ts')))
const participants = await load('lib/participants')
const editing = await load('lib/arbeitsblattBearbeiten')
const session = await load('lib/session')
const api = await load('lib/api')
const auth = await load('lib/auth')
const online = await load('lib/onlineSearch')
const cancellation = await load('lib/abortSignals')
for (const trigger of [0, 1]) {
  const sources = [new AbortController(), new AbortController()]
  const combined = cancellation.combineAbortSignals(sources.map((s) => s.signal))
  sources[trigger].abort()
  assert.equal(combined.signal.aborted, true)
}
const disposedSource = new AbortController()
const disposed = cancellation.combineAbortSignals([disposedSource.signal])
disposed.dispose(); disposedSource.abort()
assert.equal(disposed.signal.aborted, false)
assert.equal(cancellation.combineAbortSignals([disposedSource.signal]).signal.aborted, true)
assert.equal(participants.canDeleteParticipant('assistent'), false)
assert.equal(participants.canDeleteParticipant('dozent'), true)
const drafts = [{ berufsbild: 'Lager', level: 'T', format: 'text' }, { berufsbild: 'Metall', level: 'B', format: 'piktogramm' }]
assert.match(participants.pruefeProfil('', drafts), /IW3/)
assert.match(participants.pruefeProfil('Adi Mustajbegovic', drafts), /Keine Namen/)
assert.equal(participants.pruefeProfil('iw3-1234', drafts), null)
assert.match(participants.pruefeProfil('IW3-1234', [drafts[0], drafts[0]]), /nur einmal/)
assert.deepEqual(participants.buildStations(drafts, [], '2026-11-13').map((s) => s.level), ['T', 'B'])
const worksheet = { titel: 'Holz', einleitung: 'Übung', hinweisAnleiter: '', aufgaben: [{ nr: 1, typ: 'zuordnen', anweisung: 'Verbinde.', optionen: ['A|B'] }], woerterbuch: [] }
assert.deepEqual(editing.pruefeEntwurf(worksheet), [])
assert.deepEqual(editing.bereinige(worksheet).aufgaben[0].optionen, ['A | B'])
assert.match(editing.pruefeEntwurf({ ...worksheet, aufgaben: [{ ...worksheet.aufgaben[0], optionen: ['A|'] }] }).join(' '), /linke und rechte/)
assert.match(editing.pruefeEntwurf({ ...worksheet, aufgaben: [{ ...worksheet.aufgaben[0], optionen: Array(11).fill('A|B') }] }).join(' '), /höchstens 10/)
const user = { id: 'adi', name: 'Adi', email: 'adi@example.test', role: 'dozent', initials: 'A' }
let call
globalThis.fetch = async (url, init) => { call = { url, init }; return new Response(JSON.stringify({ token: 'abc', user, expiresIn: 60 }), { status: 200 }) }
await auth.login(user.email, 'test')
assert.equal(session.getSession().token, 'abc')
await api.apiFetch('/api/test', { headers: { 'Content-Type': 'application/json' } })
assert.equal(new Headers(call.init.headers).get('Authorization'), 'Bearer abc')
assert.equal(new Headers(call.init.headers).get('Content-Type'), 'application/json')
const nativeAny = Object.getOwnPropertyDescriptor(AbortSignal, 'any')
Object.defineProperty(AbortSignal, 'any', { configurable: true, value: undefined })
try {
  const external = new AbortController()
  await api.apiFetch('/api/test', { signal: external.signal })
  assert.equal(new Headers(call.init.headers).get('Authorization'), 'Bearer abc')
} finally { if (nativeAny) Object.defineProperty(AbortSignal, 'any', nativeAny) }
await api.apiFetch('/api/test')
const activeSignal = call.init.signal
session.setSession(null)
assert.equal(activeSignal.aborted, true)
assert.equal(session.getSession(), null)
session.setSession({ token: 'abc', user, expiresAt: Date.now() + 10000 })
globalThis.fetch = async () => new Response(JSON.stringify({ message: 'expired' }), { status: 401 })
await assert.rejects(() => api.apiFetch('/api/test'), { status: 401 })
assert.equal(session.getSession(), null)
globalThis.fetch = async () => new Response(JSON.stringify({ token: 'abc', user: { ...user, role: 'root' }, expiresIn: 60 }))
await assert.rejects(() => auth.login(user.email, 'test'), { code: 'invalid_auth_response' })
assert.equal(session.getSession(), null)
globalThis.fetch = async (url) => { call = { url }; return new Response(JSON.stringify({ results: [{ title: 'Holz', url: 'https://example.test/holz' }, { title: 'Doppelt', url: 'https://example.test/holz' }, { title: 'Unsicher', url: 'javascript:alert(1)' }] })) }
const results = await online.searchOnline('Holz & Metall')
assert.equal(call.url, '/api/suche?q=Holz+%26+Metall')
assert.equal(results.length, 1)
assert.equal(results[0].source, 'example.test')
assert.equal(online.safeMaterialUrl('https://user:pass@example.test/'), null)
assert.equal(online.safeMaterialUrl('data:text/html,test'), null)
await assert.rejects(() => online.searchOnline('x'.repeat(201)), { status: 400 })
globalThis.fetch = async () => new Response(JSON.stringify({ error: 'unavailable', code: 'suche_nicht_konfiguriert', message: 'Die Online-Suche ist nicht eingerichtet.' }), { status: 503 })
await assert.rejects(() => online.searchOnline('Holz'), { status: 503, grund: 'suche_nicht_konfiguriert', message: 'Die Online-Suche ist nicht eingerichtet.' })
session.setSession({ token: 'abc', user, expiresAt: Date.now() + 5 })
await new Promise((r) => setTimeout(r, 15))
assert.equal(session.getSession(), null)
console.log(JSON.stringify({ typescriptFilesParsed: parsed, result: 'PASS', scope: 'Pure helpers and mocked API contracts; excludes React rendering, typecheck and full Vitest suite.' }))
