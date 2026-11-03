/**
 * Rollenprüfung für Routen (vorbereitet in BE-03, scharf geschaltet mit BE-01/BE-06).
 *
 * Vertrag mit BE-01: Die Anmelde-Middleware prüft das Token und setzt
 *   req.benutzer = { id, rolle }   (rolle: 'admin' | 'dozent' | 'assistent')
 *
 * Solange es keine Anmeldung gibt, fehlt `req.benutzer` – dann lässt die
 * Prüfung die Anfrage durch, genau wie alle anderen Routen des Prototyps.
 * BE-06 („Schreibende Endpunkte absichern“) verlangt dann für jede Anfrage
 * eine Anmeldung; ab da greift `erfordereRolle` immer.
 */
export function erfordereRolle(...rollen) {
  return (req, res, next) => {
    if (!req.benutzer) return next()
    if (!rollen.includes(req.benutzer.rolle)) {
      return res.status(403).json({ error: 'forbidden', message: `Nur für die Rolle ${rollen.join(' oder ')} erlaubt` })
    }
    next()
  }
}
