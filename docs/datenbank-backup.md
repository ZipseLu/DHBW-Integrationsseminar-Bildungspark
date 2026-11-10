# OPS-04: Datenbank-Backup und Wiederherstellung

Trello: OPS-04 · Priorität: SOLL

## Überblick

Der Compose-Dienst `db-backup` sichert die MySQL-Datenbank täglich per `mysqldump`.

| Eigenschaft | Wert |
| --- | --- |
| Zeitpunkt | täglich um `BACKUP_HOUR` Uhr (Standard 2, Zeitzone Europe/Berlin) |
| Inhalt | Datenbank `MYSQL_DATABASE` inkl. Routinen, Trigger, Events (konsistent via `--single-transaction`) |
| Ablage | Host-Ordner `./backups/`, Dateien `<datenbank>_<Datum>_<Uhrzeit>.sql.gz` |
| Aufbewahrung | `BACKUP_RETENTION_DAYS` Tage (Standard 14), ältere Dumps werden gelöscht |
| Skripte | `docker/backup/` (`backup-loop.sh`, `backup.sh`, `restore.sh`) |

`backups/` steht in der `.gitignore`, denn die Dumps enthalten Echtdaten.

## Konfiguration (`.env`)

```
BACKUP_HOUR=2
BACKUP_RETENTION_DAYS=14
BACKUP_ON_START=false   # true: zusätzlich ein Backup direkt beim Start des Dienstes
```

## Starten

```
docker compose up -d db db-backup
docker compose logs db-backup     # zeigt u. a. "naechstes Backup: ..."
```

Der Dienst startet erst, wenn die Datenbank healthy ist, und läuft mit `restart: unless-stopped` weiter.

## Backup manuell auslösen

```
docker compose exec db-backup sh /scripts/backup.sh
```

## Wiederherstellen

Achtung: Das Einspielen überschreibt vorhandene Tabellen der Datenbank.

1. Backend stoppen, damit während der Wiederherstellung niemand schreibt:
   `docker compose stop backend`
2. Vorhandene Backups auflisten:
   `docker compose exec db-backup sh /scripts/restore.sh`
3. Gewünschten Dump einspielen (fragt vorher nach Bestätigung mit `ja`):
   `docker compose exec db-backup sh /scripts/restore.sh bildungspark_2026-11-09_02-00-00.sql.gz`
4. Backend wieder starten:
   `docker compose start backend`
5. Prüfen: `http://localhost:3000/api/health` und stichprobenartig Daten in der Anwendung.

Ist das Volumen `mysql_data` komplett verloren, zuerst `docker compose up -d db` (legt die leere DB an) und dann ab Schritt 3 vorgehen.

## Testprotokoll Wiederherstellung (Abnahmekriterium 2)

Der Wiederherstellungstest ist **noch nicht durchgeführt** und muss einmal auf dem Staging-Server erfolgen:

| Schritt | Ergebnis |
| --- | --- |
| Testdaten anlegen (z. B. ein Arbeitsblatt) | offen |
| `backup.sh` ausführen, Dump vorhanden | offen |
| Testdaten löschen oder ändern | offen |
| `restore.sh` mit dem Dump ausführen | offen |
| Testdaten wieder vorhanden | offen |

Datum, Durchführende Person und Ergebnis hier eintragen.

## Hinweise

- Der Dump liegt auf demselben Rechner wie die Datenbank. Gegen Ausfall des Servers hilft das nicht; ab und zu sollte `./backups/` an einen anderen Ort kopiert werden.
- Die Skripte werden unter Linux im Container ausgeführt. `.gitattributes` erzwingt dafür LF-Zeilenenden.
