import { LEVELS } from '@/data/constants'
import type { GespeichertesArbeitsblatt } from '@/lib/api'
import { todayIso } from '@/lib/date'
import type { Level, Worksheet } from '@/types'

/**
 * Kennzahlen für das Dashboard (FE-06) – aus den gespeicherten Arbeitsblättern
 * des Backends oder, wenn das nicht erreichbar ist, aus den Beispieldaten.
 *
 * Eigener Kennzahlen-Endpunkt folgt mit BE-07; bis dahin wird hier aus der
 * Liste GET /api/arbeitsblaetter gerechnet.
 */

export type ZuletztEintrag = {
  key: string
  baustein: number | null
  titel: string
  untertitel: string
  ki: boolean
  datum: string
  status?: GespeichertesArbeitsblatt['status']
  stufe?: Level
}

export type DashboardDaten = {
  gesamt: number
  berufsfelder: number
  ki: number
  freigegeben: number | null
  proStufe: Record<Level, number>
  zuletzt: ZuletztEintrag[]
}

const ANZAHL_ZULETZT = 5

const leereStufen = () => Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>

/** Aus GET /api/arbeitsblaetter (ohne archivierte Blätter) */
export function dashboardAusGespeicherten(blaetter: readonly GespeichertesArbeitsblatt[]): DashboardDaten {
  const proStufe = leereStufen()
  for (const b of blaetter) proStufe[b.stufe] += 1

  const zuletzt = [...blaetter]
    .sort((a, b) => b.geaendertAm.localeCompare(a.geaendertAm))
    .slice(0, ANZAHL_ZULETZT)
    .map((b) => ({
      key: b.id,
      baustein: b.baustein,
      titel: b.titel,
      untertitel: [b.ausbildungsbaustein, b.berufsfeld, b.erstelltVon].filter(Boolean).join(' · '),
      ki: b.kiGeneriert,
      datum: todayIso(new Date(b.geaendertAm)),
      status: b.status,
      stufe: b.stufe,
    }))

  return {
    gesamt: blaetter.length,
    berufsfelder: new Set(blaetter.map((b) => b.berufsfeld)).size,
    ki: blaetter.filter((b) => b.kiGeneriert).length,
    freigegeben: blaetter.filter((b) => b.status === 'freigegeben').length,
    proStufe,
    zuletzt,
  }
}

/** Aus den lokalen Beispieldaten (Rückfall ohne Backend/Datenbank) */
export function dashboardAusBeispielen(worksheets: readonly Worksheet[]): DashboardDaten {
  const proStufe = leereStufen()
  for (const w of worksheets) for (const l of LEVELS) if (w.abschnitt.niveaus[l]?.kompetenz) proStufe[l] += 1

  const zuletzt = [...worksheets]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, ANZAHL_ZULETZT)
    .map((w) => ({
      key: String(w.id),
      baustein: w.baustein,
      titel: w.title,
      untertitel: `${w.ausbildungsbaustein} · ${w.berufsbild}`,
      ki: w.aiGenerated,
      datum: w.date,
    }))

  return {
    gesamt: worksheets.length,
    berufsfelder: new Set(worksheets.map((w) => w.berufsbild)).size,
    ki: worksheets.filter((w) => w.aiGenerated).length,
    freigegeben: null,
    proStufe,
    zuletzt,
  }
}
