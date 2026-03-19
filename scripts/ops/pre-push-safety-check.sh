#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-24}"
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_ROOT/backups}"
ALLOW_IMAGE_DELETIONS="${ALLOW_IMAGE_DELETIONS:-0}"

log() { printf '[pre-push] %s\n' "$1"; }
err() { printf '[pre-push][error] %s\n' "$1" >&2; }

check_deleted_product_assets() {
  local deleted
  deleted="$({ git diff --name-status; git diff --cached --name-status; } | awk '$1=="D" && $2 ~ /^public\/images\// { print $2 }' | sort -u)"

  if [[ -n "$deleted" && "$ALLOW_IMAGE_DELETIONS" != "1" ]]; then
    err "Detected deleted tracked image assets under public/images/."
    printf '%s\n' "$deleted" >&2
    err "If intentional, rerun with ALLOW_IMAGE_DELETIONS=1."
    return 1
  fi
}

latest_backup_dir() {
  [[ -d "$BACKUP_ROOT" ]] || return 1
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1
}

check_backup_exists_and_fresh() {
  local latest
  latest="$(latest_backup_dir || true)"

  if [[ -z "$latest" ]]; then
    err "No backups found in $BACKUP_ROOT"
    err "Run: scripts/ops/backup-live-data.sh"
    return 1
  fi

  local now epoch age_seconds max_seconds
  now="$(date +%s)"
  epoch="$(stat -c %Y "$latest")"
  age_seconds=$((now - epoch))
  max_seconds=$((MAX_BACKUP_AGE_HOURS * 3600))

  if (( age_seconds > max_seconds )); then
    err "Latest backup is older than ${MAX_BACKUP_AGE_HOURS}h: $latest"
    err "Run a fresh backup before push: scripts/ops/backup-live-data.sh"
    return 1
  fi

  local has_db=0
  local has_uploads=0

  if [[ -f "$latest/db.sqlite" || -f "$latest/db.sql" || -f "$latest/db.sql.gz" ]]; then
    has_db=1
  fi

  if [[ -f "$latest/storage_app_public.tar.gz" ]]; then
    has_uploads=1
  fi

  if (( has_db == 0 )); then
    err "Latest backup is missing database dump/file: $latest"
    return 1
  fi

  if (( has_uploads == 0 )); then
    err "Latest backup is missing uploads archive: $latest"
    return 1
  fi

  log "Latest backup looks valid: $latest"
}

check_deleted_product_assets
check_backup_exists_and_fresh

log "Safety checks passed."
