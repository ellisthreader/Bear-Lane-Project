<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS, Stripe, OAuth providers, and more. This file
    | provides a conventional location for packages to locate credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ---------------------------
    // Unsplash API
    // ---------------------------
    'unsplash' => [
        'access_key' => env('UNSPLASH_ACCESS_KEY'),
    ],

    // ---------------------------
    // Stripe API
    // ---------------------------
    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
    ],

    // ---------------------------
    // Shippo API
    // ---------------------------
    'shippo' => [
        'token' => env('SHIPPO_API_KEY', env('SHIPPO_TOKEN')),
    ],

    // ---------------------------
    // OpenAI API
    // ---------------------------
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'moderation_model' => env('OPENAI_MODERATION_MODEL', 'omni-moderation-latest'),
        'timeout' => (int) env('OPENAI_TIMEOUT', 10),
    ],

    // ---------------------------
    // Cloudflare Turnstile
    // ---------------------------
    'recaptcha' => [
        'provider' => env('RECAPTCHA_PROVIDER', env('TURNSTILE_PROVIDER', 'turnstile')),
        'secret' => env('RECAPTCHA_SECRET_KEY', env('TURNSTILE_SECRET_KEY')),
        'site_key' => env('RECAPTCHA_SITE_KEY', env('TURNSTILE_SITE_KEY', env('VITE_TURNSTILE_SITE_KEY', env('VITE_RECAPTCHA_SITE_KEY')))),
    ],

    // ---------------------------
    // OAuth Providers
    // ---------------------------
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', rtrim((string) env('APP_URL', 'http://localhost'), '/') . '/auth/google/callback'),
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'redirect' => env('APPLE_REDIRECT_URI', rtrim((string) env('APP_URL', 'http://localhost'), '/') . '/auth/apple/callback'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI', rtrim((string) env('APP_URL', 'http://localhost'), '/') . '/auth/facebook/callback'),
    ],

];
