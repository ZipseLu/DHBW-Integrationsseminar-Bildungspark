<script setup>
/**
 * Scaffold-App: prueft die Verbindung zum Backend.
 *
 * Dient als Beweis, dass die komplette Kette
 * Browser -> Vite -> (Proxy) -> Express -> MySQL steht.
 * Wird ersetzt, sobald die echte Seitenstruktur folgt.
 */
import { ref, onMounted } from 'vue'
import { api } from './api.js'

const status = ref('loading')
const detail = ref(null)
const ai = ref(null)

async function check() {
  status.value = 'loading'
  try {
    const health = await api.health()
    status.value = health.status
    detail.value = health
  } catch (error) {
    status.value = 'down'
    detail.value = { message: error.message }
  }

  try {
    ai.value = await api.aiStatus()
  } catch {
    ai.value = null
  }
}

onMounted(check)
</script>

<template>
  <main class="page">
    <header>
      <h1>Arbeitsblattverwaltung</h1>
      <p class="sub">Bildungspark Heilbronn-Franken &middot; Monorepo-Scaffold</p>
    </header>

    <section class="cards">
      <article class="card">
        <h2>Backend</h2>
        <p :class="['badge', status]">{{ status }}</p>
        <dl v-if="detail">
          <dt>Dienst</dt>
          <dd>{{ detail.service ?? '—' }}</dd>
          <dt>Umgebung</dt>
          <dd>{{ detail.env ?? '—' }}</dd>
          <dt>MySQL</dt>
          <dd>
            {{ detail.database?.status ?? '—' }}
            <template v-if="detail.database?.latencyMs">
              ({{ detail.database.latencyMs }} ms)
            </template>
          </dd>
          <template v-if="detail.message">
            <dt>Fehler</dt>
            <dd class="error">{{ detail.message }}</dd>
          </template>
        </dl>
        <button type="button" @click="check">Erneut prüfen</button>
      </article>

      <article class="card">
        <h2>KI-Provider</h2>
        <p :class="['badge', ai?.configured ? 'ok' : 'warn']">
          {{ ai ? (ai.configured ? 'konfiguriert' : 'Mock-Modus') : 'nicht erreichbar' }}
        </p>
        <dl v-if="ai">
          <dt>Provider</dt>
          <dd>{{ ai.provider }}</dd>
          <dt>Modell</dt>
          <dd>{{ ai.model }}</dd>
        </dl>
        <p v-if="ai?.hint" class="hint">{{ ai.hint }}</p>
      </article>
    </section>
  </main>
</template>
