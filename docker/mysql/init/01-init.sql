-- =============================================================================
-- Bildungspark – MySQL Init-Skript
--
-- Wird NUR beim allerersten Containerstart ausgefuehrt (leeres Volumen).
-- Spaetere Aenderungen gehoeren in Migrationen, nicht hierher.
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

-- ---------------------------------------------------------------
-- Basis-Tabellen fuer das Arbeitsblatt-Modell
-- (Beispiel-Schema – bei Bedarf anpassen/erweitern)
-- ---------------------------------------------------------------

USE `bildungspark`;

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

CREATE TABLE IF NOT EXISTS `worksheets` (
  `id`                   CHAR(36)     NOT NULL,
  `title`                VARCHAR(255) NOT NULL,
  `berufsbild`           VARCHAR(120) NOT NULL,
  `baustein`             INT          NOT NULL DEFAULT 1,
  `ausbildungsbaustein`  VARCHAR(255) NOT NULL,
  `format`               ENUM('text','piktogramm','mathefrei','piktogramm-mathefrei') NOT NULL DEFAULT 'text',
  `sprache`              ENUM('leicht','standard') NOT NULL DEFAULT 'standard',
  `abschnitt_titel`      TEXT         NOT NULL,
  `status`               ENUM('entwurf','freigegeben','archiviert') NOT NULL DEFAULT 'entwurf',
  `ai_generated`         TINYINT(1)   NOT NULL DEFAULT 0,
  `version`              INT          NOT NULL DEFAULT 1,
  `created_by_id`        CHAR(36)     NULL,
  `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ws_beruf_baustein` (`berufsbild`, `baustein`),
  KEY `idx_ws_status` (`status`),
  KEY `idx_ws_updated` (`updated_at`),
  CONSTRAINT `fk_ws_creator` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Binnendifferenzierung: pro Worksheet genau 4 Zeilen (T/A/F/B)
CREATE TABLE IF NOT EXISTS `level_contents` (
  `id`           CHAR(36)     NOT NULL,
  `worksheet_id` CHAR(36)     NOT NULL,
  `level`        ENUM('T','A','F','B') NOT NULL,
  `kompetenz`    TEXT         NOT NULL,
  `beispiel`     TEXT         NOT NULL,
  `piktogramme`  JSON         NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_level_ws` (`worksheet_id`, `level`),
  CONSTRAINT `fk_lc_ws` FOREIGN KEY (`worksheet_id`) REFERENCES `worksheets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revisionssicherer Audit-Trail
CREATE TABLE IF NOT EXISTS `history_entries` (
  `id`           CHAR(36)     NOT NULL,
  `worksheet_id` CHAR(36)     NOT NULL,
  `version`      INT          NOT NULL,
  `action`       ENUM('erstellt','bearbeitet','ki-angepasst','freigegeben','archiviert') NOT NULL,
  `author_id`    CHAR(36)     NULL,
  `note`         VARCHAR(500) NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hist_ws_version` (`worksheet_id`, `version`),
  CONSTRAINT `fk_hist_ws` FOREIGN KEY (`worksheet_id`) REFERENCES `worksheets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hist_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hochgeladene Originaldokumente
CREATE TABLE IF NOT EXISTS `stored_documents` (
  `id`             CHAR(36)     NOT NULL,
  `filename`       VARCHAR(255) NOT NULL,
  `mime_type`      VARCHAR(120) NOT NULL,
  `size_bytes`     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `page_count`     INT          NULL,
  `storage_key`    VARCHAR(500) NOT NULL,
  `berufsbild`     VARCHAR(120) NULL,
  `thema`          VARCHAR(255) NULL,
  `detected_level` ENUM('T','A','F','B') NULL,
  `created_by_id`  CHAR(36)     NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_doc_creator` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- Testdatenbank: identisches Schema, damit Integrationstests
-- gegen eine echte Datenbank laufen koennen.
-- -------------------------------------------------------------------
USE `bildungspark_test`;

CREATE TABLE IF NOT EXISTS `users` LIKE `bildungspark`.`users`;
CREATE TABLE IF NOT EXISTS `worksheets` LIKE `bildungspark`.`worksheets`;
CREATE TABLE IF NOT EXISTS `level_contents` LIKE `bildungspark`.`level_contents`;
CREATE TABLE IF NOT EXISTS `history_entries` LIKE `bildungspark`.`history_entries`;
CREATE TABLE IF NOT EXISTS `stored_documents` LIKE `bildungspark`.`stored_documents`;
