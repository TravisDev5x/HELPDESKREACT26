<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Decide el área operativa inicial sin pedirle al solicitante que conozca
 * la estructura interna de soporte. Las reglas siempre se limitan al tenant.
 */
class TicketRoutingService
{
    public function resolveArea(int $clientId, ?int $ticketTypeId, ?int $fallbackAreaId = null): int
    {
        if ($ticketTypeId) {
            $mappedAreas = DB::table('area_ticket_type as mapping')
                ->join('areas', 'areas.id', '=', 'mapping.area_id')
                ->join('ticket_types', 'ticket_types.id', '=', 'mapping.ticket_type_id')
                ->where('mapping.ticket_type_id', $ticketTypeId)
                ->where('areas.is_active', true)
                ->where('ticket_types.is_active', true)
                ->where(fn ($query) => $query->whereNull('areas.client_id')->orWhere('areas.client_id', $clientId))
                ->where(fn ($query) => $query->whereNull('ticket_types.client_id')->orWhere('ticket_types.client_id', $clientId))
                ->orderByRaw('areas.client_id IS NULL')
                ->pluck('areas.id')
                ->unique()
                ->values();

            if ($mappedAreas->count() === 1) {
                return (int) $mappedAreas->first();
            }
        }

        $areas = DB::table('areas')
            ->where('is_active', true)
            ->where(fn ($query) => $query->whereNull('client_id')->orWhere('client_id', $clientId))
            ->orderByRaw('client_id IS NULL')
            ->orderBy('id')
            ->get(['id', 'name']);

        $triage = $areas->first(function ($area) {
            $name = mb_strtolower($area->name);

            return str_contains($name, 'mesa de ayuda')
                || str_contains($name, 'triage')
                || str_contains($name, 'nivel 1')
                || str_contains($name, 'soporte n1');
        });

        if ($triage) {
            return (int) $triage->id;
        }

        if ($fallbackAreaId && $areas->contains(fn ($area) => (int) $area->id === $fallbackAreaId)) {
            return $fallbackAreaId;
        }

        $first = $areas->first();
        if ($first) {
            return (int) $first->id;
        }

        throw new RuntimeException("Tenant {$clientId}: sin área activa disponible para enrutar el ticket.");
    }
}
