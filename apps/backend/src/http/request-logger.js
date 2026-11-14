import morgan from 'morgan'

const DEVELOPMENT_FORMAT = ':method :safe-url :status :response-time ms - :res[content-length]'
const PRODUCTION_FORMAT = '[:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length]'

/** URL für Access-Logs: Query-Strings und dynamische Teilnehmendenkennungen auslassen. */
export function safeRequestUrl(req) {
  const url = String(req.originalUrl ?? req.url ?? '/').split('?', 1)[0]
  return url.replace(/(\/api\/teilnehmende\/)([^/]+)/i, (_match, prefix, segment) =>
    segment.toLowerCase() === 'lernstand' ? `${prefix}${segment}` : `${prefix}[redacted]`,
  )
}

export function requestLogFormat(env) {
  return env === 'production' ? PRODUCTION_FORMAT : DEVELOPMENT_FORMAT
}

export function createRequestLogger(env) {
  morgan.token('safe-url', safeRequestUrl)
  return morgan(requestLogFormat(env))
}
