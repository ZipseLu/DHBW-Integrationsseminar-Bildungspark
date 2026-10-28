import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,

    // Integrationstests brauchen eine echte MySQL (Compose-Service `db`).
    // Ohne laufende DB werden sie uebersprungen statt rot – siehe setup unten.
    include: ['tests/**/*.test.js'],

    // Tests laufen IMMER im Mock-Modus – auch wenn lokal eine .env mit
    // API-Key liegt. dotenv ueberschreibt bereits gesetzte Variablen nicht,
    // deshalb reicht es, die Keys hier leer vorzubelegen. So verbraucht kein
    // Testlauf Gemini-Kontingent und die Ergebnisse bleiben deterministisch.
    env: {
      GEMINI_API_KEY: '',
      AZURE_OPENAI_API_KEY: '',
      AZURE_OPENAI_ENDPOINT: '',
      AI_PROVIDER: 'gemini',
      // Datenbank nur, wenn DB_* ausdruecklich gesetzt ist (CI, Compose) – die
      // MYSQL_*-Werte einer lokalen Root-.env sollen keinen Testlauf auf die
      // Entwicklungsdatenbank lenken.
      MYSQL_PORT: '',
      MYSQL_DATABASE: '',
      MYSQL_USER: '',
      MYSQL_PASSWORD: '',
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: ['tests/**', 'src/index.js', 'scripts/**'],
    },

    // Vitest startet Testdateien parallel. Integrationstests teilen sich
    // dieselbe Testdatenbank – deshalb laufen sie sequenziell.
    fileParallelism: false,

    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
