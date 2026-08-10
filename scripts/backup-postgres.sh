#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/iocl-gate}"
DAILY_RETENTION_DAYS="${DAILY_RETENTION_DAYS:-${RETENTION_DAYS:-30}}"
WEEKLY_RETENTION_DAYS="${WEEKLY_RETENTION_DAYS:-365}"
MONTHLY_RETENTION_DAYS="${MONTHLY_RETENTION_DAYS:-2555}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
UTC_DAY_OF_WEEK="$(date -u +%u)"
UTC_DAY_OF_MONTH="$(date -u +%d)"
HOSTNAME_SAFE="$(hostname | tr -cd '[:alnum:]._-')"
DAILY_DIR="${BACKUP_DIR}/daily"
WEEKLY_DIR="${BACKUP_DIR}/weekly"
MONTHLY_DIR="${BACKUP_DIR}/monthly"
FILE="${DAILY_DIR}/iocl-gate-${HOSTNAME_SAFE}-${TIMESTAMP}.dump"

for value_name in DAILY_RETENTION_DAYS WEEKLY_RETENTION_DAYS MONTHLY_RETENTION_DAYS; do
  value="${!value_name}"
  [[ "$value" =~ ^[0-9]+$ ]] || { echo "$value_name must be a non-negative integer" >&2; exit 2; }
done

umask 077
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"
pg_dump --dbname="$DATABASE_URL" --format=custom --compress=9 --no-owner --no-acl --file="$FILE"
(
  cd "$DAILY_DIR"
  sha256sum "$(basename "$FILE")" > "$(basename "$FILE").sha256"
)
pg_restore --list "$FILE" >/dev/null

# Sunday UTC snapshot. The copy preserves the immutable daily dump and checksum.
if [[ "$UTC_DAY_OF_WEEK" == "7" ]]; then
  cp --preserve=timestamps "$FILE" "$WEEKLY_DIR/"
  cp --preserve=timestamps "${FILE}.sha256" "$WEEKLY_DIR/"
fi

# First day of each UTC month snapshot.
if [[ "$UTC_DAY_OF_MONTH" == "01" ]]; then
  cp --preserve=timestamps "$FILE" "$MONTHLY_DIR/"
  cp --preserve=timestamps "${FILE}.sha256" "$MONTHLY_DIR/"
fi

find "$DAILY_DIR" -type f \( -name '*.dump' -o -name '*.sha256' \) -mtime "+$DAILY_RETENTION_DAYS" -delete
find "$WEEKLY_DIR" -type f \( -name '*.dump' -o -name '*.sha256' \) -mtime "+$WEEKLY_RETENTION_DAYS" -delete
find "$MONTHLY_DIR" -type f \( -name '*.dump' -o -name '*.sha256' \) -mtime "+$MONTHLY_RETENTION_DAYS" -delete

printf 'Backup completed: %s\n' "$FILE"
printf 'Retention: daily=%sd weekly=%sd monthly=%sd\n' "$DAILY_RETENTION_DAYS" "$WEEKLY_RETENTION_DAYS" "$MONTHLY_RETENTION_DAYS"
