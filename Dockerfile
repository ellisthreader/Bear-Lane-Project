# syntax=docker/dockerfile:1

FROM php:8.3-cli-alpine AS composer_deps
WORKDIR /app

RUN apk add --no-cache git unzip \
    && rm -rf /var/cache/apk/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

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

ARG VITE_API_URL
ARG VITE_STRIPE_KEY
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_PUSHER_APP_KEY
ARG VITE_PUSHER_APP_CLUSTER
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_KEY=$VITE_STRIPE_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_PUSHER_APP_KEY=$VITE_PUSHER_APP_KEY
ENV VITE_PUSHER_APP_CLUSTER=$VITE_PUSHER_APP_CLUSTER

COPY package.json package-lock.json ./
RUN npm ci

COPY resources ./resources
COPY public ./public
# postcss.config.js imports scripts/postcss/siteThemeTokens.js
COPY scripts ./scripts
COPY vite.config.js tailwind.config.js postcss.config.js tsconfig.json jsconfig.json global.d.ts ./
RUN npm run build

FROM php:8.3-cli-alpine AS app
WORKDIR /app

RUN apk add --no-cache $PHPIZE_DEPS oniguruma-dev libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring bcmath pcntl exif zip

COPY . .
COPY --from=composer_deps /app/vendor ./vendor
COPY --from=frontend_build /app/public/build ./public/build
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && php artisan package:discover --ansi

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/start.sh"]
