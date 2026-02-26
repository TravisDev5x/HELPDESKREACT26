<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Pipeline;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Asegura que las rutas de autenticación tengan sesión iniciada
 * aunque Sanctum no considere la petición "stateful" (p. ej. sin Referer).
 * Incluye ValidateCsrfToken para que la respuesta envíe XSRF-TOKEN actualizado
 * tras session()->regenerate() en login (evita 419 en PUT/POST siguientes).
 */
class EnsureSessionForAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->needsSession($request)) {
            return $next($request);
        }

        return (new Pipeline(app()))->send($request)->through([
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ValidateCsrfToken::class,
        ])->then(fn (Request $req) => $next($req));
    }

    protected function needsSession(Request $request): bool
    {
        return $request->is(
            'api/login',
            'api/logout',
            'api/register',
            'sanctum/csrf-cookie'
        );
    }
}
