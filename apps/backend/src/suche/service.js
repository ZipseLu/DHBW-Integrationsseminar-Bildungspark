/**
 * Online search for teaching materials (FE-14, GET /api/suche).
 *
 * Returns REAL search hits only: { title, url, snippet }. There is no mock
 * mode and no fallback to invented results – without a configured provider, or
 * when the provider fails, the route answers with an error the frontend can show.
 *
 * Providers (WEB_SEARCH_PROVIDER):
 *   searxng   own SearXNG instance (self-hosted metasearch, free, no API key).
 *             SEARXNG_URL points to it; the JSON format must be enabled in its
 *             settings.yml (docker/searxng/settings.yml does that).
 *   brave     Brave Search API (official, paid per request). Needs BRAVE_SEARCH_API_KEY
 *             AND WEB_SEARCH_KOSTENPFLICHTIG_ERLAUBT=true, so it can only be
 *             switched on deliberately after the team agreed on the costs.
 *   (empty)   not configured -> 503 suche_nicht_konfiguriert
 *
 * Only http(s) URLs without embedded credentials are returned, duplicates are
 * removed and HTML tags are stripped from titles and snippets.
 */
import { config } from '../config.js'

export const ANBIETER = ['searxng', 'brave']
const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search'

/** Search failed in a way the client should see (route -> status + code) */
export class SucheError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'SucheError'
    this.status = status
    this.code = code
  }
}

const nichtKonfiguriert = (hinweis) =>
  new SucheError(`Die Online-Suche ist nicht eingerichtet. ${hinweis}`, 503, 'suche_nicht_konfiguriert')

/** Which provider would be used, or why none – for GET /api/suche/status and the route */
export function sucheStatus(cfg = config.webSearch) {
  const anbieter = (cfg.provider ?? '').trim().toLowerCase()
  if (!anbieter) return { konfiguriert: false, anbieter: null, hinweis: 'WEB_SEARCH_PROVIDER ist leer (searxng oder brave).' }
  if (!ANBIETER.includes(anbieter)) return { konfiguriert: false, anbieter, hinweis: `Unbekannter Anbieter „${anbieter}“ – erlaubt: ${ANBIETER.join(', ')}.` }
  if (anbieter === 'searxng' && !cfg.searxngUrl) return { konfiguriert: false, anbieter, hinweis: 'SEARXNG_URL fehlt.' }
  if (anbieter === 'brave' && !cfg.braveApiKey) return { konfiguriert: false, anbieter, hinweis: 'BRAVE_SEARCH_API_KEY fehlt.' }
  if (anbieter === 'brave' && !cfg.kostenpflichtigErlaubt) {
    return { konfiguriert: false, anbieter, hinweis: 'Brave ist kostenpflichtig – erst nach Abstimmung mit WEB_SEARCH_KOSTENPFLICHTIG_ERLAUBT=true freischalten.' }
  }
  return { konfiguriert: true, anbieter, hinweis: null }
}

/** http(s) URL without user/password, normalised – otherwise null */
export function sichereUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' }

/** Removes HTML tags (Brave marks hits with <strong>) and decodes common entities */
export function reinerText(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name) => ENTITIES[name])
    .replace(/\s+/g, ' ')
    .trim()
}

/** Raw hits -> { title, url, snippet }, safe URLs only, no duplicates, at most `max` */
export function bereinigeTreffer(roh, max) {
  const gesehen = new Set()
  const treffer = []
  for (const item of roh) {
    const url = sichereUrl(item?.url)
    const title = reinerText(item?.title)
    if (!url || !title || gesehen.has(url)) continue
    gesehen.add(url)
    treffer.push({ title, url, snippet: reinerText(item?.snippet) })
    if (treffer.length >= max) break
  }
  return treffer
}

async function holeJson(url, init, { timeoutMs, anbieterName, fetchImpl }) {
  let response
  try {
    response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new SucheError(`Der Suchanbieter (${anbieterName}) hat nicht rechtzeitig geantwortet.`, 504, 'suchanbieter_timeout')
    }
    throw new SucheError(`Der Suchanbieter (${anbieterName}) ist nicht erreichbar.`, 502, 'suchanbieter_nicht_erreichbar')
  }
  if (response.status === 429) {
    throw new SucheError(`Der Suchanbieter (${anbieterName}) meldet zu viele Anfragen – bitte später erneut versuchen.`, 503, 'suchanbieter_limit')
  }
  if (response.status === 401 || response.status === 403) {
    throw new SucheError(`Der Suchanbieter (${anbieterName}) lehnt den Zugang ab – Schlüssel oder Freigabe prüfen.`, 502, 'suchanbieter_zugang')
  }
  if (!response.ok) {
    throw new SucheError(`Der Suchanbieter (${anbieterName}) hat mit HTTP ${response.status} geantwortet.`, 502, 'suchanbieter_fehler')
  }
  try {
    return await response.json()
  } catch {
    const hinweis = anbieterName === 'SearXNG' ? ' Ist in der SearXNG-settings.yml unter search.formats „json“ eingetragen?' : ''
    throw new SucheError(`Der Suchanbieter (${anbieterName}) hat keine JSON-Antwort geliefert.${hinweis}`, 502, 'suchanbieter_fehler')
  }
}

async function sucheSearxng(q, cfg, fetchImpl) {
  const url = new URL('search', cfg.searxngUrl.endsWith('/') ? cfg.searxngUrl : `${cfg.searxngUrl}/`)
  url.search = new URLSearchParams({ q, format: 'json', language: 'de', safesearch: '1' }).toString()
  const body = await holeJson(url, { headers: { Accept: 'application/json' } }, { timeoutMs: cfg.timeoutMs, anbieterName: 'SearXNG', fetchImpl })
  if (!Array.isArray(body?.results)) throw new SucheError('Der Suchanbieter (SearXNG) hat eine unerwartete Antwort geliefert.', 502, 'suchanbieter_fehler')
  return body.results.map((r) => ({ title: r?.title, url: r?.url, snippet: r?.content }))
}

async function sucheBrave(q, cfg, fetchImpl) {
  const url = new URL(BRAVE_URL)
  url.search = new URLSearchParams({ q, count: String(Math.min(cfg.maxResults, 20)), country: 'DE', search_lang: 'de', safesearch: 'moderate' }).toString()
  const body = await holeJson(
    url,
    { headers: { Accept: 'application/json', 'X-Subscription-Token': cfg.braveApiKey } },
    { timeoutMs: cfg.timeoutMs, anbieterName: 'Brave Search', fetchImpl },
  )
  const roh = body?.web?.results
  if (roh !== undefined && !Array.isArray(roh)) throw new SucheError('Der Suchanbieter (Brave Search) hat eine unerwartete Antwort geliefert.', 502, 'suchanbieter_fehler')
  return (roh ?? []).map((r) => ({ title: r?.title, url: r?.url, snippet: r?.description }))
}

/**
 * @param {string} q search term (validated by the route)
 * @param {{ cfg?: typeof config.webSearch, fetchImpl?: typeof fetch }} [options] for tests
 * @returns {Promise<{ title: string, url: string, snippet: string }[]>}
 * @throws {SucheError}
 */
export async function sucheOnline(q, { cfg = config.webSearch, fetchImpl = fetch } = {}) {
  const status = sucheStatus(cfg)
  if (!status.konfiguriert) throw nichtKonfiguriert(status.hinweis)
  const roh = status.anbieter === 'searxng' ? await sucheSearxng(q, cfg, fetchImpl) : await sucheBrave(q, cfg, fetchImpl)
  return bereinigeTreffer(roh, cfg.maxResults)
}
