<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvAssetOperationalState;
use App\Enums\InvMovementType;
use App\Http\Controllers\Concerns\AuthorizesInvAssetAccess;
use App\Http\Controllers\Concerns\AuthorizesInvMaintenanceAccess;
use App\Http\Controllers\Controller;
use App\Models\InvAsset;
use App\Models\InvMaintenance;
use App\Models\InvMaintenanceModality;
use App\Models\InvMaintenanceOrigin;
use App\Models\InvMovement;
use App\Models\User;
use App\Services\OperatorCatalogScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Mantenimientos de activos (fase 5, port desde HelpdeskECD2026). A
 * diferencia del ciclo de vida (fase 3, InvMovementController), SÍ tiene
 * update/destroy -- inv_maintenances no es una bitácora inmutable, es un
 * recurso editable (se abre, se documenta, se cierra). Abrir uno genera un
 * InvMovement tipo MAINTENANCE para que aparezca en el historial unificado
 * del activo; cerrar (update con end_date) no duplica un movimiento nuevo.
 */
class InvMaintenanceController extends Controller
{
    use AuthorizesInvAssetAccess;
    use AuthorizesInvMaintenanceAccess {
        AuthorizesInvMaintenanceAccess::clientScope insteadof AuthorizesInvAssetAccess;
    }

    public function index(Request $request)
    {
        $query = $this->clientScope()->applyInventoryMaintenanceScope(
            InvMaintenance::query()->with(['asset', 'origin', 'modality', 'loggedBy']),
            Auth::user()
        );

        if ($request->filled('asset_id')) {
            $query->where('asset_id', $request->input('asset_id'));
        }
        if ($request->input('open') === '1') {
            $query->open();
        }
        if ($request->input('closed') === '1') {
            $query->closed();
        }

        return $query->orderByDesc('start_date')->paginate(25);
    }

    public function show(InvMaintenance $inv_maintenance)
    {
        $this->authorizeMaintenanceAccess($inv_maintenance);

        return $inv_maintenance->load(['asset', 'origin', 'modality', 'loggedBy']);
    }

    public function store(Request $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $user = Auth::user();

        if ($inv_asset->current_user_id) {
            return response()->json(['message' => 'Devuelve el activo antes de registrar un mantenimiento.'], 422);
        }
        if ($inv_asset->operational_state !== InvAssetOperationalState::AVAILABLE) {
            return response()->json(['message' => 'El estado operativo actual del activo no permite iniciar mantenimiento.'], 422);
        }
        if ($inv_asset->maintenances()->whereNull('end_date')->exists()) {
            return response()->json(['message' => 'El activo ya tiene un mantenimiento abierto.'], 422);
        }

        $data = $request->validate([
            'origin_id' => 'nullable|exists:inv_maintenance_origins,id',
            'modality_id' => 'nullable|exists:inv_maintenance_modalities,id',
            'title' => 'required|string|max:255',
            'diagnosis' => 'nullable|string|max:2000',
            'solution' => 'nullable|string|max:2000',
            'cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);
        if ($error = $this->catalogRelationError($user, $data)) {
            return response()->json(['message' => $error], 422);
        }
        if (! empty($data['end_date'])) {
            return response()->json(['message' => 'Un mantenimiento nuevo debe iniciarse abierto; ciérralo mediante su flujo específico.'], 422);
        }

        $maintenance = DB::transaction(function () use ($inv_asset, $data, $user) {
            $maintenance = InvMaintenance::create([
                ...$data,
                'asset_id' => $inv_asset->id,
                'logged_by' => $user->id,
                'client_id' => $inv_asset->client_id,
            ]);

            InvMovement::create([
                'asset_id' => $inv_asset->id,
                'type' => InvMovementType::MAINTENANCE_START->value,
                'admin_id' => $user->id,
                'notes' => $data['title'],
                'metadata' => ['maintenance_id' => $maintenance->id],
                'client_id' => $inv_asset->client_id,
                'date' => now(),
            ]);

            $inv_asset->update(['operational_state' => InvAssetOperationalState::MAINTENANCE]);

            return $maintenance;
        });

        return response()->json($maintenance->load(['asset', 'origin', 'modality', 'loggedBy']), 201);
    }

    public function update(Request $request, InvMaintenance $inv_maintenance)
    {
        $this->authorizeMaintenanceAccess($inv_maintenance);
        $user = Auth::user();

        $data = $request->validate([
            'origin_id' => 'nullable|exists:inv_maintenance_origins,id',
            'modality_id' => 'nullable|exists:inv_maintenance_modalities,id',
            'title' => 'required|string|max:255',
            'diagnosis' => 'nullable|string|max:2000',
            'solution' => 'nullable|string|max:2000',
            'cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);
        if ($error = $this->catalogRelationError($user, $data)) {
            return response()->json(['message' => $error], 422);
        }

        $isClosing = $inv_maintenance->end_date === null && ! empty($data['end_date']);
        if ($inv_maintenance->end_date !== null && ! empty($data['end_date'])) {
            return response()->json(['message' => 'Este mantenimiento ya fue cerrado.'], 422);
        }

        if ($isClosing) {
            $asset = $inv_maintenance->asset;
            if ($asset->operational_state !== InvAssetOperationalState::MAINTENANCE || $asset->current_user_id) {
                return response()->json(['message' => 'El activo no está en un estado válido para cerrar este mantenimiento.'], 422);
            }

            DB::transaction(function () use ($inv_maintenance, $asset, $data, $user) {
                $inv_maintenance->update($data);
                $asset->update(['operational_state' => InvAssetOperationalState::AVAILABLE]);
                InvMovement::create([
                    'asset_id' => $asset->id,
                    'type' => InvMovementType::MAINTENANCE_END->value,
                    'admin_id' => $user->id,
                    'notes' => $data['solution'] ?? null,
                    'metadata' => ['maintenance_id' => $inv_maintenance->id],
                    'client_id' => $asset->client_id,
                    'date' => now(),
                ]);
            });
        } else {
            $inv_maintenance->update($data);
        }

        return response()->json($inv_maintenance->load(['asset', 'origin', 'modality', 'loggedBy']));
    }

    public function destroy(InvMaintenance $inv_maintenance)
    {
        $this->authorizeMaintenanceAccess($inv_maintenance);
        if ($inv_maintenance->end_date === null) {
            return response()->json(['message' => 'No puedes eliminar un mantenimiento abierto; ciérralo primero.'], 422);
        }
        $inv_maintenance->delete();

        return response()->noContent();
    }

    private function catalogRelationError(User $user, array $data): ?string
    {
        $catalogs = [
            'origin_id' => [InvMaintenanceOrigin::class, 'inv_maintenance_origins', 'El origen de mantenimiento no pertenece a tu alcance.'],
            'modality_id' => [InvMaintenanceModality::class, 'inv_maintenance_modalities', 'La modalidad de mantenimiento no pertenece a tu alcance.'],
        ];
        $scope = app(OperatorCatalogScopeService::class);

        foreach ($catalogs as $field => [$model, $table, $message]) {
            if (! empty($data[$field]) && ! $scope->apply($model::query(), $user, $table)->whereKey($data[$field])->exists()) {
                return $message;
            }
        }

        return null;
    }
}
