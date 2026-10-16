import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,

    // Integrationstests brauchen eine echte MySQL (Compose-Service `db`).
    // Ohne laufende DB werden sie uebersprungen statt rot – siehe setup unten.
    include: ['tests/**/*.test.js'],

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
