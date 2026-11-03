/**
 * Role check for routes (prepared in BE-03, active since BE-01).
 *
 * The login middleware (src/auth/anmeldung.js, BE-01) verifies the token and sets
 *   req.benutzer = { id, rolle, name }   (rolle: 'admin' | 'dozent' | 'assistent')
 *
 * A request without a token has no `req.benutzer` – the check then lets it
 * through, exactly like every other route of the prototype.
 * BE-06 ("secure write endpoints") will require a login for every request;
 * from then on `erfordereRolle` always applies.
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
