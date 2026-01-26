<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

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

    public function view(User $user, Ticket $ticket): bool
    {
        $scope = $this->scopeType($user);
        if ($scope === 'all') return true;
        $areaId = $user->area_id;
        $own = $ticket->requester_id === $user->id;
        $inArea = false;
        if ($areaId) {
            $inArea = $ticket->area_current_id === $areaId;
            if (!$inArea) {
                $inArea = DB::table('ticket_area_access')
                    ->where('ticket_id', $ticket->id)
                    ->where('area_id', $areaId)
                    ->exists();
            }
        }
        if ($scope === 'area+own') return $inArea || $own;
        if ($scope === 'area') return $inArea;
        if ($scope === 'own') return $own;
        return false;
    }

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

    public function comment(User $user, Ticket $ticket): bool
    {
        return $this->canManageAction($user, $ticket, 'tickets.comment');
    }

    public function assign(User $user, Ticket $ticket): bool
    {
        return $this->canManageAction($user, $ticket, 'tickets.assign');
    }

    public function escalate(User $user, Ticket $ticket): bool
    {
        return $this->canManageAction($user, $ticket, 'tickets.escalate');
    }

    /**
     * Aplica restricciones de alcance al query, conservando la lógica existente
     */
    public function scopeFor(User $user, Builder $query): Builder
    {
        $scope = $this->scopeType($user);
        if ($scope === 'all') {
            return $query;
        }

        $areaId = $user->area_id;
        $table = $query->getModel()->getTable();
        return $query->where(function ($q) use ($scope, $user, $areaId, $table) {
            if (in_array($scope, ['area', 'area+own']) && $areaId) {
                $q->where(function ($areaQ) use ($areaId, $table) {
                    $areaQ->where('area_current_id', $areaId)
                        ->orWhereExists(function ($sub) use ($areaId, $table) {
                            $sub->select(DB::raw(1))
                                ->from('ticket_area_access')
                                ->whereColumn('ticket_area_access.ticket_id', $table . '.id')
                                ->where('ticket_area_access.area_id', $areaId);
                        });
                });
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
