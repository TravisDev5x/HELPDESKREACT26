<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthorizesInvAssetAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvAssetRequest;
use App\Http\Requests\UpdateInvAssetRequest;
use App\Models\Client;
use App\Models\InvAsset;
use App\Models\InvCategory;
use App\Models\InvLabel;
use App\Models\InvManufacturer;
use App\Models\InvStatus;
use App\Models\Location;
use App\Models\User;
use App\Enums\InvAssetOperationalState;
use App\Services\OperatorCatalogScopeService;
use App\Services\Inventory\AssetSpecificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class InvAssetController extends Controller
{
    use AuthorizesInvAssetAccess;

    private const DETAIL_HISTORY_LIMIT = 50;

    private const DETAIL_MAINTENANCE_LIMIT = 25;

    public function index(Request $request)
    {
        $query = $this->clientScope()->applyInventoryAssetScope(
            InvAsset::query()->with(['category', 'manufacturer', 'status', 'label', 'site', 'location', 'currentUser']),
            Auth::user()
        );

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }
        if ($request->filled('status_id')) {
            $query->where('status_id', $request->input('status_id'));
        }
        if ($request->filled('operational_state')) {
            $query->where('operational_state', $request->input('operational_state'));
        }
        if ($request->filled('site_id')) {
            $query->where('site_id', $request->input('site_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('internal_tag', 'like', "%{$search}%")
                    ->orWhere('serial', 'like', "%{$search}%")
                    ->orWhereHas('currentUser', fn ($users) => $users
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('assigned')) {
            $request->input('assigned') === '1'
                ? $query->whereNotNull('current_user_id')
                : $query->whereNull('current_user_id');
        }
        if ($request->filled('user_id')) {
            $query->where('current_user_id', $request->input('user_id'));
        }

        return $query->orderBy('name')->paginate(25);
    }

    /**
     * Selector remoto de responsables. Evita enviar todos los usuarios del
     * cliente en los props de Inventario y conserva el mismo scope de tenant
     * que usan las operaciones de asignación.
     */
    public function assignees(Request $request)
    {
        $actor = Auth::user();
        $clientId = $this->clientScope()->resolveUserClientId($actor);
        $search = trim((string) $request->input('search', ''));

        $query = User::query()
            ->with(['area:id,name', 'site:id,name'])
            ->where('client_id', $clientId)
            ->where('status', 'active');

        if ($search !== '') {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_substr($search, 0, 100)).'%';
            $query->where(function ($users) use ($term) {
                $users->where('name', 'like', $term)
                    ->orWhere('first_name', 'like', $term)
                    ->orWhere('paternal_last_name', 'like', $term)
                    ->orWhere('maternal_last_name', 'like', $term)
                    ->orWhere('email', 'like', $term);
            });
        }

        return $query->orderBy('first_name')->limit(15)->get([
            'id', 'first_name', 'paternal_last_name', 'maternal_last_name',
            'email', 'area_id', 'site_id', 'avatar_path',
        ]);
    }

    public function show(InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);

        // Detalle completo (fase de modal de detalle) -- el activo se ve en
        // un diálogo montado sobre Index.jsx, no una página aparte; este
        // endpoint es ahora la única fuente de datos para esa vista, mismas
        // relaciones que antes cargaba InvAssetPageController::show().
        $asset = $inv_asset->load([
            'category', 'manufacturer', 'status', 'label', 'site', 'location', 'currentUser', 'images', 'specs', 'documents',
            'warranties' => fn ($q) => $q->orderByDesc('ends_at'),
            'disposal' => fn ($q) => $q->with('authorizedBy'),
            // Tickets relacionados (fase 3.1) -- lado inverso, solo lectura.
            'ticketLinks' => fn ($q) => $q->with(['ticket:id,folio,subject,ticket_state_id'])->with('ticket.state:id,name,code')->orderByDesc('created_at'),
            // Relaciones entre activos (fase 3.2, CMDB).
            'childRelationships' => fn ($q) => $q->with('childAsset:id,name,internal_tag'),
            'parentRelationships' => fn ($q) => $q->with('parentAsset:id,name,internal_tag'),
            // La línea de tiempo puede crecer indefinidamente. El endpoint
            // dedicado de movimientos conserva paginación para continuarla.
            'movements' => fn ($q) => $q->with(['user', 'previousUser', 'admin'])->orderByDesc('date')->limit(self::DETAIL_HISTORY_LIMIT),
            'components' => fn ($q) => $q->orderBy('name'),
            'maintenances' => fn ($q) => $q->with(['origin', 'modality'])->orderByDesc('start_date')->limit(self::DETAIL_MAINTENANCE_LIMIT),
        ]);

        // La interfaz consume esta lista como pista UX; los controladores de
        // movimientos/mantenimiento siguen siendo la autoridad final.
        $asset->setAttribute('allowed_actions', $this->allowedActions($asset));
        // Fallback temporal de lectura: mientras haya JSON histórico no
        // migrado, el cliente puede mostrarlo sin tratarlo como fuente para
        // nuevas escrituras. El comando de migración conserva el original.
        if ($asset->getRelation('specs')->isEmpty() && filled($asset->getRawOriginal('specs'))) {
            $asset->setAttribute('legacy_specs', $asset->getRawOriginal('specs'));
        }

        return $asset;
    }

    public function store(StoreInvAssetRequest $request)
    {
        $user = Auth::user();
        $data = $request->validated();
        $specs = $data['specs'] ?? null;
        unset($data['specs']);

        if ($error = $this->requiredSpecsError((int) $data['category_id'], $specs)) {
            return response()->json(['message' => $error], 422);
        }

        if (! $this->clientScope()->assertSiteAccessible($user, (int) $data['site_id'])) {
            return response()->json(['message' => 'La sede seleccionada no pertenece a tu cliente'], 422);
        }
        if ($error = $this->relatedEntityError($user, $data)) {
            return response()->json(['message' => $error], 422);
        }
        $data['client_id'] = $this->clientScope()->syncClientIdFromSite((int) $data['site_id']);

        if ($quotaError = $this->assertAssetQuota((int) $data['client_id'])) {
            return response()->json(['message' => $quotaError], 422);
        }

        $data['uuid'] = $data['uuid'] ?? (string) Str::uuid();

        $asset = InvAsset::create($data);
        app(AssetSpecificationService::class)->sync($asset, $specs);

        return response()->json($asset->load(['category', 'manufacturer', 'status', 'label', 'site', 'location', 'specs']), 201);
    }

    public function update(UpdateInvAssetRequest $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $user = Auth::user();
        $data = $request->validated();
        // La ausencia de `specs` significa que esta edición no cargó ni
        // pretende tocar la ficha técnica. Solo una clave enviada de forma
        // explícita (incluido [] para vaciarla) autoriza sincronizarla.
        $hasSpecsPayload = array_key_exists('specs', $data);
        $specs = $hasSpecsPayload ? $data['specs'] : null;
        unset($data['specs']);

        if ($hasSpecsPayload && ($error = $this->requiredSpecsError((int) $data['category_id'], $specs))) {
            return response()->json(['message' => $error], 422);
        }

        if (! $this->clientScope()->assertSiteAccessible($user, (int) $data['site_id'])) {
            return response()->json(['message' => 'La sede seleccionada no pertenece a tu cliente'], 422);
        }
        if ($error = $this->relatedEntityError($user, $data)) {
            return response()->json(['message' => $error], 422);
        }
        if ((int) ($data['location_id'] ?? 0) !== (int) ($inv_asset->location_id ?? 0)) {
            return response()->json(['message' => 'Usa la acción Trasladar para cambiar la ubicación.'], 422);
        }

        $data['client_id'] = $this->clientScope()->syncClientIdFromSite((int) $data['site_id']);

        $inv_asset->update($data);
        if ($hasSpecsPayload) {
            app(AssetSpecificationService::class)->sync($inv_asset, $specs);
        }

        return response()->json($inv_asset->load(['category', 'manufacturer', 'status', 'label', 'site', 'location', 'specs']));
    }

    public function destroy(InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $inv_asset->delete();

        return response()->noContent();
    }

    /** Cuota de activos por plan (ver plan "Cuota de activos por plan") -- null si no hay límite o no se alcanzó. */
    private function assertAssetQuota(int $clientId): ?string
    {
        $max = Client::find($clientId)?->plan?->max_assets;
        if ($max === null) {
            return null;
        }

        $used = InvAsset::where('client_id', $clientId)->count();
        if ($used >= $max) {
            return "Alcanzaste el límite de activos de tu plan ({$max}). Contacta a soporte para ampliarlo.";
        }

        return null;
    }

    /** Valida relaciones manipulables sin confiar en los selects del frontend. */
    private function relatedEntityError(User $user, array $data): ?string
    {
        if (! empty($data['location_id']) && ! Location::query()
            ->whereKey($data['location_id'])
            ->where('site_id', $data['site_id'])
            ->exists()) {
            return 'La ubicación seleccionada no pertenece a la sede elegida.';
        }

        $catalogs = [
            'category_id' => [InvCategory::class, 'inv_categories', 'La categoría seleccionada no pertenece a tu alcance.'],
            'status_id' => [InvStatus::class, 'inv_statuses', 'El estatus seleccionado no pertenece a tu alcance.'],
            'manufacturer_id' => [InvManufacturer::class, 'inv_manufacturers', 'El fabricante seleccionado no pertenece a tu alcance.'],
            'label_id' => [InvLabel::class, 'inv_labels', 'La etiqueta seleccionada no pertenece a tu alcance.'],
        ];
        $scope = app(OperatorCatalogScopeService::class);

        foreach ($catalogs as $field => [$model, $table, $message]) {
            if (empty($data[$field])) {
                continue;
            }
            if (! $scope->apply($model::query(), $user, $table)->whereKey($data[$field])->exists()) {
                return $message;
            }
        }

        return null;
    }

    /** `require_specs` significa al menos un valor del schema de su macro-tipo. */
    private function requiredSpecsError(int $categoryId, ?array $specs): ?string
    {
        $category = InvCategory::query()->find($categoryId);
        if (! $category?->require_specs) {
            return null;
        }

        return app(AssetSpecificationService::class)->hasRequiredSpecs($category, $specs)
            ? null
            : 'Esta categoría requiere capturar al menos una especificación técnica.';
    }

    /** @return array<int, string> */
    private function allowedActions(InvAsset $asset): array
    {
        $state = $asset->operational_state ?? InvAssetOperationalState::AVAILABLE;

        return match ($state) {
            InvAssetOperationalState::AVAILABLE => ['assign', 'transfer', 'maintenance', 'retire'],
            InvAssetOperationalState::ASSIGNED => ['return', 'reassign', 'transfer', 'retire'],
            InvAssetOperationalState::MAINTENANCE => $asset->maintenances->contains(fn ($maintenance) => $maintenance->end_date === null)
                ? ['close_maintenance']
                : [],
            default => [],
        };
    }
}
