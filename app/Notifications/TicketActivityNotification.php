<?php

namespace App\Notifications;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class TicketActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public Ticket $ticket;
    public string $action; // created|updated

    public function __construct(Ticket $ticket, string $action = 'updated')
    {
        $this->ticket = $ticket;
        $this->action = $action;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
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
