-- =============================================================================
-- Migration 002 – Teilnehmende und ihr Lernweg (30.10.2026, BE-02)
--
-- Fachliches Modell (siehe docs/persistenz-teilnehmende.md):
--   teilnehmende             anonymisiertes Profil, Schlüssel = pseudonyme Kennung
--                            (IW3-Nummer, z. B. "IW3-4421"). § 60 SGB IX: KEINE Namen,
--                            KEINE Diagnosen, KEINE Freitextfelder.
--   teilnehmende_stationen   Lernweg: die Berufsfelder in ihrer Reihenfolge, je mit
--                            eigener Niveaustufe und eigenem Barrierefreiheits-Format
--                            (Teilnehmende können in verschiedenen Bereichen
--                            unterschiedliche Stufen haben – Hinweis aus dem Kundentermin).
--
-- Der Gesamtfortschritt wird nicht gespeichert, sondern aus der aktiven Station
-- berechnet (src/teilnehmende/repository.js).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `teilnehmende` (
  `kennung`      VARCHAR(20)           NOT NULL,
  `stufe`        ENUM('T','A','F','B') NOT NULL,
  `erstellt_am`  DATETIME(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `geaendert_am` DATETIME(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kennung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `teilnehmende_stationen` (
  `kennung`           VARCHAR(20)                                   NOT NULL,
  `position`          TINYINT UNSIGNED                              NOT NULL,
  `berufsfeld`        VARCHAR(120)                                  NOT NULL,
  `stufe`             ENUM('T','A','F','B')                         NOT NULL,
  `format`            ENUM('text','piktogramm','mathefrei','piktogramm-mathefrei') NOT NULL,
  `status`            ENUM('abgeschlossen','aktiv','ausstehend')    NOT NULL DEFAULT 'ausstehend',
  `fortschritt`       TINYINT UNSIGNED                              NOT NULL DEFAULT 0,
  `start_datum`       DATE                                          NULL,
  `end_datum`         DATE                                          NULL,
  `blaetter_erledigt` SMALLINT UNSIGNED                             NOT NULL DEFAULT 0,
  PRIMARY KEY (`kennung`, `position`),
  UNIQUE KEY `uq_station_berufsfeld` (`kennung`, `berufsfeld`),
  CONSTRAINT `fk_station_teilnehmende` FOREIGN KEY (`kennung`) REFERENCES `teilnehmende` (`kennung`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
