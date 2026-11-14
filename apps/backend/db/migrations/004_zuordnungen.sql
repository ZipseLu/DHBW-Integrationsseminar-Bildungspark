-- =============================================================================
-- Migration 004 – Zuordnung Arbeitsblatt ↔ Teilnehmende (03.11.2026, BE-04)
--
-- Dozierende ordnen Teilnehmenden gespeicherte Arbeitsblätter zu und haken sie
-- ab, wenn sie bearbeitet sind. Daraus berechnet das Backend den Lernstand je
-- Berufsfeld und das Blatt, das als Nächstes dran ist (src/zuordnungen/lernstand.js).
--
--   zuordnungen   je Teilnehmende/r und Arbeitsblatt höchstens eine Zeile, Status
--                 offen/erledigt mit Zeitpunkten. Das Berufsfeld kommt aus dem
--                 Arbeitsblatt (keine Kopie, die auseinanderlaufen könnte).
--                 `zugeordnet_von` = Name aus der Anmeldung (BE-01), sonst NULL.
--
-- Löschen eines Profils oder endgültiges Löschen eines Arbeitsblatts entfernt die
-- Zuordnungen mit (ON DELETE CASCADE, BE-08: keine verwaisten Daten zu Personen).
-- Archivieren eines Blatts lässt bestehende Zuordnungen stehen.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `zuordnungen` (
  `id`              CHAR(36)                 NOT NULL,
  `kennung`         VARCHAR(20)              NOT NULL,
  `arbeitsblatt_id` CHAR(36)                 NOT NULL,
  `status`          ENUM('offen','erledigt') NOT NULL DEFAULT 'offen',
  `zugeordnet_am`   DATETIME(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `erledigt_am`     DATETIME(3)              NULL,
  `zugeordnet_von`  VARCHAR(120)             NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_zuordnung` (`kennung`, `arbeitsblatt_id`),
  KEY `idx_zuordnung_blatt` (`arbeitsblatt_id`),
  CONSTRAINT `fk_zuordnung_teilnehmende` FOREIGN KEY (`kennung`) REFERENCES `teilnehmende` (`kennung`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_zuordnung_arbeitsblatt` FOREIGN KEY (`arbeitsblatt_id`) REFERENCES `arbeitsblaetter` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
