import { test, expect } from '@playwright/test'

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
  test('Frontend laedt und zeigt die Seite Arbeitsblaetter', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Arbeitsblattverwaltung/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arbeitsblätter')
  })

  test('Seite Arbeitsblaetter laedt die Liste aus dem Backend', async ({ page }) => {
    // FE-01: Die Liste kommt aus GET /api/arbeitsblaetter. Die CI-Datenbank ist leer
    // (kein Seed), deshalb wird nicht die Anzahl geprueft, sondern dass die Daten
    // vom Backend kommen und die Seite nicht auf Beispieldaten zurueckfaellt.
    const antwort = page.waitForResponse((r) => r.url().includes('/api/arbeitsblaetter') && r.request().method() === 'GET')
    await page.goto('/')

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
