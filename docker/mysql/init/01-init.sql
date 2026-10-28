-- =============================================================================
-- Bildungspark – MySQL Init-Skript
--
-- Wird NUR beim allerersten Containerstart ausgefuehrt (leeres Volumen) und
-- legt ausschliesslich Datenbanken und Rechte an.
--
-- Tabellen entstehen NICHT hier, sondern ueber Migrationen:
--   apps/backend/db/migrations/*.sql – ausgefuehrt von `npm run db:migrate`
--   oder automatisch beim Backend-Start (src/db/migrate.js).
-- So bekommen Docker-Volumes, CI und eine lokale MySQL dasselbe Schema, und
-- spaetere Aenderungen brauchen kein `docker compose down -v`.
--
-- Ausfuehrungsreihenfolge = alphabetisch nach Dateiname.
-- =============================================================================

-- Primaerdatenbank (wird normalerweise schon via MYSQL_DATABASE angelegt,
-- dieses CREATE IF NOT EXISTS macht es idempotent).
CREATE DATABASE IF NOT EXISTS `bildungspark`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Testdatenbank: strikt getrennt, damit Tests nie Produktivdaten treffen.
CREATE DATABASE IF NOT EXISTS `bildungspark_test`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Anwendungssuser: wird bereits vom MySQL-Entrypoint aus den Variablen
-- MYSQL_USER / MYSQL_PASSWORD angelegt (inkl. Rechten auf MYSQL_DATABASE).
-- Deshalb hier KEIN CREATE USER mit festem Passwort – sonst laeuft ein
-- geaendertes MYSQL_PASSWORD in .env hier auseinander.
--
-- Was der Entrypoint NICHT macht: Rechte auf die Testdatenbank.
GRANT ALL PRIVILEGES ON `bildungspark`.*      TO 'bildungspark'@'%';
GRANT ALL PRIVILEGES ON `bildungspark_test`.* TO 'bildungspark'@'%';

FLUSH PRIVILEGES;
