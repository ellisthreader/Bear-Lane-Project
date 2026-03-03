# syntax=docker/dockerfile:1

FROM composer:2 AS composer_deps
WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader \
    --no-scripts

FROM node:20-alpine AS frontend_build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY resources ./resources
COPY public ./public
COPY vite.config.js tailwind.config.js postcss.config.js tsconfig.json jsconfig.json global.d.ts ./
RUN npm run build

FROM php:8.3-cli-alpine AS app
WORKDIR /app

RUN apk add --no-cache $PHPIZE_DEPS oniguruma-dev libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring bcmath pcntl exif zip

COPY . .
COPY --from=composer_deps /app/vendor ./vendor
COPY --from=frontend_build /app/public/build ./public/build

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && php artisan package:discover --ansi

EXPOSE 8080

CMD ["sh", "-lc", "php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]
