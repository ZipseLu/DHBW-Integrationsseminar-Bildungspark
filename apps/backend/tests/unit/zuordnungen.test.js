import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { berechneLernstand } from '../../src/zuordnungen/lernstand.js'
import { toApi } from '../../src/zuordnungen/repository.js'
import { CreateSchema, ListQuerySchema, PatchSchema } from '../../src/zuordnungen/schema.js'

/**
 * Assignments and learning status (BE-04) without a database: the rules of the
 * learning status, schemas and the input checks of the routes.
 * Against MySQL: tests/integration/zuordnungen-routes.test.js
 */
const LAGER = 'Lagerlogistik, Handel & Versand'
const GASTRO = 'Gastronomie & Hauswirtschaft'
const METALL = 'Metalltechnik & Montage'
const GALA = 'Garten- und Landschaftsbau'
const BLATT_ID = '22222222-2222-4222-8222-222222222222'

const station = (berufsfeld, status, stufe = 'A', format = 'text') => ({ berufsfeld, status, stufe, format })

let laufendeNr = 0
/** Assignment like the repository returns it; `tag` = day in November for the timestamps */
function zuordnung(berufsfeld, status, tag, titel = `Blatt ${tag}`) {
  laufendeNr += 1
  const id = `00000000-0000-4000-8000-${String(laufendeNr).padStart(12, '0')}`
  return {
    id,
    kennung: 'IW3-4421',
    status,
    zugeordnetAm: `2026-11-${String(tag).padStart(2, '0')}T08:00:00.000Z`,
    erledigtAm: status === 'erledigt' ? `2026-11-${String(tag + 1).padStart(2, '0')}T15:00:00.000Z` : null,
    zugeordnetVon: 'C. Hager',
    arbeitsblatt: { id, titel, berufsfeld, baustein: 1, ausbildungsbaustein: null, lernziel: 'x', stufe: 'A', format: 'text', sprache: 'Leichte Sprache', status: 'freigegeben' },
  }
}

const TEILNEHMER = {
  kennung: 'IW3-4421',
  stationen: [station(GALA, 'abgeschlossen', 'T', 'piktogramm'), station(LAGER, 'aktiv'), station(METALL, 'ausstehend', 'A', 'mathefrei')],
}

describe('berechneLernstand', () => {
  it('zählt je Berufsfeld erledigt/offen und rechnet den Fortschritt', () => {
    const lernstand = berechneLernstand(TEILNEHMER, [zuordnung(LAGER, 'erledigt', 2), zuordnung(LAGER, 'offen', 3), zuordnung(LAGER, 'erledigt', 4)])
    const lager = lernstand.berufsfelder.find((feld) => feld.berufsfeld === LAGER)
    expect(lager.anzahl).toEqual({ erledigt: 2, offen: 1, gesamt: 3 })
    expect(lager.fortschritt).toBe(67)
    expect(lernstand.anzahl).toEqual({ erledigt: 2, offen: 1, gesamt: 3 })
  })

  it('folgt der Reihenfolge des Lernwegs und zeigt Stationen ohne Zuordnung mit 0', () => {
    const lernstand = berechneLernstand(TEILNEHMER, [])
    expect(lernstand.berufsfelder.map((feld) => feld.berufsfeld)).toEqual([GALA, LAGER, METALL])
    expect(lernstand.berufsfelder[1]).toMatchObject({
      station: { position: 1, status: 'aktiv', stufe: 'A', format: 'text' },
      fortschritt: 0,
      anzahl: { erledigt: 0, offen: 0, gesamt: 0 },
      alsNaechstes: null,
    })
    expect(lernstand.alsNaechstes).toBeNull()
  })

  it('hängt Berufsfelder ohne Station alphabetisch hinten an', () => {
    const lernstand = berechneLernstand({ kennung: 'IW3-1', stationen: [station(METALL, 'aktiv')] }, [zuordnung(LAGER, 'offen', 2), zuordnung(GASTRO, 'offen', 3)])
    expect(lernstand.berufsfelder.map((feld) => [feld.berufsfeld, feld.station === null])).toEqual([
      [METALL, false],
      [GASTRO, true],
      [LAGER, true],
    ])
  })

  it('„als Nächstes“ je Berufsfeld ist die am längsten offene Zuordnung', () => {
    const neu = zuordnung(LAGER, 'offen', 9, 'neu')
    const alt = zuordnung(LAGER, 'offen', 3, 'alt')
    const lager = berechneLernstand(TEILNEHMER, [neu, alt]).berufsfelder.find((feld) => feld.berufsfeld === LAGER)
    expect(lager.alsNaechstes.arbeitsblatt.titel).toBe('alt')
    expect(lager.offen.map((z) => z.arbeitsblatt.titel)).toEqual(['alt', 'neu'])
  })

  it('erledigte Blätter: zuletzt erledigtes zuerst', () => {
    const lager = berechneLernstand(TEILNEHMER, [zuordnung(LAGER, 'erledigt', 2, 'früh'), zuordnung(LAGER, 'erledigt', 7, 'spät')]).berufsfelder[1]
    expect(lager.erledigt.map((z) => z.arbeitsblatt.titel)).toEqual(['spät', 'früh'])
  })

  it('„als Nächstes“ insgesamt kommt aus der aktiven Station', () => {
    const lernstand = berechneLernstand(TEILNEHMER, [zuordnung(METALL, 'offen', 1, 'metall'), zuordnung(LAGER, 'offen', 5, 'lager')])
    expect(lernstand.alsNaechstes.arbeitsblatt.titel).toBe('lager')
  })

  it('ist in der aktiven Station nichts offen, gilt das nächste offene Blatt entlang des Lernwegs', () => {
    const lernstand = berechneLernstand(TEILNEHMER, [zuordnung(LAGER, 'erledigt', 1), zuordnung(METALL, 'offen', 5, 'metall'), zuordnung(GASTRO, 'offen', 2, 'gastro')])
    expect(lernstand.alsNaechstes.arbeitsblatt.titel).toBe('metall')
  })

  it('ordnet Berufsfelder unabhängig von Groß-/Kleinschreibung zu', () => {
    const lernstand = berechneLernstand(TEILNEHMER, [zuordnung(LAGER.toUpperCase(), 'offen', 2)])
    expect(lernstand.berufsfelder).toHaveLength(3)
    expect(lernstand.berufsfelder[1].anzahl.offen).toBe(1)
  })
})

describe('Schemas', () => {
  it('Zuordnen verlangt eine Arbeitsblatt-ID und nichts sonst', () => {
    expect(CreateSchema.parse({ arbeitsblattId: BLATT_ID })).toEqual({ arbeitsblattId: BLATT_ID })
    expect(CreateSchema.safeParse({ arbeitsblattId: 'kein-blatt' }).success).toBe(false)
    expect(CreateSchema.safeParse({ arbeitsblattId: BLATT_ID, zugeordnetVon: 'jemand' }).success).toBe(false)
  })

  it('Status nur offen oder erledigt', () => {
    expect(PatchSchema.parse({ status: 'erledigt' })).toEqual({ status: 'erledigt' })
    expect(PatchSchema.safeParse({ status: 'fertig' }).success).toBe(false)
    expect(PatchSchema.safeParse({}).success).toBe(false)
    expect(ListQuerySchema.safeParse({ status: 'offen' }).success).toBe(true)
    expect(ListQuerySchema.safeParse({ status: 'alle' }).success).toBe(false)
  })
})

describe('toApi', () => {
  it('liefert die Zuordnung mit den Eckdaten des Blatts', () => {
    const api = toApi({
      id: 'z-1', kennung: 'IW3-4421', arbeitsblatt_id: BLATT_ID, status: 'erledigt',
      zugeordnet_am: '2026-11-03 08:00:00.000', erledigt_am: '2026-11-04 15:30:00.000', zugeordnet_von: null,
      titel: 'Güter entladen', berufsfeld: LAGER, baustein: 1, ausbildungsbaustein: 'Wareneingang', lernziel: 'Güter entladen',
      stufe: 'A', format: 'text', sprache: 'Leichte Sprache', blatt_status: 'freigegeben',
    })
    expect(api).toEqual({
      id: 'z-1', kennung: 'IW3-4421', status: 'erledigt',
      zugeordnetAm: '2026-11-03T08:00:00.000Z', erledigtAm: '2026-11-04T15:30:00.000Z', zugeordnetVon: null,
      arbeitsblatt: {
        id: BLATT_ID, titel: 'Güter entladen', berufsfeld: LAGER, baustein: 1, ausbildungsbaustein: 'Wareneingang',
        lernziel: 'Güter entladen', stufe: 'A', format: 'text', sprache: 'Leichte Sprache', status: 'freigegeben',
      },
    })
  })
})

// Answered before any database access – the same with and without DB_HOST
describe('Routen: Prüfungen vor der Datenbank', () => {
  const app = createApp()

  it('ungültige Kennung oder Zuordnungs-ID -> 404 ohne Datenbank', async () => {
    expect((await request(app).get('/api/teilnehmende/Max-Mustermann/lernstand')).status).toBe(404)
    expect((await request(app).get('/api/teilnehmende/kein%20name/zuordnungen')).body.code).toBe('teilnehmer_unbekannt')
    const response = await request(app).patch('/api/teilnehmende/IW3-4421/zuordnungen/keine-uuid').send({ status: 'erledigt' })
    expect(response.status).toBe(404)
    expect(response.body.code).toBe('zuordnung_unbekannt')
  })

  it('prüft Eingaben vor der Datenbank (400 vor 503)', async () => {
    expect((await request(app).post('/api/teilnehmende/IW3-4421/zuordnungen').send({ arbeitsblattId: 'x' })).status).toBe(400)
    expect((await request(app).post('/api/teilnehmende/IW3-4421/zuordnungen').send({ arbeitsblattId: BLATT_ID, zugeordnetVon: 'x' })).status).toBe(400)
    expect((await request(app).patch(`/api/teilnehmende/IW3-4421/zuordnungen/${BLATT_ID}`).send({ status: 'fertig' })).status).toBe(400)
    expect((await request(app).get('/api/teilnehmende/IW3-4421/zuordnungen?status=alle')).status).toBe(400)
  })
})
