-- =============================================================================
-- Migration 005 – Lehrpläne in der Datenbank (03.11.2026, Karte „Weitere Tabellen in DB erstellen“)
--
-- Bisher lagen die Lehrpläne nur in apps/backend/data/lehrplaene.json (gitignored,
-- erzeugt aus den DOCX des Bildungsparks). Jetzt in drei Tabellen:
--
--   lehrplaene         ein Lehrplan-Dokument (eine DOCX-Datei): Berufsfeld, Baustein,
--                      Ausbildungsbaustein, Teilqualifizierung (tq), Dateiname (quelle)
--   lernziele          die Lernziele eines Dokuments. `id` ist die laufende Nummer aus
--                      dem Import – bleibt gleich, solange die Quelldateien gleich bleiben
--   lernziel_niveaus   je Lernziel die vier Stufen T/A/F/B mit Kompetenz und Beispiel
--
-- Befüllt von `npm run import:lehrplaene` (aus den DOCX) und `npm run db:seed` (aus der
-- JSON-Datei). Ein neuer Import ersetzt den kompletten Bestand (ON DELETE CASCADE) –
-- bisher verweist keine andere Tabelle per Fremdschlüssel auf Lernziele.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `lehrplaene` (
  `id`                  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `berufsfeld`          VARCHAR(120)     NOT NULL,
  `baustein`            TINYINT UNSIGNED NULL,
  `ausbildungsbaustein` VARCHAR(200)     NULL,
  `tq`                  VARCHAR(255)     NULL,
  `quelle`              VARCHAR(255)     NOT NULL,
  `importiert_am`       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lehrplan_quelle` (`quelle`),
  KEY `idx_lehrplan_berufsfeld_baustein` (`berufsfeld`, `baustein`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lernziele` (
  `id`          INT UNSIGNED     NOT NULL,
  `lehrplan_id` INT UNSIGNED     NOT NULL,
  `abschnitt`   TINYINT UNSIGNED NULL,
  `titel`       VARCHAR(500)     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lernziel_lehrplan` (`lehrplan_id`),
  CONSTRAINT `fk_lernziel_lehrplan` FOREIGN KEY (`lehrplan_id`) REFERENCES `lehrplaene` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lernziel_niveaus` (
  `lernziel_id` INT UNSIGNED          NOT NULL,
  `stufe`       ENUM('T','A','F','B') NOT NULL,
  `kompetenz`   VARCHAR(1000)         NOT NULL DEFAULT '',
  `beispiel`    VARCHAR(1000)         NOT NULL DEFAULT '',
  PRIMARY KEY (`lernziel_id`, `stufe`),
  CONSTRAINT `fk_niveau_lernziel` FOREIGN KEY (`lernziel_id`) REFERENCES `lernziele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
