<?php

namespace App\Notifications\Tickets;

use Illuminate\Notifications\Notification;

abstract class BaseTicketNotification extends Notification
{
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    protected function basePayload(int $ticketId, string $message, ?int $actorId = null): array
    {
        return [
            'ticket_id' => $ticketId,
            'message' => $message,
            'actor_id' => $actorId,
        ];
    }
}
