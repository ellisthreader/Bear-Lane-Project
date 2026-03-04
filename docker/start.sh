#!/bin/sh
set -eu

php artisan config:clear --ansi
php artisan route:clear --ansi
php artisan view:clear --ansi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  php artisan migrate --force --ansi
fi

exec php -S 0.0.0.0:$PORT -t public
