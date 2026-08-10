#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: DATABASE_URL=... $0 /path/to/backup.dump" >&2
  exit 2
fi
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_FILE="$1"
[[ -f "$BACKUP_FILE" ]] || { echo "Backup not found: $BACKUP_FILE" >&2; exit 2; }

if [[ -f "${BACKUP_FILE}.sha256" ]]; then
  (cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "${BACKUP_FILE}.sha256")")
fi
pg_restore --list "$BACKUP_FILE" >/dev/null
printf 'This will replace objects in the target database. Type RESTORE to continue: '
read -r confirmation
[[ "$confirmation" == "RESTORE" ]] || { echo "Restore cancelled"; exit 1; }
pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-acl "$BACKUP_FILE"
echo "Restore completed. Run application smoke tests before reopening the gate."
