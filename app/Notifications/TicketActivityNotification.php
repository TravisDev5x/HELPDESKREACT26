<?php

namespace App\Notifications;

use App\Models\Ticket;
use App\Notifications\Concerns\DeliversRealtimeNotifications;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class TicketActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use DeliversRealtimeNotifications;

    public Ticket $ticket;
    public string $action; // created|updated

    public function __construct(Ticket $ticket, string $action = 'updated')
    {
        $this->ticket = $ticket;
        $this->action = $action;
    }

    public function via(object $notifiable): array
    {
        return $this->notificationChannels($notifiable);
    }

    public function viaQueues(): array
    {
        return $this->notificationQueues();
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        // Solo las actualizaciones genéricas son silenciables; asignaciones,
        // alertas y seguridad usan sus propias notificaciones prioritarias.
        return ($notifiable->notification_preferences['informational'] ?? true)
            || $this->action !== 'updated';
    }

    public function toArray(object $notifiable): array
    {
        $actionLabel = $this->action === 'created' ? 'creado' : 'actualizado';
        $message = "Ticket #{$this->ticket->id} ({$this->ticket->subject}) {$actionLabel}.";

        return [
            'kind' => 'ticket_activity',
            'ticket_id' => $this->ticket->id,
            'message' => $message,
            'subject' => $this->ticket->subject,
            'area_current_id' => $this->ticket->area_current_id,
            'action' => $this->action,
            'created_at' => $this->ticket->created_at?->toIso8601String(),
        ];
    }
}
