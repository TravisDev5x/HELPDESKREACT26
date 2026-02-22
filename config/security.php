<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Security headers
    |--------------------------------------------------------------------------
    | When enabled, responses will include X-Content-Type-Options, X-Frame-Options
    | and Referrer-Policy. Use config cache in production (php artisan config:cache).
    */
    'headers_enabled' => env('SECURITY_HEADERS_ENABLED', false),
];
