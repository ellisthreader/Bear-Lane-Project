#!/bin/sh
set -eu

APP_MODE="${APP_MODE:-web}"

echo "Boot mode: ${APP_MODE}"

php artisan config:clear --ansi
php artisan route:clear --ansi
php artisan view:clear --ansi

# storage/app/public is a mounted Railway volume so uploaded images (avatars,
# order designs, invoices) survive redeploys. It starts empty, and the mount
# hides anything the image baked in, so recreate the tree on every boot.
mkdir -p storage/app/public
chown -R www-data:www-data storage/app/public || true

# Ensure public/storage points to this container's storage path.
# Repo-copied symlinks can target a different absolute path (e.g. /var/www/html).
if [ -L public/storage ] || [ -e public/storage ]; then
  rm -rf public/storage
fi
php artisan storage:link --ansi
rm -f public/hot

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running migrations..."
  php artisan migrate --force --ansi
fi

# The admin account is created by a seeder, and seeders never ran on deploy,
# so the credentials only ever existed in local databases. updateOrCreate is
# keyed on the email, so re-running this each boot is safe and idempotent.
if [ "${RUN_ADMIN_SEED:-true}" = "true" ]; then
  echo "Seeding admin user..."
  php artisan db:seed --class=AdminUserSeeder --force --ansi
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
