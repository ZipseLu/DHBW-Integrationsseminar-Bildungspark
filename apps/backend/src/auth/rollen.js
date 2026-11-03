/**
 * Role check for routes (prepared in BE-03, enforced once BE-01/BE-06 are done).
 *
 * Contract with BE-01: the login middleware verifies the token and sets
 *   req.benutzer = { id, rolle }   (rolle: 'admin' | 'dozent' | 'assistent')
 *
 * As long as there is no login, `req.benutzer` is missing – the check then lets
 * the request through, exactly like every other route of the prototype.
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
