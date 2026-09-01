<?php

namespace App\Http\Controllers\Inertia;

use App\Http\Controllers\Controller;
use App\Models\InvAsset;
use App\Models\User;
use App\Services\ClientScopeService;
use App\Services\InvMonitorAlertsService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Dashboard de alertas y reportes de Inventario (fase 7.1 alertas, port
 * desde HelpdeskECD2026 -- página estática por request, sin filtros, se
 * sirve como props ya calculadas en el Inertia::render, a diferencia de
 * TicketAnalyticsController (que sí necesita cache+axios por tener
 * filtros dinámicos). wallboard() reusa los mismos props para la versión
 * standalone (/inventory/wallboard), mismo patrón que
 * ResolbebIndexController/Resolbeb/Wallboard.jsx del lado de Tickets.
 * De las 5 alertas del original se portan 4 --
 * "activos sin empresa" no aplica aquí: inv_assets.client_id es NOT NULL
 * a nivel de columna, ese estado es estructuralmente imposible. Las
 * queries de alertas viven en InvMonitorAlertsService (fase 7.2 las
 * compartió con el export del monitor).
 *
 * Reportes (fase posterior): el original NO tiene gráficos -- son 4
 * DataTables sobre el modelo V1 legacy `Product`, sin equivalente directo
 * en las tablas V2 que Tikara portó. Se diseñaron reportes propios sobre
 * el esquema real de Tikara (por categoría/estatus/sede, top responsables,
 * costo por categoría, tendencia de altas por mes), agregados en memoria
 * igual que InvAssetExport::buildByCategorySheet()/buildByStatusSheet() --
 * sin servicio de analíticas aparte, mismo criterio que TicketAnalyticsController.
 */
class InvMonitorPageController extends Controller
{
    public function __construct(
        protected InvMonitorAlertsService $alerts,
        protected ClientScopeService $clientScope
    ) {}

    public function __invoke(): Response
    {
        return Inertia::render('Inventory/Monitor', $this->props(Auth::user()));
    }

    /**
     * Wallboard (fase siguiente a 7.4, mismo patrón que Resolbeb/Wallboard):
     * mismos props que /inventory/monitor, en una página standalone sin
     * layout -- pensada para abrirse en un monitor/TV aparte.
     */
    public function wallboard(): Response
    {
        return Inertia::render('Inventory/Wallboard', $this->props(Auth::user()));
    }

    private function props(User $user): array
    {
        return [
            'warrantyExpiring' => $this->alerts->warrantyExpiring($user),
            'unassigned' => $this->alerts->unassigned($user),
            'repeatedTransfers' => $this->alerts->repeatedTransfers($user),
            'staleMaintenances' => $this->alerts->staleMaintenances($user),
            'problemAssets' => $this->alerts->problemAssets($user),
            ...$this->reports($user),
        ];
    }

    private function reports(User $user): array
    {
        $base = $this->clientScope->applyInventoryAssetScope(InvAsset::query(), $user);
        // El scope existente contiene columnas sin prefijo para funcionar en
        // todos los controladores. Lo aislamos en una subconsulta antes de
        // hacer joins de analítica, evitando ambigüedad y sin abrir tenants.
        $assetIds = (clone $base)->select('inv_assets.id');
        $byCategory = $this->groupedReport(clone $assetIds, 'inv_categories', 'category_id', 'Sin categoría');
        $byStatus = $this->groupedReport(clone $assetIds, 'inv_statuses', 'status_id', 'Sin estatus');
        $bySite = $this->groupedReport(clone $assetIds, 'sites', 'site_id', 'Sin sede');

        $topAssignees = InvAsset::query()->whereIn('inv_assets.id', clone $assetIds)->whereNotNull('inv_assets.current_user_id')
            ->leftJoin('users', 'users.id', '=', 'inv_assets.current_user_id')
            ->selectRaw("inv_assets.current_user_id as user_id, trim(coalesce(users.first_name, '') || ' ' || coalesce(users.paternal_last_name, '') || ' ' || coalesce(users.maternal_last_name, '')) as label, count(*) as value")
            ->groupBy('inv_assets.current_user_id', 'users.first_name', 'users.paternal_last_name', 'users.maternal_last_name')
            ->orderByDesc('value')->limit(5)->get()
            ->map(fn ($row) => ['user_id' => $row->user_id, 'label' => $row->label ?: '—', 'value' => (int) $row->value])->values();

        $totalValue = round((float) (clone $base)->sum('cost'), 2);
        $costByCategory = $this->groupedReport(clone $assetIds, 'inv_categories', 'category_id', 'Sin categoría', true);
        $monthlyTrend = $this->monthlyTrend(clone $base);

        return compact('byCategory', 'byStatus', 'bySite', 'topAssignees', 'totalValue', 'costByCategory', 'monthlyTrend');
    }

    /** Altas de activos por mes, últimos 6 meses (incluye meses en cero, para que la tendencia se vea completa). */
    private function groupedReport($assetIds, string $table, string $foreignKey, string $fallback, bool $sumCost = false)
    {
        $aggregate = $sumCost ? 'coalesce(sum(inv_assets.cost), 0)' : 'count(*)';

        return InvAsset::query()->whereIn('inv_assets.id', $assetIds)
            ->leftJoin($table, "{$table}.id", '=', "inv_assets.{$foreignKey}")
            ->selectRaw("coalesce({$table}.name, ?) as label, {$aggregate} as value", [$fallback])
            ->groupBy("{$table}.name")
            ->orderByDesc('value')->get()
            ->map(fn ($row) => ['label' => $row->label, 'value' => $sumCost ? round((float) $row->value, 2) : (int) $row->value])
            ->values();
    }

    private function monthlyTrend($query): array
    {
        static $meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        return collect(range(5, 0))
            ->map(function (int $i) use ($query, $meses) {
                $month = now()->subMonths($i)->startOfMonth();
                $count = (clone $query)->whereBetween('created_at', [$month, $month->copy()->endOfMonth()])->count();

                return ['label' => $meses[$month->month - 1].' '.$month->format('Y'), 'value' => $count];
            })
            ->values()
            ->all();
    }

    private function userLabel(?User $user): string
    {
        if (! $user) {
            return '—';
        }

        return trim(implode(' ', array_filter([$user->first_name, $user->paternal_last_name, $user->maternal_last_name])));
    }
}
