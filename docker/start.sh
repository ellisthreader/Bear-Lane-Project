#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
  echo "ERROR: APP_KEY is not set. Set it in Railway Variables (example: base64:...)." >&2
  exit 1
fi

php artisan config:clear --ansi
php artisan route:clear --ansi
php artisan view:clear --ansi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running migrations..."
  php artisan migrate --force --ansi
fi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
