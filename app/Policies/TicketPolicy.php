<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->scopeType($user) !== null;
    }

    public function create(User $user): bool
    {
        return $user->can('tickets.create') || $user->can('tickets.manage_all');
    }

    /**
     * Vista: manage_all ve todo; por área solo tickets con area_current_id = su área (al escalar deja de verse en el área anterior).
     * area+own: además ve sus propios tickets como solicitante.
     */
    public function view(User $user, Ticket $ticket): bool
    {
        $scope = $this->scopeType($user);
        if ($scope === 'all') return true;
        $areaId = $user->area_id;
        $own = (int) $ticket->requester_id === (int) $user->id;
        $inCurrentArea = $areaId && (int) $ticket->area_current_id === (int) $areaId;
        if ($scope === 'area+own') return $inCurrentArea || $own;
        if ($scope === 'area') return $inCurrentArea;
        if ($scope === 'own') return $own;
        return false;
    }

    /** Solo agentes con área/asignación pueden modificar. El solicitante no actualiza ni comenta; usa alertas como observaciones. */
    public function update(User $user, Ticket $ticket): bool
    {
        if ($user->can('tickets.manage_all')) return true;
        if (!$this->isCurrentArea($user, $ticket) && !$this->isAssignee($user, $ticket)) {
            return false;
        }
        return $this->hasAnyManagePermission($user);
    }

    public function changeStatus(User $user, Ticket $ticket): bool
    {
        return $this->canManageAction($user, $ticket, 'tickets.change_status');
    }

    public function changeArea(User $user, Ticket $ticket): bool
    {
        return $this->canManageAction($user, $ticket, 'tickets.escalate');
    }

    /** Solo agentes con permiso comentan. El solicitante añade observaciones mediante alertas. */
    public function comment(User $user, Ticket $ticket): bool
    {
        return $this->canManageAction($user, $ticket, 'tickets.comment');
    }

    /** Solo el responsable actual (o admin) puede reasignar; si no hay responsable, cualquiera con permiso en el área puede tomar/reasignar. */
    public function assign(User $user, Ticket $ticket): bool
    {
        if ($user->can('tickets.manage_all')) return true;
        if (!$user->can('tickets.assign')) return false;
        if ($ticket->assigned_user_id) {
            return $this->isAssignee($user, $ticket);
        }
        return $this->isCurrentArea($user, $ticket) || $this->isAssignee($user, $ticket);
    }

    /** Solo el responsable actual (o admin) puede liberar el ticket para otros agentes. */
    public function release(User $user, Ticket $ticket): bool
    {
        if ($user->can('tickets.manage_all')) return true;
        if (!$ticket->assigned_user_id) return false;
        return $this->isAssignee($user, $ticket);
    }

    /** Solo el responsable actual (o admin) puede escalar cuando el ticket está asignado; evita conflictos. */
    public function escalate(User $user, Ticket $ticket): bool
    {
        if ($user->can('tickets.manage_all')) return true;
        if ($ticket->assigned_user_id && !$this->isAssignee($user, $ticket)) {
            return false;
        }
        return $this->canManageAction($user, $ticket, 'tickets.escalate');
    }

    /** Solo el solicitante puede enviar alertas (ticket no atendido / ignorado). */
    public function alert(User $user, Ticket $ticket): bool
    {
        return (int) $ticket->requester_id === (int) $user->id;
    }

    /** Solo el solicitante puede cancelar sus tickets que no estén resueltos. */
    public function cancel(User $user, Ticket $ticket): bool
    {
        if ((int) $ticket->requester_id !== (int) $user->id) {
            return false;
        }
        $ticket->loadMissing('state');
        return !($ticket->state && $ticket->state->is_final);
    }

    /**
     * Alcance por área: solo tickets cuyo area_current_id es la del usuario.
     * Soporte ve solo tickets en área Soporte, Infra solo en Infra; al escalar el ticket pasa al área destino y deja de verse en la origen.
     * area+own: además incluye tickets donde el usuario es el solicitante (requester_id).
     */
    public function scopeFor(User $user, Builder $query): Builder
    {
        $scope = $this->scopeType($user);
        if ($scope === 'all') {
            return $query;
        }

        $areaId = $user->area_id;
        return $query->where(function ($q) use ($scope, $user, $areaId) {
            if (in_array($scope, ['area', 'area+own']) && $areaId) {
                $q->where('area_current_id', $areaId);
                if ($scope === 'area+own') {
                    $q->orWhere('requester_id', $user->id);
                }
            } elseif ($scope === 'own') {
                $q->where('requester_id', $user->id);
            }
        });
    }

    /**
     * Devuelve el tipo de alcance:
     * - all: tickets.manage_all
     * - area+own: tiene view_area (con area_id) y view_own
     * - area: solo view_area (area actual o historica)
     * - own: solo view_own
     * - null: sin acceso
     */
    protected function scopeType(User $user): ?string
    {
        if ($user->can('tickets.manage_all')) return 'all';
        $hasAreaPerm = $user->can('tickets.view_area') && $user->area_id;
        $hasOwnPerm = $user->can('tickets.view_own');

        if ($hasAreaPerm && $hasOwnPerm) return 'area+own';
        if ($hasAreaPerm) return 'area';
        if ($hasOwnPerm) return 'own';

        return null;
    }

    protected function isCurrentArea(User $user, Ticket $ticket): bool
    {
        return $user->area_id && $ticket->area_current_id === $user->area_id;
    }

    protected function isAssignee(User $user, Ticket $ticket): bool
    {
        return $ticket->assigned_user_id && (int) $ticket->assigned_user_id === (int) $user->id;
    }

    protected function hasAnyManagePermission(User $user): bool
    {
        return $user->can('tickets.assign')
            || $user->can('tickets.change_status')
            || $user->can('tickets.comment')
            || $user->can('tickets.escalate');
    }

    protected function canManageAction(User $user, Ticket $ticket, string $permission): bool
    {
        if ($user->can('tickets.manage_all')) return true;
        if (!$user->can($permission)) return false;
        return $this->isCurrentArea($user, $ticket) || $this->isAssignee($user, $ticket);
    }
}
