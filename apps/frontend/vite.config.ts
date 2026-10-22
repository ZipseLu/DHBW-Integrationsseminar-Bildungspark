import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    // host/port stehen hier und NICHT als CLI-Flag im npm-Script.
    //
    // Grund: Ein CLI-Flag wie `vite --host 0.0.0.0` hat Vorrang vor der
    // Config und ueberlebt einen Config-Reload nicht sauber. Das fuehrt dazu,
    // dass der Server nach dem Editieren der Config mit veralteten Werten
    // weiterlaeuft – zuletzt war allowedHosts danach wieder weg und der
    // Dev-Server beantwortete Zugriffe mit "403 Blocked request".
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,

    // Vite blockt Requests, deren Host-Header nicht localhost/IP ist.
    // Das trifft im Docker-Setup den Service-Namen "frontend" und bei
    // Teamarbeit die LAN-IP des Rechners.
    //   VITE_ALLOWED_HOSTS=true        -> alles erlauben (Development)
    //   VITE_ALLOWED_HOSTS=false       -> nur localhost und IP-Adressen
    //   VITE_ALLOWED_HOSTS=host1,host2 -> gezielt erlauben
    allowedHosts: parseAllowedHosts(process.env.VITE_ALLOWED_HOSTS),

    // /api aus dem Dev-Server an das Backend weiterleiten.
    // Der Prototyp arbeitet noch mit lokalen Beispieldaten, der Proxy bleibt
    // aber stehen, damit das Backend spaeter ohne Umbau angebunden werden kann.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // Test-Konfiguration liegt bewusst in vitest.config.ts – Vitest bevorzugt
  // diese Datei und wuerde einen `test`-Block hier ignorieren.
})

/**
 * Wandelt VITE_ALLOWED_HOSTS in das Format um, das Vite erwartet.
 *
 *   undefined / "false" -> nur localhost + IP-Adressen (Vite-Default, sicher)
 *   "true"              -> alles erlauben
 *   "a,b"               -> genau diese Hosts erlauben
 */
function parseAllowedHosts(value: string | undefined): true | string[] | undefined {
  if (value === undefined || value === '') return undefined
  if (value === 'true') return true
  if (value === 'false') return undefined
  return value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
}
