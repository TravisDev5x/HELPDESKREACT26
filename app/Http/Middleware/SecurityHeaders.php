<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /**
     * Add a small set of defensive HTTP headers without altering responses.
     *
     * Headers are skipped in local/testing to avoid impacting Vite HMR.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $isLocal = app()->environment(['local', 'testing']);

        // Always-safe headers (even in local)
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Only enforce stricter policies outside local/testing to keep dev tooling intact.
        if (! $isLocal) {
            if ($request->isSecure()) {
                // One year HSTS, include subdomains, preload-friendly.
                $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            }

            if (! $response->headers->has('Content-Security-Policy')) {
                // Minimal CSP compatible with current asset pipeline.
                $response->headers->set(
                    'Content-Security-Policy',
                    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
                );
            }
        }

        return $response;
    }
}
