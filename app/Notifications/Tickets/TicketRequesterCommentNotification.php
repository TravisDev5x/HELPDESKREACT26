<?php

namespace App\Notifications\Tickets;

class TicketRequesterCommentNotification extends BaseTicketNotification
{
    public function __construct(
        public int $ticketId,
        public string $message,
        public ?int $actorId = null
    ) {
    }

    protected function kind(): string
    {
        return 'ticket_requester_comment';
    }

    public function toArray(object $notifiable): array
    {
        return $this->basePayload($this->ticketId, $this->message, $this->actorId);
    }
}
