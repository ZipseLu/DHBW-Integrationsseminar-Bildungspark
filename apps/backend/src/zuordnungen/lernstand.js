/**
 * Learning status of a participant, computed from their assignments (BE-04).
 *
 * Pure function without database access, so the rules can be tested on their own:
 *
 *   - Per Berufsfeld: done / open / total and progress = done / total in percent.
 *   - Order of the Berufsfelder = order of the Lernweg (stations, BE-02); fields that
 *     have assignments but no station come last, alphabetically.
 *   - "Next" in a Berufsfeld = the open assignment that has been waiting longest
 *     (oldest `zugeordnetAm` first) – the teacher decides the order by assigning.
 *   - "Next" overall = next sheet of the active station; if that one has nothing open,
 *     the next open sheet in the following stations of the Lernweg, then in the earlier
 *     ones (left-overs), then in fields without a station. Without an active station:
 *     along the Lernweg from the start.
 *   - Archived sheets stay assigned and visible (arbeitsblatt.status = 'archiviert'),
 *     but are never proposed as "next" – neither per Berufsfeld nor overall. The
 *     frontend (FE-11) can therefore gray them out in the open list.
 *
 * The station fields `fortschritt` and `blaetterErledigt` (BE-02) stay as entered in
 * the profile dialog; this computation does not change them.
 */

const schluessel = (berufsfeld) => berufsfeld.trim().toLowerCase()

/** Oldest assignment first; the id makes the order stable within the same millisecond */
const nachZuordnung = (a, b) => a.zugeordnetAm.localeCompare(b.zugeordnetAm) || a.id.localeCompare(b.id)

/** Most recently completed first */
const nachErledigt = (a, b) => (b.erledigtAm ?? '').localeCompare(a.erledigtAm ?? '') || a.id.localeCompare(b.id)

const anzahlVon = (offen, erledigt) => ({ erledigt: erledigt.length, offen: offen.length, gesamt: offen.length + erledigt.length })

/** Archived sheets stay in the lists (and counts), but are not suggested as "next" */
const istArchiviert = (zuordnung) => zuordnung.arbeitsblatt.status === 'archiviert'

/**
 * @param {{kennung: string, stationen: {berufsfeld: string, status: string, stufe: string, format: string}[]}} teilnehmer  from the teilnehmende repository
 * @param {object[]} zuordnungen  of this participant, as returned by the zuordnungen repository
 */
export function berechneLernstand(teilnehmer, zuordnungen) {
  const felder = new Map()
  teilnehmer.stationen.forEach((station, position) => {
    felder.set(schluessel(station.berufsfeld), {
      berufsfeld: station.berufsfeld,
      station: { position, status: station.status, stufe: station.stufe, format: station.format },
      liste: [],
    })
  })

  const ohneStation = []
  for (const zuordnung of zuordnungen) {
    const key = schluessel(zuordnung.arbeitsblatt.berufsfeld)
    if (!felder.has(key)) {
      felder.set(key, { berufsfeld: zuordnung.arbeitsblatt.berufsfeld, station: null, liste: [] })
      ohneStation.push(key)
    }
    felder.get(key).liste.push(zuordnung)
  }

  const reihenfolge = [
    ...teilnehmer.stationen.map((station) => schluessel(station.berufsfeld)),
    ...ohneStation.sort((a, b) => felder.get(a).berufsfeld.localeCompare(felder.get(b).berufsfeld, 'de')),
  ]

  const berufsfelder = reihenfolge.map((key) => {
    const { berufsfeld, station, liste } = felder.get(key)
    const offen = liste.filter((z) => z.status === 'offen').sort(nachZuordnung)
    const erledigt = liste.filter((z) => z.status === 'erledigt').sort(nachErledigt)
    const anzahl = anzahlVon(offen, erledigt)
    return {
      berufsfeld,
      station,
      fortschritt: anzahl.gesamt === 0 ? 0 : Math.round((anzahl.erledigt / anzahl.gesamt) * 100),
      anzahl,
      alsNaechstes: offen.find((zuordnung) => !istArchiviert(zuordnung)) ?? null,
      offen,
      erledigt,
    }
  })

  // Search order for "next": from the active station forward, then the stations before it
  const stationen = berufsfelder.filter((feld) => feld.station)
  const ohneStationFelder = berufsfelder.filter((feld) => !feld.station)
  const aktivIndex = stationen.findIndex((feld) => feld.station.status === 'aktiv')
  const suchreihenfolge =
    aktivIndex < 0
      ? [...stationen, ...ohneStationFelder]
      : [...stationen.slice(aktivIndex), ...stationen.slice(0, aktivIndex), ...ohneStationFelder]
  const alsNaechstes = suchreihenfolge.find((feld) => feld.alsNaechstes)?.alsNaechstes ?? null

  return {
    kennung: teilnehmer.kennung,
    anzahl: anzahlVon(
      berufsfelder.flatMap((feld) => feld.offen),
      berufsfelder.flatMap((feld) => feld.erledigt),
    ),
    alsNaechstes,
    berufsfelder,
  }
}
