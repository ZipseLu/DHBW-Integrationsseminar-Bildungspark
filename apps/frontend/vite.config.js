import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    // host/port stehen hier und NICHT als CLI-Flag im npm-Script.
    //
    // Grund: Ein CLI-Flag wie `vite --host 0.0.0.0` hat Vorrang vor der
    // Config und ueberlebt einen Config-Reload nicht sauber. Das fuehrt dazu
    // dass der Server nach dem Editieren von vite.config.js mit veralteten
    // Werten weiterlaeuft â€“ zuletzt war allowedHosts danach wieder weg und
    // der Dev-Server beantwortete Zugriffe mit "403 Blocked request".
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,

    // Vite blockt Requests, deren Host-Header nicht localhost/IP ist.
    // Das trifft im Docker-Setup den Service-Namen "frontend" und bei
    // Teamarbeit die LAN-IP des Rechners.
    //   VITE_ALLOWED_HOSTS=true  -> alles erlauben (Development)
    //   VITE_ALLOWED_HOSTS=false -> nur localhost und IP-Adressen
    //   VITE_ALLOWED_HOSTS=host1,host2 -> gezielt erlauben
    allowedHosts: parseAllowedHosts(process.env.VITE_ALLOWED_HOSTS),
    // /api aus dem Dev-Server an das Backend weiterleiten.
    // Damit laeuft das Frontend im Browser same-origin und CORS ist egal.
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
  // Test-Konfiguration liegt bewusst in vitest.config.js â€“ Vitest bevorzugt
  // diese Datei und wÃ¼rde den `test`-Block hier ignorieren.
})

/**
 * Wandelt VITE_ALLOWED_HOSTS in das Format um, das Vite erwartet.
 *
 *   undefined        -> nur localhost + IP-Adressen (Vite-Default, sicher)
 *   true             -> alles erlauben
 *   "a,b"            -> genau diese Hosts erlauben
 */
function parseAllowedHosts(value) {
  if (value === undefined || value === '') return undefined
  if (value === 'true') return true
  if (value === 'false') return undefined
  return value.split(',').map((host) => host.trim()).filter(Boolean)
}