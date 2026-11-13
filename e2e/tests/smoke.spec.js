import { test, expect } from '@playwright/test'
import { anmelden, apiAnmelden } from './anmeldung.js'

/**
 * Smoke-Test: beweist, dass die komplette Kette steht.
 *
 *   Playwright -> Frontend (React/Vite) -> /api-Proxy -> Express -> MySQL
 *
 * Wenn dieser Test gruen ist, funktioniert die Infrastruktur.
 * Feature-Tests fuer Arbeitsblaetter kommen mit EPIC 1 dazu.
 */

const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000'

test.describe('Infrastruktur-Smoke-Test', () => {
  test('Frontend laedt und verlangt eine Anmeldung', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Arbeitsblattverwaltung/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arbeitsblattverwaltung')
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible()
    await expect(page.getByRole('navigation')).toHaveCount(0)
  })

  test('Seite Arbeitsblaetter laedt die Liste aus dem Backend', async ({ page }) => {
    // The test account is seeded. Worksheet count is deliberately not fixed.
    await anmelden(page)
    const antwort = page.waitForResponse((r) => r.url().includes('/api/arbeitsblaetter') && r.request().method() === 'GET')
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: /Arbeitsblätter/ }).click()

    expect((await antwort).ok()).toBeTruthy()
    await expect(page.getByText('Arbeitsblätter werden geladen')).toBeHidden()
    await expect(page.getByText('es werden Beispieldaten angezeigt', { exact: false })).toHaveCount(0)
    await expect(page.getByText('Noch keine Arbeitsblätter gespeichert', { exact: false }).or(page.getByRole('article').first())).toBeVisible()
  })

  test('Frontend erreicht das Backend ueber den /api-Proxy', async ({ page }) => {
    // Health-Check direkt ueber die Frontend-Origin (Vite-Proxy -> Express)
    const response = await page.request.get('/api/health')

    expect(response.ok()).toBeTruthy()
    expect((await response.json()).service).toBe('bildungspark-backend')
  })


  test('Backend meldet MySQL als erreichbar', async ({ request }) => {
    const response = await request.get(`${apiURL}/api/health`)

    expect(response.ok()).toBeTruthy()
    const body = await response.json()

    expect(body.status).toBe('ok')
    expect(body.database.status).toBe('up')
  })

  test('Backend meldet den KI-Provider', async ({ request }) => {
    const headers = await apiAnmelden(request, apiURL)
    const response = await request.get(`${apiURL}/api/ai/status`, { headers })

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body).toHaveProperty('provider')
  })

  test('unbekannte Routen ergeben 404 mit Fehlerformat', async ({ request }) => {
    const headers = await apiAnmelden(request, apiURL)
    const response = await request.get(`${apiURL}/api/gibt-es-nicht`, { headers })

    expect(response.status()).toBe(404)
    expect((await response.json()).error).toBe('not_found')
  })
  test('geschützte Routen verlangen ohne Token eine Anmeldung', async ({ request }) => {
    const response = await request.get(`${apiURL}/api/arbeitsblaetter`)
    expect(response.status()).toBe(401)
  })
})
