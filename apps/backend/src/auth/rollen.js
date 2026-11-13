/**
 * Role check for routes (prepared in BE-03, mandatory since BE-06).
 *
 * The login middleware (src/auth/anmeldung.js, BE-01) verifies the token and sets
 *   req.benutzer = { id, rolle, name }   (rolle: 'admin' | 'dozent' | 'assistent')
 *
 * Since BE-06 every API route except /api/health and /api/auth/login requires a
 * login (app.js), so `req.benutzer` is always set here. Should a route ever be
 * mounted without the login check, the role check answers 401 instead of letting
 * the request through.
 */
export function erfordereRolle(...rollen) {
  return (req, res, next) => {
    if (!req.benutzer) {
      res.set('WWW-Authenticate', 'Bearer')
      return res.status(401).json({ error: 'unauthorized', code: 'anmeldung_erforderlich', message: 'Bitte zuerst anmelden' })
    }
    if (!rollen.includes(req.benutzer.rolle)) {
      return res.status(403).json({ error: 'forbidden', message: `Nur für die Rolle ${rollen.join(' oder ')} erlaubt` })
    }
    next()
  }
}

/** Roles that may release, archive and delete content (worksheets, participant profiles) */
export const VERANTWORTLICHE_ROLLEN = ['admin', 'dozent']
