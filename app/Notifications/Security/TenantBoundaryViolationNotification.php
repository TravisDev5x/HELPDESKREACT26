<?php

namespace App\Notifications\Security;

use App\Notifications\Concerns\DeliversRealtimeNotifications;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class TenantBoundaryViolationNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use DeliversRealtimeNotifications;

    public function __construct(
        public string $event,
        public ?string $userLabel,
        public ?string $clientName,
        public ?int $clientId,
    ) {
    }

    public function via(object $notifiable): array
    {
        return $this->notificationChannels($notifiable);
    }

    public function viaQueues(): array
    {
        return $this->criticalNotificationQueues();
    }

    public function toArray(object $notifiable): array
    {
        $who = $this->userLabel ?? 'Usuario desconocido';
        $where = $this->clientName ?? 'un cliente';

        $message = $this->event === 'login_rejected'
            ? "Login rechazado: {$who} intentó entrar al portal de \"{$where}\" sin acceso."
            : "Acceso bloqueado: {$who} (sesión activa) intentó entrar al portal de \"{$where}\" sin acceso.";

        return [
            'kind' => 'tenant_boundary_violation',
            'event' => $this->event,
            'message' => $message,
            'client_id' => $this->clientId,
        ];
    }
}
