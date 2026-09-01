<?php

namespace App\Notifications\Tickets;

use App\Notifications\Concerns\DeliversRealtimeNotifications;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

abstract class BaseTicketNotification extends Notification implements ShouldQueue
{
    use Queueable;
    use DeliversRealtimeNotifications;

    public function via(object $notifiable): array
    {
        return $this->notificationChannels($notifiable);
    }

    public function viaQueues(): array
    {
        return $this->notificationQueues();
    }

    abstract protected function kind(): string;

    protected function basePayload(int $ticketId, string $message, ?int $actorId = null): array
    {
        return [
            'kind' => $this->kind(),
            'ticket_id' => $ticketId,
            'message' => $message,
            'actor_id' => $actorId,
        ];
    }
}
