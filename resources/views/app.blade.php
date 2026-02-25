<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    <!-- CSRF Token -->
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Preload dark mode to prevent flash of light mode -->
    <script>
        try {
            if (localStorage.getItem('darkMode') === 'true') {
                document.documentElement.classList.add('dark');
            }
        } catch (e) {
            console.error(e);
        }
    </script>

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
