import { describe, it, expect } from 'vitest'
import { bearbeiter } from '../../src/auth/bearbeiter.js'

describe('bearbeiter', () => {
  it('nimmt den Namen aus dem Token, nicht aus dem Body', () => {
    expect(bearbeiter({ benutzer: { name: 'Test Dozent' } }, 'Gefälscht')).toBe('Test Dozent')
  })

  it('ignoriert den Body auch dann, wenn dem Token der name-Claim fehlt', () => {
    expect(bearbeiter({ benutzer: { name: null } }, 'Gefälscht')).toBeNull()
    expect(bearbeiter({ benutzer: {} }, 'Gefälscht')).toBeNull()
  })

  it('nutzt den Body nur ohne Anmeldung', () => {
    expect(bearbeiter({}, 'C. Hager')).toBe('C. Hager')
    expect(bearbeiter({}, undefined)).toBeUndefined()
  })
})
