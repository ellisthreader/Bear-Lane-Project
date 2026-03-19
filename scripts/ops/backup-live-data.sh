#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_ROOT/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$TARGET_DIR"

log() { printf '[backup] %s\n' "$1"; }
warn() { printf '[backup][warn] %s\n' "$1"; }
err() { printf '[backup][error] %s\n' "$1" >&2; }

backup_uploads() {
  local uploads_dir="$PROJECT_ROOT/storage/app/public"
  if [[ ! -d "$uploads_dir" ]]; then
    warn "Uploads directory not found at storage/app/public; skipping uploads archive."
    return 0
  fi

  log "Archiving runtime uploads from storage/app/public"
  tar -czf "$TARGET_DIR/storage_app_public.tar.gz" -C "$PROJECT_ROOT/storage/app" public
}

backup_sqlite() {
  local sqlite_path="${DB_DATABASE:-$PROJECT_ROOT/database/database.sqlite}"
  if [[ "$sqlite_path" != /* ]]; then
    sqlite_path="$PROJECT_ROOT/$sqlite_path"
  fi

  if [[ ! -f "$sqlite_path" ]]; then
    err "SQLite database file not found at: $sqlite_path"
    return 1
  fi

  log "Copying SQLite database"
  cp "$sqlite_path" "$TARGET_DIR/db.sqlite"
}

backup_mysql_local() {
  command -v mysqldump >/dev/null 2>&1 || return 1

  local host="${DB_HOST:-127.0.0.1}"
  local port="${DB_PORT:-3306}"
  local db="${DB_DATABASE:-}"
  local user="${DB_USERNAME:-root}"
  local pass="${DB_PASSWORD:-}"

  [[ -n "$db" ]] || { err "DB_DATABASE is not set for mysql backup."; return 1; }

  log "Dumping MySQL/MariaDB database via local mysqldump"
  MYSQL_PWD="$pass" mysqldump \
    --host="$host" \
    --port="$port" \
    --user="$user" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "$db" | gzip -c > "$TARGET_DIR/db.sql.gz"
}

backup_mysql_docker() {
  command -v docker >/dev/null 2>&1 || return 1
  docker compose version >/dev/null 2>&1 || return 1
  docker compose ps mysql >/dev/null 2>&1 || return 1

  local db="${DB_DATABASE:-}"
  local user="${DB_USERNAME:-root}"
  local pass="${DB_PASSWORD:-}"

  [[ -n "$db" ]] || { err "DB_DATABASE is not set for mysql backup."; return 1; }

  log "Dumping MySQL/MariaDB database via docker compose service 'mysql'"
  docker compose exec -T mysql mysqldump \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --user="$user" \
    --password="$pass" \
    "$db" | gzip -c > "$TARGET_DIR/db.sql.gz"
}

backup_pgsql_local() {
  command -v pg_dump >/dev/null 2>&1 || return 1

  local host="${DB_HOST:-127.0.0.1}"
  local port="${DB_PORT:-5432}"
  local db="${DB_DATABASE:-}"
  local user="${DB_USERNAME:-postgres}"
  local pass="${DB_PASSWORD:-}"

  [[ -n "$db" ]] || { err "DB_DATABASE is not set for pgsql backup."; return 1; }

  log "Dumping PostgreSQL database"
  PGPASSWORD="$pass" pg_dump \
    --host="$host" \
    --port="$port" \
    --username="$user" \
    --format=plain \
    --no-owner \
    --no-privileges \
    "$db" | gzip -c > "$TARGET_DIR/db.sql.gz"
}

backup_database() {
  local conn="${DB_CONNECTION:-mysql}"

  case "$conn" in
    sqlite)
      backup_sqlite
      ;;
    mysql|mariadb)
      if backup_mysql_local; then
        return 0
      fi
      if backup_mysql_docker; then
        return 0
      fi
      err "Failed to back up MySQL/MariaDB database (local and docker methods both failed)."
      return 1
      ;;
    pgsql)
      backup_pgsql_local
      ;;
    *)
      err "Unsupported DB_CONNECTION '$conn'."
      return 1
      ;;
  esac
}

write_manifest() {
  local conn="${DB_CONNECTION:-mysql}"
  local host="${DB_HOST:-}"
  local db="${DB_DATABASE:-}"
  cat > "$TARGET_DIR/manifest.txt" <<MANIFEST
created_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
project_root=$PROJECT_ROOT
db_connection=$conn
db_host=$host
db_name=$db
contains_uploads_archive=$( [[ -f "$TARGET_DIR/storage_app_public.tar.gz" ]] && echo yes || echo no )
MANIFEST
}

write_checksums() {
  log "Writing checksums"
  (
    cd "$TARGET_DIR"
    sha256sum ./* > SHA256SUMS.txt
  )
}

log "Backup target: $TARGET_DIR"
backup_uploads
backup_database
write_manifest
write_checksums
log "Backup complete"
log "Files created in: $TARGET_DIR"
