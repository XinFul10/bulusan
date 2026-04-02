<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'up'],

    'allowed_methods' => ['*'],

    // Comma-separated list in .env, e.g.:
    // FRONTEND_URLS=http://localhost:3000,http://localhost:3001,http://localhost:5173
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('FRONTEND_URLS', env('FRONTEND_URL', 'http://localhost:3000')))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];

