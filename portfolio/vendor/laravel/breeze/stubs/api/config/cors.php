<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration controls what cross-origin requests are allowed.
    | Adjust the allowed_origins to include your frontend dev server.
    |
    */

    'paths' => ['api/*'], // Only API routes need CORS

    'allowed_methods' => ['*'], // Allow all HTTP methods

    'allowed_origins' => [
        'http://localhost:5175', // Vite dev server
        'http://127.0.0.1:5175', // Just in case
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'], // Allow all headers

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // Set true if you use cookies/auth
];
