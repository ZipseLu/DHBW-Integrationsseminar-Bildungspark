import { test, expect } from '@playwright/test'

/**
 * Smoke-Test: beweist, dass die komplette Kette steht.
 *
 *   Playwright -> Frontend (Vue/Vite) -> /api-Proxy -> Express -> MySQL
 *
 * Wenn dieser Test gruen ist, funktioniert die Infrastruktur.
 * Feature-Tests fuer Arbeitsblaetter kommen mit EPIC 1 dazu.
 */

const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000'

test.describe('Infrastruktur-Smoke-Test', () => {
  test('Frontend laedt und zeigt die Ueberschrift', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Arbeitsblattverwaltung/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Arbeitsblattverwaltung',
    )
  })

  test('Frontend erreicht das Backend ueber den /api-Proxy', async ({ page }) => {
    await page.goto('/')

    // Die App fragt beim Mount /api/health ab und zeigt das Ergebnis
    await expect(page.getByText('bildungspark-backend')).toBeVisible({ timeout: 15_000 })
  })

  test('Backend meldet MySQL als erreichbar', async ({ request }) => {
    const response = await request.get(`${apiURL}/api/health`)

    expect(response.ok()).toBeTruthy()
    const body = await response.json()

    expect(body.status).toBe('ok')
    expect(body.database.status).toBe('up')
  })

  test('Backend meldet den KI-Provider', async ({ request }) => {
    const response = await request.get(`${apiURL}/api/ai/status`)

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body).toHaveProperty('provider')
  })

  test('unbekannte Routen ergeben 404 mit Fehlerformat', async ({ request }) => {
    const response = await request.get(`${apiURL}/api/gibt-es-nicht`)

    expect(response.status()).toBe(404)
    expect((await response.json()).error).toBe('not_found')
  })
})
