/**
 * Vitest-Setup fuer das Frontend.
 *
 * Hier kommen globale Test-Hilfen rein (z. B. fetch-Stubs, i18n-Plug-in).
 * Aktuell wird nur das Vue-Test-Utils-Broadcasting aktiviert, damit
 * ungenutzte Komponenten-Warnungen nicht die Ausgabe noise machen.
 */
import { config } from '@vue/test-utils'

config.global.stubs = {
  transition: false,
  'transition-group': false,
}
