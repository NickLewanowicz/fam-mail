#!/usr/bin/env bash
# SQLite-safe backup for Fam Mail.
# Uses `VACUUM INTO` so the backup is consistent even while the app is running.
#
# Usage: ./scripts/backup.sh [/path/to/fammail.db] [output-dir]
# Defaults: DATABASE_PATH from .env, ./backups
set -euo pipefail

DB_PATH="${1:-/data/fammail.db}"
OUT_DIR="${2:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${OUT_DIR}/fammail-${STAMP}.db"

command -v sqlite3 >/dev/null || { echo "sqlite3 is required"; exit 1; }
[ -f "$DB_PATH" ] || { echo "Database not found: $DB_PATH"; exit 1; }
mkdir -p "$OUT_DIR"

sqlite3 "$DB_PATH" ".timeout 5000" "VACUUM INTO '$OUT_FILE'"
echo "Backup written: $OUT_FILE"

# Keep the 14 most recent backups
ls -1t "${OUT_DIR}"/fammail-*.db 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Old backups pruned (kept 14)"
