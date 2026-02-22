<?php

namespace App\Policies;

use App\Models\Incident;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class IncidentPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->scopeType($user) !== null;
    }

    public function create(User $user): bool
    {
        return $user->can('incidents.create') || $user->can('incidents.manage_all');
    }

    public function view(User $user, Incident $incident): bool
    {
        $scope = $this->scopeType($user);
        if ($scope === 'all') return true;
        $areaId = $user->area_id;
        $own = $incident->reporter_id === $user->id;
        $inArea = $areaId ? $incident->area_id === $areaId : false;
        if ($scope === 'area+own') return $inArea || $own;
        if ($scope === 'area') return $inArea;
        if ($scope === 'own') return $own;
        return false;
    }

    public function update(User $user, Incident $incident): bool
    {
        if ($user->can('incidents.manage_all')) return true;
        if (!$this->isCurrentArea($user, $incident) && !$this->isAssignee($user, $incident)) {
            return false;
        }
        return $this->hasAnyManagePermission($user);
    }

    public function changeStatus(User $user, Incident $incident): bool
    {
        return $this->canManageAction($user, $incident, 'incidents.change_status');
    }

    public function comment(User $user, Incident $incident): bool
    {
        return $this->canManageAction($user, $incident, 'incidents.comment');
    }

    public function assign(User $user, Incident $incident): bool
    {
        return $this->canManageAction($user, $incident, 'incidents.assign');
    }

    /**
     * Aplica restricciones de alcance al query, conservando la logica actual.
     */
    public function scopeFor(User $user, Builder $query): Builder
    {
        $scope = $this->scopeType($user);
        if ($scope === 'all') {
            return $query;
        }

        $areaId = $user->area_id;
        return $query->where(function ($q) use ($scope, $user, $areaId) {
            if (in_array($scope, ['area', 'area+own'], true) && $areaId) {
                $q->where('area_id', $areaId);
                if ($scope === 'area+own') {
                    $q->orWhere('reporter_id', $user->id);
                }
            } elseif ($scope === 'own') {
                $q->where('reporter_id', $user->id);
            }
        });
    }

    /**
     * Devuelve el tipo de alcance:
     * - all: incidents.manage_all
     * - area+own: tiene view_area (con area_id) y view_own
     * - area: solo view_area (area actual)
     * - own: solo view_own
     * - null: sin acceso
     */
    protected function scopeType(User $user): ?string
    {
        if ($user->can('incidents.manage_all')) return 'all';
        $hasAreaPerm = $user->can('incidents.view_area') && $user->area_id;
        $hasOwnPerm = $user->can('incidents.view_own');

        if ($hasAreaPerm && $hasOwnPerm) return 'area+own';
        if ($hasAreaPerm) return 'area';
        if ($hasOwnPerm) return 'own';

        return null;
    }

    protected function isCurrentArea(User $user, Incident $incident): bool
    {
        return $user->area_id && $incident->area_id === $user->area_id;
    }

    protected function isAssignee(User $user, Incident $incident): bool
    {
        return $incident->assigned_user_id && (int) $incident->assigned_user_id === (int) $user->id;
    }

    protected function hasAnyManagePermission(User $user): bool
    {
        return $user->can('incidents.assign')
            || $user->can('incidents.change_status')
            || $user->can('incidents.comment');
    }

    protected function canManageAction(User $user, Incident $incident, string $permission): bool
    {
        if ($user->can('incidents.manage_all')) return true;
        if (!$user->can($permission)) return false;
        return $this->isCurrentArea($user, $incident) || $this->isAssignee($user, $incident);
    }
}
