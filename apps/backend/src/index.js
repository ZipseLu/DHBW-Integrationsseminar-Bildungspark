/**
 * Server-Start. Hier – und nur hier – wird der Port belegt.
 *
 * `import 'dotenv/config'` laeuft bereits ueber config.js.
 */
import { createApp, describeConfig } from './app.js'
import { config } from './config.js'
import { ping, closePool } from './db.js'

const app = createApp()

const server = app.listen(config.port, '0.0.0.0', async () => {
  console.log('[backend] Konfiguration:', JSON.stringify(describeConfig()))

  // Datenbank-Verbindung frueh pruefen, damit Fehler sofort sichtbar sind
  try {
    const result = await ping()
    console.log(`[backend] MySQL erreichbar (${result.latencyMs} ms)`)
  } catch (error) {
    console.error('[backend] WARNUNG: MySQL nicht erreichbar:', error.message)
  }

  console.log(`[backend] laeuft auf http://0.0.0.0:${config.port}`)
})

// Sauberes Herunterfahren, damit Docker kein SIGKILL schickt
async function shutdown(signal) {
  console.log(`[backend] ${signal} empfangen, fahre herunter…`)
  server.close(async () => {
    await closePool()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
