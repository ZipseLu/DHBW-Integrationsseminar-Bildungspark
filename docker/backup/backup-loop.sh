#!/bin/sh
# Fuehrt backup.sh taeglich um BACKUP_HOUR (Containerzeit, TZ=Europe/Berlin) aus.
# Optional: BACKUP_ON_START=true erstellt zusaetzlich sofort beim Start ein Backup.
set -u

HOUR="${BACKUP_HOUR:-2}"

[ "${BACKUP_ON_START:-false}" = "true" ] && { sh /scripts/backup.sh || true; }

while true; do
  now="$(date +%s)"
  next="$(date -d "today ${HOUR}:00" +%s)"
  [ "$next" -le "$now" ] && next="$(date -d "tomorrow ${HOUR}:00" +%s)"
  echo "[backup] naechstes Backup: $(date -d "@$next" '+%Y-%m-%d %H:%M')"
  sleep $((next - now))
  sh /scripts/backup.sh || true
done
