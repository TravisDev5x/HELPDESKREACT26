<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

/**
 * Política exclusiva del contexto "Mis Tickets" (solicitante).
 * Solo aplica a tickets donde el usuario es requester_id.
 * No mezcla lógica operativa (áreas, asignación, permisos tickets.*).
 *
 * Regla de oro: si una acción altera la operación global, no pertenece aquí.
 */
class RequesterTicketPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** Solo el solicitante puede ver el ticket en "Mis Tickets". */
    public function view(User $user, Ticket $ticket): bool
    {
        return (int) $ticket->requester_id === (int) $user->id;
    }

    /** Cualquier usuario autenticado puede crear un ticket (será su propio ticket). */
    public function create(User $user): bool
    {
        return true;
    }

    /** Solo el solicitante puede enviar alertas/observaciones. */
    public function alert(User $user, Ticket $ticket): bool
    {
        return (int) $ticket->requester_id === (int) $user->id;
    }

    /** Solo el solicitante puede añadir comentarios (visibles en el historial). */
    public function comment(User $user, Ticket $ticket): bool
    {
        return (int) $ticket->requester_id === (int) $user->id;
    }

    /** Solo el solicitante puede subir adjuntos a su ticket. */
    public function attach(User $user, Ticket $ticket): bool
    {
        return (int) $ticket->requester_id === (int) $user->id;
    }

    /**
     * Solo el solicitante puede cancelar.
     * Solo antes de que soporte tome el ticket (no asignado) y si el estado no es final.
     */
    public function cancel(User $user, Ticket $ticket): bool
    {
        if ((int) $ticket->requester_id !== (int) $user->id) {
            return false;
        }
        if ($ticket->assigned_user_id) {
            return false;
        }
        $ticket->loadMissing('state');

        return ! ($ticket->state && $ticket->state->is_final);
    }
}
