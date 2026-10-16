/**
 * Zentrale Konfiguration.
 *
 * Wird ausschliesslich aus Umgebungsvariablen gelesen – keine Secrets im Code.
 * In Docker kommen die Variablen aus docker-compose.yml, lokal aus `.env`.
 */
import 'dotenv/config'

const int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isTest: process.env.NODE_ENV === 'test',
  port: int(process.env.PORT, 3000),

  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: int(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME ?? 'bildungspark',
    user: process.env.DB_USER ?? 'bildungspark',
    password: process.env.DB_PASSWORD ?? '',
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
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
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
