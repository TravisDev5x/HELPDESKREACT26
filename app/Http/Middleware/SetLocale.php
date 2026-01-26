<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class SetLocale
{
    /**
     * Lista blanca de idiomas permitidos.
     */
    protected array $allowed = ['es', 'en', 'ja', 'de', 'zh', 'fr'];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $locale = $this->resolveLocale($request);
        App::setLocale($locale);

        return $next($request);
    }

    protected function resolveLocale(Request $request): string
    {
        // 1) Preferencia del usuario autenticado
        if ($request->user() && $request->user()->locale) {
            return $this->normalize($request->user()->locale);
        }

        // 2) Header Accept-Language
        $header = $request->getPreferredLanguage($this->allowed);
        if ($header) {
            return $this->normalize($header);
        }

        // 3) Predeterminado
        return 'es';
    }

    protected function normalize(?string $locale): string
    {
        $candidate = substr((string) $locale, 0, 2);
        return in_array($candidate, $this->allowed, true) ? $candidate : 'es';
    }
}
