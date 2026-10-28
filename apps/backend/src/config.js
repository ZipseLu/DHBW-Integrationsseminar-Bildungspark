/**
 * Zentrale Konfiguration.
 *
 * Wird ausschliesslich aus Umgebungsvariablen gelesen – keine Secrets im Code.
 *
 * Woher die Variablen kommen:
 *   - Docker: docker-compose.yml reicht sie aus der Root-`.env` in den Container.
 *   - `npm run dev` ohne Docker: dotenv liest hier zwei Dateien, speziellere zuerst:
 *       1. apps/backend/.env   (optional, nur fuer das Backend)
 *       2. <Repo-Root>/.env    (dieselbe Datei, die auch Docker Compose benutzt)
 *     dotenv ueberschreibt bereits gesetzte Variablen nicht – die erste Quelle gewinnt.
 *     Deshalb reicht im Normalfall eine einzige `.env` im Repo-Root fuer beide Startarten.
 */
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = fileURLToPath(new URL('..', import.meta.url))
export const ENV_FILES = [resolve(backendRoot, '.env'), resolve(backendRoot, '../../.env')]
for (const path of ENV_FILES) loadEnv({ path })

const int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Erster nicht-leerer Wert aus mehreren Umgebungsvariablen */
const first = (...names) => names.map((name) => process.env[name]).find((value) => value !== undefined && value !== '')

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isTest: process.env.NODE_ENV === 'test',
  port: int(process.env.PORT, 3000),

  // DB_* setzt Docker Compose im Container. Ohne Docker greifen die MYSQL_*-Werte
  // der Root-.env, mit MYSQL_PORT = Host-Port des Compose-Dienstes `db` (3307).
  db: {
    host: first('DB_HOST') ?? '127.0.0.1',
    port: int(first('DB_PORT', 'MYSQL_PORT'), 3306),
    database: first('DB_NAME', 'MYSQL_DATABASE') ?? 'bildungspark',
    user: first('DB_USER', 'MYSQL_USER') ?? 'bildungspark',
    password: first('DB_PASSWORD', 'MYSQL_PASSWORD') ?? '',
    connectionLimit: int(process.env.DB_POOL_SIZE, 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-bitte-aendern',

  ai: {
    // 'gemini' | 'azure' – hier zentral umschalten, wenn die Azure-Phase startet.
    provider: process.env.AI_PROVIDER ?? 'gemini',
    // Zeitlimit eines Generierungsauftrags in Millisekunden (inkl. Wiederholungsversuch)
    timeoutMs: int(process.env.AI_TIMEOUT_MS, 60_000),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      // Stand 22.10.2026: 'gemini-2.5-flash' ist fuer neue Keys nicht mehr verfuegbar (404),
      // 'gemini-flash-latest' und 'gemini-3.8-flash' antworten im Free-Tier haeufig mit 503.
      // 'gemini-3.5-flash' hat im Test funktioniert. Bei 503 wechselt das Backend einmalig
      // auf das Fallback-Modell (kleiner, aber meist verfuegbar).
      model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash',
      fallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.5-flash-lite',
    },
    azure: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? '',
      apiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? '',
    },
  },
}

/** Loggt die Konfiguration ohne sensible Werte. */
export function describeConfig() {
  return {
    env: config.env,
    port: config.port,
    db: `${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`,
    aiProvider: config.ai.provider,
    aiConfigured: Boolean(
      config.ai.provider === 'gemini'
        ? config.ai.gemini.apiKey
        : config.ai.azure.apiKey,
    ),
  }
}
