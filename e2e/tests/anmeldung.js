import { expect } from '@playwright/test'

export function testZugang() {
  const email = process.env.E2E_EMAIL ?? 'c.hager@bildungspark.example'
  const password = process.env.E2E_PASSWORT ?? process.env.SEED_PASSWORT
  if (!password) throw new Error('Für E2E E2E_PASSWORT oder SEED_PASSWORT setzen und das passende Testkonto in der lokalen Testdatenbank anlegen. Kein Passwort ins Repository schreiben.')
  return { email, password }
}

/** Real UI login: an in-memory token cannot be restored through storageState. */
export async function anmelden(page) {
  const { email, password } = testZugang()
  await page.goto('/')
  await page.getByLabel('E-Mail', { exact: true }).fill(email)
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  const login = page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click()
  const response = await login
  expect(response.ok(), 'Das E2E-Testkonto muss mit dem konfigurierten Passwort angelegt sein.').toBeTruthy()
  const { token, user } = await response.json()
  expect(typeof token).toBe('string')
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible()
  return { headers: { Authorization: `Bearer ${token}` }, user }
}

export async function apiAnmelden(request, apiURL) {
  const response = await request.post(`${apiURL}/api/auth/login`, { data: testZugang() })
  expect(response.ok(), 'API-Anmeldung für den E2E-Test fehlgeschlagen. Testkonto und Passwort prüfen.').toBeTruthy()
  const { token } = await response.json()
  expect(typeof token).toBe('string')
  return { Authorization: `Bearer ${token}` }
}
