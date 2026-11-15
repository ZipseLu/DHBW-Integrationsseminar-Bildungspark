/**
 * Who made a change (BE-05): the person in the history of a worksheet.
 *
 * With a valid login (req.benutzer, set by src/auth/anmeldung.js) the name comes
 * from the token – an `autor` or `erstelltVon` sent in the body is ignored, so nobody
 * can write a change in someone else's name.
 *
 * Without a token the name from the body is used, like before BE-01. This is the
 * same transition rule as in src/auth/rollen.js: as soon as BE-06 requires a login
 * for every request, the name always comes from the token.
 *
 * @param {import('express').Request} req
 * @param {string | undefined} ausBody name sent by the client (only used without a login)
 * @returns {string | undefined}
 */
export function bearbeiter(req, ausBody) {
  return req.benutzer?.name ?? ausBody
}
