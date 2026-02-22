<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Ticket;
use App\Models\Incident;
use App\Policies\TicketPolicy;
use App\Policies\IncidentPolicy;
use Illuminate\Support\Facades\Event;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\URL;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        Gate::policy(Ticket::class, TicketPolicy::class);
        Gate::policy(Incident::class, IncidentPolicy::class);

        Event::listen(\App\Events\TicketCreated::class, \App\Listeners\SendTicketNotification::class);
        Event::listen(\App\Events\TicketUpdated::class, \App\Listeners\SendTicketNotification::class);

        ResetPassword::createUrlUsing(function ($user, string $token) {
            $email = urlencode((string) $user->email);
            return URL::to('/') . "/reset-password?token={$token}&email={$email}";
        });
    }
}
