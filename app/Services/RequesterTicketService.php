<?php

namespace App\Services;

use App\Models\Ticket;
use App\Models\TicketAlert;
use App\Models\TicketHistory;
use App\Models\TicketState;
use App\Models\User;
use App\Notifications\Tickets\TicketRequesterAlertNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Casos de uso del módulo "Mis Tickets" (solo solicitante).
 * Desacoplado del flujo operativo (TicketController).
 */
class RequesterTicketService
{
    /**
     * Envía una alerta/observación del solicitante y notifica a responsables.
     *
     * @return array{alert: \App\Models\TicketAlert, ticket: \App\Models\Ticket}
     */
    public function sendAlert(Ticket $ticket, User $requester, ?string $message = null): array
    {
        $alert = TicketAlert::create([
            'ticket_id' => $ticket->id,
            'requester_id' => $requester->id,
            'message' => $message,
        ]);

        $noteText = trim((string) $message);
        if ($noteText === '') {
            $noteText = 'Alerta del solicitante (sin mensaje adicional).';
        } else {
            $noteText = 'Observación / alerta del solicitante: ' . $noteText;
        }

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'actor_id' => $requester->id,
            'from_area_id' => $ticket->area_current_id,
            'to_area_id' => $ticket->area_current_id,
            'ticket_state_id' => $ticket->ticket_state_id,
            'note' => $noteText,
            'is_internal' => false,
            'action' => 'requester_alert',
            'from_assignee_id' => null,
            'to_assignee_id' => null,
        ]);

        $msg = "El solicitante ha enviado una alerta por el ticket #{$ticket->id}: no atendido o ignorado.";
        if ($noteText !== '' && $noteText !== 'Alerta del solicitante (sin mensaje adicional).') {
            $msg .= ' ' . trim($message);
        }

        $recipientIds = collect();
        if ($ticket->assigned_user_id && (int) $ticket->assigned_user_id !== (int) $requester->id) {
            $recipientIds->push($ticket->assigned_user_id);
        }
        $recipientIds = $recipientIds->merge(
            User::permission('tickets.manage_all')->pluck('id')
        )->unique()->filter(fn ($id) => (int) $id !== (int) $requester->id)->values();

        $notification = new TicketRequesterAlertNotification($ticket->id, $msg, $requester->id);
        foreach (User::whereIn('id', $recipientIds)->get() as $recipient) {
            $this->safeNotify($recipient, $notification, $ticket->id);
        }

        return ['alert' => $alert, 'ticket' => $ticket->fresh()];
    }

    /**
     * Añade un comentario del solicitante al historial (visible para soporte).
     * Caso de uso: AddTicketCommentAsRequester.
     *
     * @return \App\Models\TicketHistory
     */
    public function addComment(Ticket $ticket, User $requester, string $note): TicketHistory
    {
        $note = trim($note);
        if ($note === '') {
            throw new \InvalidArgumentException('El comentario no puede estar vacío');
        }

        return TicketHistory::create([
            'ticket_id' => $ticket->id,
            'actor_id' => $requester->id,
            'from_area_id' => $ticket->area_current_id,
            'to_area_id' => $ticket->area_current_id,
            'ticket_state_id' => $ticket->ticket_state_id,
            'note' => $note,
            'is_internal' => false,
            'action' => 'requester_comment',
            'from_assignee_id' => null,
            'to_assignee_id' => null,
        ]);
    }

    /**
     * Cancela el ticket por el solicitante (solo si no está asignado ni en estado final).
     *
     * @return \App\Models\Ticket
     *
     * @throws \RuntimeException si no existe estado Cancelado
     */
    public function cancel(Ticket $ticket, User $requester): Ticket
    {
        $cancelStateId = TicketState::where('code', 'cancelado')->value('id')
            ?? TicketState::where('name', 'Cancelado')->value('id');

        if (! $cancelStateId) {
            throw new \RuntimeException('No existe el estado Cancelado en el sistema');
        }

        return DB::transaction(function () use ($ticket, $requester, $cancelStateId) {
            $beforeStateId = $ticket->ticket_state_id;
            $ticket->ticket_state_id = $cancelStateId;
            $ticket->resolved_at = now();
            $ticket->save();

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => $requester->id,
                'from_area_id' => $ticket->area_current_id,
                'to_area_id' => $ticket->area_current_id,
                'ticket_state_id' => $cancelStateId,
                'note' => 'Ticket cancelado por el solicitante',
                'is_internal' => false,
                'action' => 'state_change',
            ]);

            return $ticket->fresh();
        });
    }

    protected function safeNotify(User $user, $notification, int $ticketId): void
    {
        try {
            $user->notify($notification);
        } catch (\Throwable $e) {
            Log::warning('requester_ticket notification failed', [
                'user_id' => $user->id,
                'ticket_id' => $ticketId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
