<?php

namespace App\Notifications\Security;

use App\Notifications\Concerns\DeliversRealtimeNotifications;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Aviso al dueño de la cuenta cuando un login (no una acción explícita desde
 * "Mi perfil") vincula por primera vez un proveedor OAuth por coincidencia de
 * correo -- el vínculo nunca debe ser silencioso, ver GoogleAuthController /
 * MicrosoftAuthController::handleLogin.
 */
class OauthAutoLinkNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use DeliversRealtimeNotifications;

    public function __construct(
        public string $provider,
        public ?string $ip,
    ) {
    }

    public function via(object $notifiable): array
    {
        return $this->notificationChannels($notifiable);
    }

    public function viaQueues(): array
    {
        return $this->notificationQueues();
    }

    public function toArray(object $notifiable): array
    {
        $label = $this->provider === 'google' ? 'Google' : 'Microsoft';
        $ipSuffix = $this->ip ? " desde {$this->ip}" : '';

        return [
            'kind' => 'oauth_auto_link',
            'provider' => $this->provider,
            'message' => "Tu cuenta de {$label} se vinculó automáticamente al iniciar sesión{$ipSuffix}. Si no fuiste tú, revisa \"Cuentas conectadas\" en Mi perfil.",
        ];
    }
}
