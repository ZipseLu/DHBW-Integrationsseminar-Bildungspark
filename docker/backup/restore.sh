#!/bin/sh
# Spielt einen Dump in die Datenbank ein. ACHTUNG: ueberschreibt vorhandene Tabellen.
# Aufruf im Container:  sh /scripts/restore.sh <dateiname.sql.gz> [--yes]
# Ohne Dateiname werden die vorhandenen Backups aufgelistet.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"

if [ $# -lt 1 ]; then
  echo "Vorhandene Backups in $BACKUP_DIR:"
  ls -1t "$BACKUP_DIR" | grep '\.sql\.gz$' || echo "(keine)"
  echo "Aufruf: sh /scripts/restore.sh <dateiname.sql.gz> [--yes]"
  exit 0
fi

FILE="$BACKUP_DIR/$(basename "$1")"
[ -f "$FILE" ] || { echo "Datei nicht gefunden: $FILE" >&2; exit 1; }

if [ "${2:-}" != "--yes" ]; then
  printf 'Datenbank "%s" auf Stand von %s zuruecksetzen? [ja/N] ' "$MYSQL_DATABASE" "$(basename "$FILE")"
  read -r answer
  [ "$answer" = "ja" ] || { echo "Abgebrochen."; exit 1; }
fi

gunzip -c "$FILE" | mysql -h "$DB_HOST" -u root -p"$MYSQL_ROOT_PASSWORD"
echo "[restore] OK: $(basename "$FILE") eingespielt"
