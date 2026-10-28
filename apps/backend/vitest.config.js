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
      // Datenbank nur, wenn DB_* im echten Prozess-Env steht (CI, Compose, Kommandozeile).
      // Diese Datei laeuft im Elternprozess ohne dotenv – ein DB_HOST oder MYSQL_*, das nur
      // in der Root-.env steht, wird hier zu '' und kann keinen Testlauf (der Arbeitsblaetter
      // LOESCHT) auf die Entwicklungsdatenbank lenken. dotenv ueberschreibt '' nicht.
      DB_HOST: process.env.DB_HOST ?? '',
      DB_PORT: process.env.DB_PORT ?? '',
      DB_NAME: process.env.DB_NAME ?? '',
      DB_USER: process.env.DB_USER ?? '',
      DB_PASSWORD: process.env.DB_PASSWORD ?? '',
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
