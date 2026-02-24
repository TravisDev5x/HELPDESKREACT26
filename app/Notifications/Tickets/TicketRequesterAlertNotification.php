<?php

namespace App\Notifications\Tickets;

class TicketRequesterAlertNotification extends BaseTicketNotification
{
    public function __construct(
        public int $ticketId,
        public string $message,
        public ?int $actorId = null
    ) {
    }

    protected function kind(): string
    {
        return 'ticket_requester_alert';
    }

    public function toArray(object $notifiable): array
    {
        return $this->basePayload($this->ticketId, $this->message, $this->actorId);
    }
}
