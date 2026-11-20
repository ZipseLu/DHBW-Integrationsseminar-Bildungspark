-- =============================================================================
-- Migration 007 – Einstellungen pro Konto (FE-20)
--
-- Die Oberflaechen-Einstellungen lagen bisher nur im localStorage des Browsers.
-- Damit sie auf mehreren Geraeten fuer dasselbe Konto gleich sind, stehen sie
-- jetzt in einer Tabelle mit einem Datensatz je Benutzerkonto.
--
-- `werte` ist das komplette AppSettings-Objekt des Frontends als JSON. Das
-- Backend kennt die Standardwerte nicht – fehlende Felder ergaenzt das Frontend
-- beim Laden. Beim Loeschen eines Kontos verschwinden dessen Einstellungen
-- mit (ON DELETE CASCADE).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `einstellungen` (
  `benutzer_id`  CHAR(36)    NOT NULL,
  `werte`        JSON        NOT NULL,
  `geaendert_am` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`benutzer_id`),
  CONSTRAINT `fk_einstellungen_benutzer` FOREIGN KEY (`benutzer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
