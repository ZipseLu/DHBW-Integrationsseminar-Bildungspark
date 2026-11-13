import { test, expect } from '@playwright/test'
import { anmelden } from './anmeldung.js'

/**
 * FE-07: main process end to end
 *
 *   KI-Erstellung -> generate one variant -> save -> find it on "Arbeitsblätter"
 *
 * Runs against the real stack (frontend, backend, MySQL). In CI there is no
 * Gemini key, so the backend answers in mock mode; with a key the same test
 * uses the real model (hence the longer timeout).
 * The saved worksheet is deleted at the end so the database stays clean.
 */

const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000'

test.describe('Hauptprozess: Arbeitsblatt erstellen, speichern, in der Liste finden', () => {
  test.setTimeout(120_000)

  let gespeicherteId = null
  let authHeaders = {}

  test.afterEach(async ({ request }) => {
    if (gespeicherteId) {
      const response = await request.delete(`${apiURL}/api/arbeitsblaetter/${gespeicherteId}?endgueltig=true`, { headers: authHeaders })
      expect(response.ok(), 'Das vom Test erzeugte Arbeitsblatt muss bereinigt werden.').toBeTruthy()
      gespeicherteId = null
    }
  })

  test('KI-Variante erstellen, speichern und in „Arbeitsblätter“ wiederfinden', async ({ page }) => {
    const session = await anmelden(page)
    expect(session.user.role, 'Dieser Test braucht ein Admin-Testkonto für die anschließende Bereinigung.').toBe('admin')
    authHeaders = session.headers
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })

    // 1) Create one variant (default: Lagerlogistik, first learning goal, level A, standard text)
    await nav.getByRole('button', { name: /KI-Erstellung/ }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('KI-Erstellung')
    await page.getByLabel(/THEMA \/ TITEL/).fill('E2E-Test Hauptprozess')
    await page.getByRole('button', { name: '✦ 1 Variante generieren' }).click()

    const ergebnis = page.getByRole('region', { name: 'Erstellte Varianten' })
    await expect(ergebnis.getByText('✓ 1 Variante erstellt')).toBeVisible({ timeout: 90_000 })

    // 2) Save it and remember what the backend stored
    const gespeichert = page.waitForResponse((r) => r.url().endsWith('/api/arbeitsblaetter') && r.request().method() === 'POST')
    await ergebnis.getByRole('button', { name: '💾 Speichern' }).click()
    const antwort = await gespeichert
    expect(antwort.status()).toBe(201)
    const { arbeitsblatt } = await antwort.json()
    gespeicherteId = arbeitsblatt.id
    await expect(ergebnis.getByRole('button', { name: '✓ Gespeichert' })).toBeDisabled()
    expect(arbeitsblatt).toMatchObject({ status: 'entwurf', version: 1, kiGeneriert: true })

    // 3) Find it in the list, loaded from the backend
    const liste = page.waitForResponse((r) => r.url().includes('/api/arbeitsblaetter?') && r.request().method() === 'GET')
    await nav.getByRole('button', { name: /Arbeitsblätter/ }).click()
    expect((await liste).ok()).toBeTruthy()

    await page.getByRole('searchbox', { name: 'Arbeitsblätter durchsuchen' }).fill(arbeitsblatt.titel)
    const karte = page.getByRole('article', { name: arbeitsblatt.titel }).first()
    await expect(karte).toBeVisible()
    await expect(karte.getByText('Entwurf')).toBeVisible()
    await expect(karte.getByText('KI', { exact: true })).toBeVisible()
    await expect(page.getByText('es werden Beispieldaten angezeigt', { exact: false })).toHaveCount(0)

    // 4) The history shows the creation with the author
    await karte.getByRole('button', { name: /Verlauf/ }).click()
    const panel = page.getByRole('dialog')
    await expect(panel.getByText('1 Versionen · Neueste zuerst')).toBeVisible()
    await expect(panel.getByText('erstellt', { exact: true })).toBeVisible()
  })
})
