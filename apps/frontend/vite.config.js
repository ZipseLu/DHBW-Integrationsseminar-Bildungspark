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
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Vite blockt sonst Requests mit fremdem Host-Header (z. B. LAN-IP).
    // 'true' = alle erlauben – nur fuer Development/Teamarbeit.
    allowedHosts: process.env.VITE_ALLOWED_HOSTS === 'false' ? undefined : true,
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
  // Test-Konfiguration liegt bewusst in vitest.config.js – Vitest bevorzugt
  // diese Datei und würde den `test`-Block hier ignorieren.
})
