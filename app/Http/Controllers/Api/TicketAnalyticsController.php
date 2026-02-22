<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\TicketState;
use App\Models\Area;
use App\Models\TicketType;
use App\Policies\TicketPolicy;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class TicketAnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        Gate::authorize('viewAny', Ticket::class);

        $cacheKey = 'tickets.analytics.' . $user->id . '.' . md5($request->fullUrl());
        $payload = Cache::remember($cacheKey, now()->addSeconds(60), function () use ($request, $user) {
            /** @var TicketPolicy $policy */
            $policy = app(TicketPolicy::class);
            $base = $policy->scopeFor($user, Ticket::query());
            $this->applyFilters($request, $user, $base);

            $ticketIds = (clone $base)->pluck('id');

            $finalStateIds = TicketState::where('is_final', true)->pluck('id');
            $hasFinalStates = $finalStateIds->isNotEmpty();

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
                ->when($hasFinalStates, fn($q) => $q->whereNotIn('ticket_state_id', $finalStateIds))
                ->count();

            // Areas que mas reciben (origen)
            $areasMap = Area::pluck('name', 'id');
            $areasReceive = (clone $base)
                ->select('area_origin_id', DB::raw('count(*) as total'))
                ->groupBy('area_origin_id')
                ->orderByDesc('total')
                ->limit(5)
                ->get()
                ->map(fn($r) => ['label' => $areasMap[$r->area_origin_id] ?? '-', 'value' => (int) $r->total]);

            // Areas que mas resuelven (estado cerrado)
            $areasResolve = (clone $base)
                ->when($hasFinalStates, fn($q) => $q->whereIn('ticket_state_id', $finalStateIds))
                ->select('area_current_id', DB::raw('count(*) as total'))
                ->groupBy('area_current_id')
                ->orderByDesc('total')
                ->limit(5)
                ->get()
                ->map(fn($r) => ['label' => $areasMap[$r->area_current_id] ?? '-', 'value' => (int) $r->total]);

            // Usuarios que mas cierran (historial con estado cerrado)
            $resolvers = collect();
            if ($hasFinalStates && $ticketIds->isNotEmpty()) {
                $resolvers = TicketHistory::query()
                    ->select('actor_id', DB::raw('count(*) as total'))
                    ->whereIn('ticket_state_id', $finalStateIds)
                    ->whereIn('ticket_id', $ticketIds)
                    ->groupBy('actor_id')
                    ->orderByDesc('total')
                    ->limit(5)
                    ->with('actor:id,name')
                    ->get()
                    ->map(fn($r) => ['label' => $r->actor->name ?? '-', 'value' => (int) $r->total]);
            }

            // Tipos mas frecuentes (creacion)
            $typesMap = TicketType::pluck('name', 'id');
            $typesFrequent = (clone $base)
                ->select('ticket_type_id', DB::raw('count(*) as total'))
                ->groupBy('ticket_type_id')
                ->orderByDesc('total')
                ->limit(5)
                ->get()
                ->map(fn($r) => ['label' => $typesMap[$r->ticket_type_id] ?? '-', 'value' => (int) $r->total]);

            // Tipos mas resueltos (cerrados)
            $typesResolved = (clone $base)
                ->when($hasFinalStates, fn($q) => $q->whereIn('ticket_state_id', $finalStateIds))
                ->select('ticket_type_id', DB::raw('count(*) as total'))
                ->groupBy('ticket_type_id')
                ->orderByDesc('total')
                ->limit(5)
                ->get()
                ->map(fn($r) => ['label' => $typesMap[$r->ticket_type_id] ?? '-', 'value' => (int) $r->total]);

            return [
                'states' => $byState,
                'burned' => $burnedCount,
                'areas_receive' => $areasReceive,
                'areas_resolve' => $areasResolve,
                'top_resolvers' => $resolvers,
                'types_frequent' => $typesFrequent,
                'types_resolved' => $typesResolved,
            ];
        });

        return response()->json($payload);
    }

    protected function applyFilters(Request $request, $user, $query): void
    {
        $filters = [
            'area_current_id' => 'area_current_id',
            'area_origin_id' => 'area_origin_id',
            'sede_id' => 'sede_id',
            'ubicacion_id' => 'ubicacion_id',
            'ticket_type_id' => 'ticket_type_id',
            'priority_id' => 'priority_id',
            'ticket_state_id' => 'ticket_state_id',
        ];

        foreach ($filters as $param => $column) {
            if ($request->filled($param)) {
                if ($param === 'sede_id' && !$user->can('tickets.filter_by_sede') && !$user->can('tickets.manage_all')) {
                    continue;
                }
                $query->where($column, $request->input($param));
            }
        }

        if ($request->filled('date_from')) {
            try {
                $from = Carbon::parse($request->input('date_from'))->startOfDay();
                $query->where('created_at', '>=', $from);
            } catch (\Throwable $e) {
                // ignore invalid date_from
            }
        }

        if ($request->filled('date_to')) {
            try {
                $to = Carbon::parse($request->input('date_to'))->endOfDay();
                $query->where('created_at', '<=', $to);
            } catch (\Throwable $e) {
                // ignore invalid date_to
            }
        }
    }
}
