<?php

namespace App\Http\Controllers\Inertia;

use App\Http\Controllers\Controller;
use App\Models\InvAsset;
use App\Models\User;
use App\Services\ClientScopeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Vista de asignación consolidada ("¿quién tiene qué?") -- pendiente del
 * roadmap original de fase 7, retomado aparte de la auditoría ITAM/CMDB.
 * Un solo query scoped + agregación en PHP, mismo criterio que
 * InvMonitorPageController::reports()->topAssignees (que solo muestra el
 * top 5 dentro de una gráfica); aquí se lista el roster completo.
 */
class InvAssetAssignmentPageController extends Controller
{
    private const ROSTER_PER_PAGE = 25;

    private const ASSET_PREVIEW_LIMIT = 250;

    public function __construct(protected ClientScopeService $clientScope) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();

        $scopedAssets = $this->clientScope->applyInventoryAssetScope(InvAsset::query(), $user)
            ->whereNotNull('inv_assets.current_user_id');

        $roster = User::query()->join('inv_assets', 'users.id', '=', 'inv_assets.current_user_id')
            ->whereIn('inv_assets.id', (clone $scopedAssets)->select('inv_assets.id'))
            ->selectRaw("users.id as user_id, trim(coalesce(users.first_name, '') || ' ' || coalesce(users.paternal_last_name, '') || ' ' || coalesce(users.maternal_last_name, '')) as user_name, count(inv_assets.id) as asset_count, coalesce(sum(inv_assets.cost), 0) as total_value")
            ->groupBy('users.id', 'users.first_name', 'users.paternal_last_name', 'users.maternal_last_name')
            ->orderByDesc('asset_count')
            ->paginate(self::ROSTER_PER_PAGE)->withQueryString();

        $userIds = $roster->getCollection()->pluck('user_id');
        $previews = InvAsset::query()
            ->whereIn('id', (clone $scopedAssets)->select('inv_assets.id'))
            ->whereIn('current_user_id', $userIds)
            ->with('category:id,name')
            ->orderBy('name')->limit(self::ASSET_PREVIEW_LIMIT)
            ->get(['id', 'current_user_id', 'name', 'internal_tag', 'category_id'])
            ->groupBy('current_user_id');

        $roster->getCollection()->transform(fn ($row) => [
            'user_id' => $row->user_id,
            'user_name' => $row->user_name ?: '—',
            'asset_count' => (int) $row->asset_count,
            'total_value' => round((float) $row->total_value, 2),
            'assets' => ($previews->get($row->user_id) ?? collect())->map(fn (InvAsset $asset) => [
                'id' => $asset->id, 'name' => $asset->name, 'internal_tag' => $asset->internal_tag,
                'category' => $asset->category?->name,
            ])->values(),
        ]);

        return Inertia::render('Inventory/Assignments', ['roster' => $roster]);
    }

    private function userLabel(?User $user): string
    {
        if (! $user) {
            return '—';
        }

        return trim(implode(' ', array_filter([$user->first_name, $user->paternal_last_name, $user->maternal_last_name])));
    }
}
