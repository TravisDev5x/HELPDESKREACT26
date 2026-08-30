<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Security headers
    |--------------------------------------------------------------------------
    | When enabled, responses will include X-Content-Type-Options, X-Frame-Options
    | and Referrer-Policy. Use config cache in production (php artisan config:cache).
    */
    'headers_enabled' => env('SECURITY_HEADERS_ENABLED', true),

    // Legacy test fixtures create permissionless "admin" users. Never enable outside APP_ENV=testing.
    'testing_permission_bypass' => env('SECURITY_TESTING_PERMISSION_BYPASS', false),
];
