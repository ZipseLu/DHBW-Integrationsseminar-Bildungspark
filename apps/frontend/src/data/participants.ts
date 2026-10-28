import { BERUFSBILD_GALA, BERUFSBILD_GASTRO, BERUFSBILD_LAGER, BERUFSBILD_METALL } from '@/data/constants'
import type { Participant } from '@/types'

/**
 * Beispiel-Teilnehmende fuer den Prototyp (aus dem Figma-Mockup).
 *
 * Nur pseudonyme Kennungen im Format "IW3-xxxx", keine Namen und keine
 * Diagnosen (§ 60 SGB IX, siehe docs/fachliche-grundlagen.md).
 * Gegenueber dem Mockup angepasst: Berufsfelder auf die Bezeichnungen des
 * Bildungsparks umgestellt ("Reinigung & Gebaeudepflege" gibt es dort nicht,
 * ersetzt durch Garten- und Landschaftsbau) und Daten auf 2026 verschoben.
 * Werden spaeter durch Backend-Daten ersetzt.
 */
export const PARTICIPANTS: Participant[] = [
  {
    id: 'IW3-4421', level: 'A', progress: 68, lastActive: '2026-10-21',
    berufsbilder: [
      { berufsbild: BERUFSBILD_GALA, level: 'T', format: 'piktogramm', progress: 100, status: 'abgeschlossen', startDate: '2026-06-01', endDate: '2026-07-12', worksheetsDone: 8 },
      { berufsbild: BERUFSBILD_LAGER, level: 'A', format: 'text', progress: 68, status: 'aktiv', startDate: '2026-07-13', worksheetsDone: 3 },
      { berufsbild: BERUFSBILD_METALL, level: 'A', format: 'mathefrei', progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0 },
    ],
  },
  {
    id: 'IW3-4388', level: 'F', progress: 82, lastActive: '2026-10-20',
    berufsbilder: [
      { berufsbild: BERUFSBILD_GASTRO, level: 'T', format: 'text', progress: 100, status: 'abgeschlossen', startDate: '2026-05-15', endDate: '2026-06-30', worksheetsDone: 5 },
      { berufsbild: BERUFSBILD_METALL, level: 'A', format: 'piktogramm', progress: 100, status: 'abgeschlossen', startDate: '2026-07-01', endDate: '2026-08-28', worksheetsDone: 3 },
      { berufsbild: BERUFSBILD_LAGER, level: 'F', format: 'piktogramm-mathefrei', progress: 82, status: 'aktiv', startDate: '2026-08-29', worksheetsDone: 3 },
    ],
  },
  {
    id: 'IW3-4412', level: 'T', progress: 34, lastActive: '2026-10-19',
    berufsbilder: [
      { berufsbild: BERUFSBILD_GASTRO, level: 'T', format: 'piktogramm-mathefrei', progress: 34, status: 'aktiv', startDate: '2026-09-01', worksheetsDone: 2 },
      { berufsbild: BERUFSBILD_GALA, level: 'T', format: 'piktogramm', progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0 },
    ],
  },
  {
    id: 'IW3-4399', level: 'A', progress: 57, lastActive: '2026-10-16',
    berufsbilder: [
      { berufsbild: BERUFSBILD_GALA, level: 'T', format: 'mathefrei', progress: 100, status: 'abgeschlossen', startDate: '2026-06-10', endDate: '2026-07-20', worksheetsDone: 8 },
      { berufsbild: BERUFSBILD_GASTRO, level: 'A', format: 'text', progress: 57, status: 'aktiv', startDate: '2026-07-21', worksheetsDone: 3 },
    ],
  },
  {
    id: 'IW3-4401', level: 'T', progress: 21, lastActive: '2026-10-14',
    berufsbilder: [
      { berufsbild: BERUFSBILD_METALL, level: 'T', format: 'text', progress: 21, status: 'aktiv', startDate: '2026-09-08', worksheetsDone: 1 },
      { berufsbild: BERUFSBILD_LAGER, level: 'T', format: 'piktogramm', progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0 },
      { berufsbild: BERUFSBILD_GASTRO, level: 'T', format: 'mathefrei', progress: 0, status: 'ausstehend', startDate: '', worksheetsDone: 0 },
    ],
  },
]
