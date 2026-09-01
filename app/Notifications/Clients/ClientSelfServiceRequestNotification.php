<?php

namespace App\Notifications\Clients;

use App\Notifications\Concerns\DeliversRealtimeNotifications;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ClientSelfServiceRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use DeliversRealtimeNotifications;

    public function __construct(
        public string $type, // 'plan_change' | 'cancellation'
        public string $clientName,
        public int $clientId,
        public string $requestedByLabel,
        public ?string $note = null,
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
        $action = $this->type === 'cancellation' ? 'cancelar su cuenta' : 'cambiar de plan';
        $message = "{$this->requestedByLabel} ({$this->clientName}) solicitó {$action}.";
        if ($this->note) {
            $message .= " Nota: \"{$this->note}\"";
        }

        return [
            'kind' => 'client_self_service_request',
            'request_type' => $this->type,
            'message' => $message,
            'client_id' => $this->clientId,
        ];
    }
}
