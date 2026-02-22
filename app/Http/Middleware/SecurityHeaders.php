<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /**
     * Non-invasive security headers. Enabled via env flag to allow staged rollout.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (!config('security.headers_enabled', false)) {
            return $response;
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        return $response;
    }
}
