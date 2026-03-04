#!/bin/sh
set -eu

if [ -z "${PORT:-}" ]; then
  echo "ERROR: PORT is missing. Railway must inject PORT for the web service." >&2
  exit 1
fi

echo "Booting Laravel on port ${PORT}"

php artisan config:clear --ansi
php artisan route:clear --ansi
php artisan view:clear --ansi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running migrations..."
  php artisan migrate --force --ansi
fi

exec php -S 0.0.0.0:$PORT -t public public/router.php
