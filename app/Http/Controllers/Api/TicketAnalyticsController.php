<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\TicketState;
use App\Models\Area;
use App\Models\TicketType;
use App\Policies\TicketPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class TicketAnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'No autorizado'], 401);

        Gate::authorize('viewAny', Ticket::class);

        /** @var TicketPolicy $policy */
        $policy = app(TicketPolicy::class);
        $base = $policy->scopeFor($user, Ticket::query());
        $ticketIds = (clone $base)->pluck('id');

        $closedStateId = TicketState::where('name', 'like', '%cerrad%')->value('id');

        // Tickets por estado
        $statesMap = TicketState::pluck('name', 'id');
        $byState = (clone $base)
            ->select('ticket_state_id', DB::raw('count(*) as total'))
            ->groupBy('ticket_state_id')
            ->get()
            ->map(function ($row) use ($statesMap) {
                return [
                    'label' => $statesMap[$row->ticket_state_id] ?? 'Sin estado',
                    'value' => (int) $row->total,
                ];
            })
            ->values();

        // Tickets quemados
        $burnedCount = (clone $base)
            ->where('created_at', '<=', now()->subHours(72))
            ->when($closedStateId, fn($q) => $q->where('ticket_state_id', '!=', $closedStateId))
            ->count();

        // Áreas que más reciben (origen)
        $areasMap = Area::pluck('name', 'id');
        $areasReceive = (clone $base)
            ->select('area_origin_id', DB::raw('count(*) as total'))
            ->groupBy('area_origin_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => ['label' => $areasMap[$r->area_origin_id] ?? '—', 'value' => (int) $r->total]);

        // Áreas que más resuelven (estado cerrado)
        $areasResolve = (clone $base)
            ->when($closedStateId, fn($q) => $q->where('ticket_state_id', $closedStateId))
            ->select('area_current_id', DB::raw('count(*) as total'))
            ->groupBy('area_current_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => ['label' => $areasMap[$r->area_current_id] ?? '—', 'value' => (int) $r->total]);

        // Usuarios que más cierran (historial con estado cerrado)
        $resolvers = collect();
        if ($closedStateId && $ticketIds->isNotEmpty()) {
            $resolvers = TicketHistory::query()
                ->select('actor_id', DB::raw('count(*) as total'))
                ->where('ticket_state_id', $closedStateId)
                ->whereIn('ticket_id', $ticketIds)
                ->groupBy('actor_id')
                ->orderByDesc('total')
                ->limit(5)
                ->with('actor:id,name')
                ->get()
                ->map(fn($r) => ['label' => $r->actor->name ?? '—', 'value' => (int) $r->total]);
        }

        // Tipos más frecuentes (creación)
        $typesMap = TicketType::pluck('name', 'id');
        $typesFrequent = (clone $base)
            ->select('ticket_type_id', DB::raw('count(*) as total'))
            ->groupBy('ticket_type_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => ['label' => $typesMap[$r->ticket_type_id] ?? '—', 'value' => (int) $r->total]);

        // Tipos más resueltos (cerrados)
        $typesResolved = (clone $base)
            ->when($closedStateId, fn($q) => $q->where('ticket_state_id', $closedStateId))
            ->select('ticket_type_id', DB::raw('count(*) as total'))
            ->groupBy('ticket_type_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => ['label' => $typesMap[$r->ticket_type_id] ?? '—', 'value' => (int) $r->total]);

        return response()->json([
            'states' => $byState,
            'burned' => $burnedCount,
            'areas_receive' => $areasReceive,
            'areas_resolve' => $areasResolve,
            'top_resolvers' => $resolvers,
            'types_frequent' => $typesFrequent,
            'types_resolved' => $typesResolved,
        ]);
    }
}
