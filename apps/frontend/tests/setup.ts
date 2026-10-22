/**
 * Vitest-Setup fuer das Frontend.
 *
 * - jest-dom-Matcher wie toBeInTheDocument() registrieren
 * - nach jedem Test das gerenderte DOM aufraeumen
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
