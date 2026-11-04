-- =============================================================================
-- Migration 003 – Uploaded worksheets (12.11.2026, Trello "Upload von Arbeitsblättern")
--
-- Lecturers upload existing worksheets (PDF, Word, text, image) or paste their text,
-- so the KI can later adapt them to the levels T/A/F/B (FE-05).
--
--   uploads   one uploaded file or pasted text. `datei` holds the original bytes
--             (NULL for pasted text), `text` the readable text: read from Word and
--             text files on upload, pasted directly, or corrected by hand later.
--             `text_quelle` says where the text came from; NULL = no text yet
--             (PDF and images are stored, their text has to be added by hand).
--
-- Kept separate from `arbeitsblaetter`: an upload is source material, not a
-- worksheet in one level/format with a version history.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `uploads` (
  `id`              CHAR(36)                                       NOT NULL,
  `dateiname`       VARCHAR(255)                                   NOT NULL,
  `dateityp`        ENUM('pdf','docx','doc','txt','md','png','jpg') NOT NULL,
  `groesse`         INT UNSIGNED                                   NOT NULL DEFAULT 0,
  `datei`           LONGBLOB                                       NULL,
  `text`            MEDIUMTEXT                                     NULL,
  `text_quelle`     ENUM('datei','eingefuegt','bearbeitet')        NULL,
  `berufsfeld`      VARCHAR(120)                                   NULL,
  `thema`           VARCHAR(300)                                   NULL,
  `hochgeladen_von` VARCHAR(120)                                   NULL,
  `hochgeladen_am`  DATETIME(3)                                    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `geaendert_am`    DATETIME(3)                                    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_upload_hochgeladen` (`hochgeladen_am`),
  KEY `idx_upload_berufsfeld` (`berufsfeld`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
