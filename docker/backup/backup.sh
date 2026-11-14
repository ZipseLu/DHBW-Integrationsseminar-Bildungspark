#!/bin/sh
# Erstellt einen komprimierten Dump der Datenbank und loescht alte Dumps.
# Aufruf: sh backup.sh   (wird vom Dienst `db-backup` taeglich gestartet)
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
TARGET="$BACKUP_DIR/${MYSQL_DATABASE}_${STAMP}.sql.gz"
TMP="$TARGET.part"

mkdir -p "$BACKUP_DIR"

# --single-transaction: konsistenter Stand ohne Sperren (InnoDB)
# Schreiben in .part, damit ein abgebrochener Dump nie wie ein gueltiges Backup aussieht
if mysqldump -h "$DB_HOST" -u root -p"$MYSQL_ROOT_PASSWORD" \
    --single-transaction --routines --triggers --events \
    --databases "$MYSQL_DATABASE" | gzip > "$TMP"; then
  mv "$TMP" "$TARGET"
  echo "[backup] OK: $TARGET ($(du -h "$TARGET" | cut -f1))"
else
  rm -f "$TMP"
  echo "[backup] FEHLER: Dump von $MYSQL_DATABASE fehlgeschlagen" >&2
  exit 1
fi

# Aufbewahrung: aeltere Dumps entfernen
find "$BACKUP_DIR" -name "${MYSQL_DATABASE}_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete \
  | sed 's/^/[backup] geloescht: /'
