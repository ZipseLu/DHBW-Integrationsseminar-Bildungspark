-- =============================================================================
-- Migration 001 – Arbeitsblätter speichern (28.10.2026, AP4 Backend)
--
-- Ausgeführt von `npm run db:migrate` bzw. automatisch beim Backend-Start
-- (src/db/migrate.js). Jede Datei läuft genau einmal (Tabelle schema_migrations).
--
-- Fachliches Modell (siehe docs/persistenz-arbeitsblaetter.md):
--   arbeitsblaetter          ein gespeichertes Arbeitsblatt = ein Lernziel in genau
--                            EINER Stufe (T/A/F/B), einem Format und einer Sprache.
--                            Varianten desselben Lernziels verweisen über eltern_id
--                            auf das zuerst gespeicherte Blatt.
--   arbeitsblatt_versionen   unveränderlicher Verlauf: jede Änderung des Inhalts oder
--                            des Status schreibt eine neue Version mit dem kompletten
--                            Arbeitsblatt als JSON (Schema: src/arbeitsblatt/schema.js).
--   users                    unverändert aus dem Init-Skript vom 16.10.2026 übernommen
--                            (Anmeldung ist noch nicht umgesetzt).
-- =============================================================================

-- Beispieltabellen aus docker/mysql/init/01-init.sql (16.10.2026). Sie wurden nie
-- beschrieben – kein Code hat je in sie geschrieben – und passen nicht zum
-- Arbeitsblatt-Modell des Prototyps (ein Blatt je Stufe statt vier Zeilen je Blatt).
DROP TABLE IF EXISTS `level_contents`;
DROP TABLE IF EXISTS `history_entries`;
DROP TABLE IF EXISTS `stored_documents`;
DROP TABLE IF EXISTS `worksheets`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`            CHAR(36)     NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('admin','dozent','assistent') NOT NULL DEFAULT 'assistent',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `arbeitsblaetter` (
  `id`                  CHAR(36)         NOT NULL,
  `titel`               VARCHAR(120)     NOT NULL,
  `berufsfeld`          VARCHAR(120)     NOT NULL,
  `baustein`            TINYINT UNSIGNED NULL,
  `ausbildungsbaustein` VARCHAR(200)     NULL,
  `lernziel`            VARCHAR(500)     NOT NULL,
  `stufe`               ENUM('T','A','F','B') NOT NULL,
  `format`              ENUM('text','piktogramm','mathefrei','piktogramm-mathefrei') NOT NULL,
  `sprache`             ENUM('Leichte Sprache','Standardsprache') NOT NULL,
  `status`              ENUM('entwurf','freigegeben','archiviert') NOT NULL DEFAULT 'entwurf',
  `ki_generiert`        TINYINT(1)       NOT NULL DEFAULT 0,
  `favorit`             TINYINT(1)       NOT NULL DEFAULT 0,
  `eltern_id`           CHAR(36)         NULL,
  `version`             INT UNSIGNED     NOT NULL DEFAULT 1,
  `erstellt_von`        VARCHAR(120)     NULL,
  `erstellt_am`         DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `geaendert_am`        DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_ab_berufsfeld_baustein` (`berufsfeld`, `baustein`),
  KEY `idx_ab_stufe_format` (`stufe`, `format`),
  KEY `idx_ab_status` (`status`),
  KEY `idx_ab_geaendert` (`geaendert_am`),
  KEY `idx_ab_eltern` (`eltern_id`),
  CONSTRAINT `fk_ab_eltern` FOREIGN KEY (`eltern_id`) REFERENCES `arbeitsblaetter` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `arbeitsblatt_versionen` (
  `id`              CHAR(36)     NOT NULL,
  `arbeitsblatt_id` CHAR(36)     NOT NULL,
  `version`         INT UNSIGNED NOT NULL,
  `aktion`          ENUM('erstellt','bearbeitet','KI-angepasst','freigegeben','archiviert') NOT NULL,
  `inhalt`          JSON         NOT NULL,
  `ki_meta`         JSON         NULL,
  `autor`           VARCHAR(120) NULL,
  `notiz`           VARCHAR(500) NULL,
  `erstellt_am`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_abv_version` (`arbeitsblatt_id`, `version`),
  CONSTRAINT `fk_abv_arbeitsblatt` FOREIGN KEY (`arbeitsblatt_id`) REFERENCES `arbeitsblaetter` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
