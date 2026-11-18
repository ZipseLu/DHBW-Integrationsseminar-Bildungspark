-- BE-05: "Zuletzt geändert von" direkt am Blatt, zusätzlich zum Verlauf in
-- arbeitsblatt_versionen. Bei Anmeldung kommt der Name aus dem Token, sonst aus
-- dem Body. Bestehende Zeilen bleiben zunächst NULL, bis sie erneut geändert werden.
ALTER TABLE `arbeitsblaetter` ADD COLUMN `geaendert_von` VARCHAR(120) NULL AFTER `erstellt_von`;
