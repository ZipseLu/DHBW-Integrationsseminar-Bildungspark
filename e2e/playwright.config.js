import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright-Konfiguration.
 *
 * BASE_URL zeigt im Compose auf den Container-Namen `frontend` – nicht auf
 * localhost, denn die Tests laufen ja selbst im Docker-Netz.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',

  // Voller Retry in CI, lokal nicht (dort willst du Fehler sofort sehen)
  retries: process.env.CI ? 2 : 0,

  // Im Docker laufen die Tests in einem Container – 1 Worker ist dort sicherer
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'on-failure' }]],

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Weitere Browser koennen spaeter ergaenzt werden:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'mobile',  use: { ...devices['Pixel 7'] } },
  ],

  // Globale URLs fuer die Tests
  // (playwright erlaubt keine eigenen Env-Variablen, daher ueber define)
  globalSetup: './tests/global-setup.js',

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // Nur noetig, wenn Playwright ausserhalb von Docker laeuft:
        // dann startet Playwright das Frontend selbst.
        command: 'npm run dev',
        cwd: '../apps/frontend',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})

export { apiURL }
