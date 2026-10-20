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

usage() {
  cat <<USAGE
Usage: scripts/ops/restore-live-data.sh <backup_dir> [--db-only|--uploads-only]

Examples:
  scripts/ops/restore-live-data.sh backups/20260319_120000
  scripts/ops/restore-live-data.sh backups/20260319_120000 --db-only
USAGE
}

[[ $# -ge 1 ]] || { usage; exit 1; }

BACKUP_DIR="$1"
MODE="all"
if [[ ${2:-} == "--db-only" ]]; then
  MODE="db"
elif [[ ${2:-} == "--uploads-only" ]]; then
  MODE="uploads"
elif [[ -n ${2:-} ]]; then
  usage
  exit 1
fi

if [[ "$BACKUP_DIR" != /* ]]; then
  BACKUP_DIR="$PROJECT_ROOT/$BACKUP_DIR"
fi

log() { printf '[restore] %s\n' "$1"; }
err() { printf '[restore][error] %s\n' "$1" >&2; }

[[ -d "$BACKUP_DIR" ]] || { err "Backup directory not found: $BACKUP_DIR"; exit 1; }

restore_uploads() {
  local archive="$BACKUP_DIR/storage_app_public.tar.gz"
  [[ -f "$archive" ]] || { err "Uploads archive missing: $archive"; return 1; }

  mkdir -p "$PROJECT_ROOT/storage/app"
  log "Restoring uploads archive to storage/app/public"
  tar -xzf "$archive" -C "$PROJECT_ROOT/storage/app"
}

restore_sqlite() {
  local src="$BACKUP_DIR/db.sqlite"
  [[ -f "$src" ]] || { err "SQLite backup missing: $src"; return 1; }

  local sqlite_path="${DB_DATABASE:-$PROJECT_ROOT/database/database.sqlite}"
  if [[ "$sqlite_path" != /* ]]; then
    sqlite_path="$PROJECT_ROOT/$sqlite_path"
  fi

  mkdir -p "$(dirname "$sqlite_path")"
  log "Restoring SQLite database to $sqlite_path"
  cp "$src" "$sqlite_path"
}

restore_mysql_local() {
  command -v mysql >/dev/null 2>&1 || return 1

  local dump="$BACKUP_DIR/db.sql.gz"
  [[ -f "$dump" ]] || { err "MySQL dump missing: $dump"; return 1; }

  local host="${DB_HOST:-127.0.0.1}"
  local port="${DB_PORT:-3306}"
  local db="${DB_DATABASE:-}"
  local user="${DB_USERNAME:-root}"
  local pass="${DB_PASSWORD:-}"

  [[ -n "$db" ]] || { err "DB_DATABASE is not set for mysql restore."; return 1; }

  log "Restoring MySQL/MariaDB database via local mysql client"
  gunzip -c "$dump" | MYSQL_PWD="$pass" mysql --host="$host" --port="$port" --user="$user" "$db"
}

restore_mysql_docker() {
  command -v docker >/dev/null 2>&1 || return 1
  docker compose version >/dev/null 2>&1 || return 1
  docker compose ps mysql >/dev/null 2>&1 || return 1

  local dump="$BACKUP_DIR/db.sql.gz"
  [[ -f "$dump" ]] || { err "MySQL dump missing: $dump"; return 1; }

  local db="${DB_DATABASE:-}"
  local user="${DB_USERNAME:-root}"
  local pass="${DB_PASSWORD:-}"

  [[ -n "$db" ]] || { err "DB_DATABASE is not set for mysql restore."; return 1; }

  log "Restoring MySQL/MariaDB database via docker compose service 'mysql'"
  gunzip -c "$dump" | docker compose exec -T mysql mysql --user="$user" --password="$pass" "$db"
}

restore_pgsql_local() {
  command -v psql >/dev/null 2>&1 || return 1

  local dump="$BACKUP_DIR/db.sql.gz"
  [[ -f "$dump" ]] || { err "PostgreSQL dump missing: $dump"; return 1; }

  local host="${DB_HOST:-127.0.0.1}"
  local port="${DB_PORT:-5432}"
  local db="${DB_DATABASE:-}"
  local user="${DB_USERNAME:-postgres}"
  local pass="${DB_PASSWORD:-}"

  [[ -n "$db" ]] || { err "DB_DATABASE is not set for pgsql restore."; return 1; }

  log "Restoring PostgreSQL database"
  gunzip -c "$dump" | PGPASSWORD="$pass" psql --host="$host" --port="$port" --username="$user" --dbname="$db"
}

restore_database() {
  local conn="${DB_CONNECTION:-mysql}"

  case "$conn" in
    sqlite)
      restore_sqlite
      ;;
    mysql|mariadb)
      if restore_mysql_local; then
        return 0
      fi
      if restore_mysql_docker; then
        return 0
      fi
      err "Failed to restore MySQL/MariaDB database (local and docker methods both failed)."
      return 1
      ;;
    pgsql)
      restore_pgsql_local
      ;;
    *)
      err "Unsupported DB_CONNECTION '$conn'."
      return 1
      ;;
  esac
}

case "$MODE" in
  all)
    restore_uploads
    restore_database
    ;;
  uploads)
    restore_uploads
    ;;
  db)
    restore_database
    ;;
esac

log "Restore complete"
