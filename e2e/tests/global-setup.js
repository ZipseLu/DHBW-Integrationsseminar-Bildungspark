/**
 * Globaler Setup-Schritt.
 *
 * Prueft VOR dem ersten Test, ob die gesamte Kette steht:
 *   Playwright-Container -> Frontend -> Backend -> MySQL
 *
 * Wenn das nicht der Fall ist, bricht der Lauf mit einer klaren Meldung ab
 * statt mit 30 roten Tests, die alle an `net::ECONNREFUSED` scheitern.
 */
export default async function globalSetup() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
  const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000'

  const targets = [
    { name: 'Frontend', url: baseURL },
    { name: 'Backend Health', url: `${apiURL}/api/health` },
  ]

  const failures = []

  for (const target of targets) {
    try {
      const response = await fetch(target.url, {
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        failures.push(`${target.name} antwortete mit HTTP ${response.status}`)
        continue
      }
      console.log(`[e2e-setup] ${target.name} erreichbar: ${target.url}`)
    } catch (error) {
      failures.push(`${target.name} nicht erreichbar (${target.url}): ${error.message}`)
    }
  }

  // Backend-Health genauer pruefen: liefert es "ok" oder nur "degraded"?
  try {
    const health = await fetch(`${apiURL}/api/health`, {
      signal: AbortSignal.timeout(15_000),
    }).then((r) => r.json())

    if (health.status !== 'ok') {
      failures.push(
        `Backend laeuft, meldet aber Status "${health.status}" – ist MySQL bereit?`,
      )
    } else {
      console.log('[e2e-setup] MySQL erreichbar')
    }
  } catch {
    // bereits oben erfasst
  }

  if (failures.length > 0) {
    throw new Error(
      [
        'E2E-Setup fehlgeschlagen:',
        ...failures.map((f) => `  - ${f}`),
        '',
        'Loesung: laeuft der Stack?',
        '  docker compose up --build',
      ].join('\n'),
    )
  }
}
