#!/bin/sh
set -eu

APP_MODE="${APP_MODE:-web}"

echo "Boot mode: ${APP_MODE}"

php artisan config:clear --ansi
php artisan route:clear --ansi
php artisan view:clear --ansi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running migrations..."
  php artisan migrate --force --ansi
fi

if [ "${APP_MODE}" = "worker" ]; then
  echo "Starting queue worker..."
  exec php artisan queue:work --tries="${QUEUE_WORK_TRIES:-3}" --timeout="${QUEUE_WORK_TIMEOUT:-120}"
fi

if [ -z "${PORT:-}" ]; then
  echo "ERROR: PORT is missing. Railway must inject PORT for the web service." >&2
  exit 1
fi

echo "Booting Laravel on port ${PORT}"
exec php -S 0.0.0.0:$PORT -t public public/router.php
