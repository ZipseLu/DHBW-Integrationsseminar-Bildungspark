import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../../src/App.vue'

/**
 * Vue Test Utils: rendert die App in jsdom und prueft das Verhalten.
 * Kein Browser, kein Docker, kein Netzwerk noetig.
 */

function mockFetch(payload) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => payload,
  })
}

describe('App.vue', () => {
  it('rendert die Ueberschrift', () => {
    const wrapper = mount(App, { global: { mocks: { $fetch: vi.fn() } } })
    expect(wrapper.text()).toContain('Arbeitsblattverwaltung')
  })

  it('zeigt den Backend-Status nach dem Mount', async () => {
    global.fetch = mockFetch({
      status: 'ok',
      service: 'bildungspark-backend',
      env: 'test',
      database: { status: 'up', latencyMs: 4 },
    })

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('bildungspark-backend')
    expect(wrapper.text()).toContain('(4 ms)')
  })

  it('meldet einen Ausfall, statt eine leere Seite zu zeigen', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Backend nicht erreichbar'))

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('down')
  })
})
