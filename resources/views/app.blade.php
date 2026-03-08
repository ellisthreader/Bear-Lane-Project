<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    <!-- CSRF Token -->
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="turnstile-site-key" content="{{ (string) config('services.recaptcha.site_key', '') }}">
    <meta name="turnstile-provider" content="{{ (string) config('services.recaptcha.provider', '') }}">
    <meta name="recaptcha-site-key" content="{{ (string) config('services.recaptcha.site_key', '') }}">
    <meta name="recaptcha-provider" content="{{ (string) config('services.recaptcha.provider', '') }}">
    <link rel="preconnect" href="https://challenges.cloudflare.com">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>

    <!-- Routes & Vite -->
    @routes
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])

    @inertiaHead
</head>
<body class="font-sans antialiased">
    <!-- Inertia root -->
    @inertia

    <!-- ✅ Keep this — now deferred so it loads after DOM/Vite -->
    <script defer>
        window.csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    </script>
</body>
</html>
