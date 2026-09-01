<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvAssetOperationalState;
use App\Enums\InvMovementType;
use App\Http\Controllers\Concerns\AuthorizesInvAssetAccess;
use App\Http\Controllers\Controller;
use App\Models\InvAsset;
use App\Models\InvDisposal;
use App\Models\InvMaintenance;
use App\Models\InvMovement;
use App\Models\InvStatus;
use App\Models\Location;
use App\Models\Site;
use App\Models\User;
use App\Services\OperatorCatalogScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Acciones del ciclo de vida de un activo (fase 3, port desde
 * HelpdeskECD2026): asignar/devolver/trasladar/dar de baja. Sin
 * update/destroy a propósito -- inv_movements es una bitácora inmutable,
 * igual que en Helpdesk (ver plan).
 */
class InvMovementController extends Controller
{
    use AuthorizesInvAssetAccess;

    private const DEFAULT_PER_PAGE = 25;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);

        $perPage = min(max((int) $request->input('per_page', self::DEFAULT_PER_PAGE), 1), self::MAX_PER_PAGE);

        return $inv_asset->movements()
            ->with(['user', 'previousUser', 'admin'])
            ->orderByDesc('date')
            ->paginate($perPage);
    }

    public function checkout(Request $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $user = Auth::user();

        $data = $request->validate([
            'user_id' => [
                'required',
                'exists:users,id',
            ],
            'notes' => 'nullable|string|max:2000',
        ]);

        $target = User::find($data['user_id']);
        if (! $target || (int) $target->client_id !== (int) $inv_asset->client_id) {
            return response()->json(['message' => 'El usuario seleccionado no pertenece a tu cliente'], 422);
        }

        if (InvMaintenance::query()->where('asset_id', $inv_asset->id)->whereNull('end_date')->exists()) {
            return response()->json(['message' => 'El activo tiene un mantenimiento abierto y no puede asignarse.'], 422);
        }
        if ($inv_asset->operational_state !== InvAssetOperationalState::AVAILABLE || $inv_asset->current_user_id) {
            return response()->json(['message' => 'El activo no está disponible para asignación.'], 422);
        }
        $inv_asset->loadMissing('status');
        if ($inv_asset->status && ! $inv_asset->status->assignable) {
            return response()->json(['message' => 'El estatus actual del activo no permite asignarlo'], 422);
        }

        $movement = DB::transaction(function () use ($inv_asset, $data, $user) {
            $movement = InvMovement::create([
                'asset_id' => $inv_asset->id,
                'type' => InvMovementType::CHECKOUT->value,
                'user_id' => $data['user_id'],
                'previous_user_id' => $inv_asset->current_user_id,
                'admin_id' => $user->id,
                'notes' => $data['notes'] ?? null,
                'client_id' => $inv_asset->client_id,
                'date' => now(),
            ]);

            $inv_asset->update([
                'current_user_id' => $data['user_id'],
                'operational_state' => InvAssetOperationalState::ASSIGNED,
            ]);

            return $movement;
        });

        return response()->json($movement->load(['user', 'previousUser', 'admin']), 201);
    }

    public function checkin(Request $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $user = Auth::user();

        if ($inv_asset->operational_state !== InvAssetOperationalState::ASSIGNED || ! $inv_asset->current_user_id) {
            return response()->json(['message' => 'Este activo no tiene un responsable asignado'], 422);
        }

        $data = $request->validate([
            'notes' => 'nullable|string|max:2000',
        ]);

        $movement = DB::transaction(function () use ($inv_asset, $data, $user) {
            $movement = InvMovement::create([
                'asset_id' => $inv_asset->id,
                'type' => InvMovementType::CHECKIN->value,
                'user_id' => $inv_asset->current_user_id,
                'previous_user_id' => null,
                'admin_id' => $user->id,
                'notes' => $data['notes'] ?? null,
                'client_id' => $inv_asset->client_id,
                'date' => now(),
            ]);

            $inv_asset->update([
                'current_user_id' => null,
                'operational_state' => InvAssetOperationalState::AVAILABLE,
            ]);

            return $movement;
        });

        return response()->json($movement->load(['user', 'previousUser', 'admin']), 201);
    }

    public function reassign(Request $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $user = Auth::user();

        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'notes' => 'nullable|string|max:2000',
        ]);
        $target = User::find($data['user_id']);

        if (! $target || (int) $target->client_id !== (int) $inv_asset->client_id) {
            return response()->json(['message' => 'El usuario seleccionado no pertenece a tu cliente'], 422);
        }
        if ($inv_asset->operational_state !== InvAssetOperationalState::ASSIGNED || ! $inv_asset->current_user_id) {
            return response()->json(['message' => 'El activo debe estar asignado para reasignarse.'], 422);
        }
        if ((int) $inv_asset->current_user_id === (int) $target->id) {
            return response()->json(['message' => 'El activo ya está asignado a este usuario.'], 422);
        }

        $movement = DB::transaction(function () use ($inv_asset, $data, $user) {
            $movement = InvMovement::create([
                'asset_id' => $inv_asset->id,
                'type' => InvMovementType::REASSIGN->value,
                'user_id' => $data['user_id'],
                'previous_user_id' => $inv_asset->current_user_id,
                'admin_id' => $user->id,
                'notes' => $data['notes'] ?? null,
                'client_id' => $inv_asset->client_id,
                'date' => now(),
            ]);

            $inv_asset->update(['current_user_id' => $data['user_id']]);

            return $movement;
        });

        return response()->json($movement->load(['user', 'previousUser', 'admin']), 201);
    }

    public function transfer(Request $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $user = Auth::user();

        $data = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'location_id' => 'nullable|exists:locations,id',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (! $inv_asset->operational_state->canBeTransferred()) {
            return response()->json(['message' => 'El estado operativo actual del activo no permite trasladarlo.'], 422);
        }

        if (! $this->clientScope()->assertSiteAccessible($user, (int) $data['site_id'])) {
            return response()->json(['message' => 'La sede seleccionada no pertenece a tu cliente'], 422);
        }
        if (! empty($data['location_id']) && ! Location::query()
            ->whereKey($data['location_id'])
            ->where('site_id', $data['site_id'])
            ->exists()) {
            return response()->json(['message' => 'La ubicación seleccionada no pertenece a la sede elegida.'], 422);
        }

        $fromSiteName = optional(Site::find($inv_asset->site_id))->name;
        $toSiteName = optional(Site::find($data['site_id']))->name;
        $fromLocationName = optional(Location::find($inv_asset->location_id))->name;
        $toLocationName = ! empty($data['location_id'])
            ? Location::query()->whereKey($data['location_id'])->value('name')
            : null;

        $movement = DB::transaction(function () use ($inv_asset, $data, $user, $fromSiteName, $toSiteName, $fromLocationName, $toLocationName) {
            $movement = InvMovement::create([
                'asset_id' => $inv_asset->id,
                'type' => InvMovementType::TRANSFER->value,
                'admin_id' => $user->id,
                'notes' => $data['notes'] ?? null,
                'metadata' => [
                    'from_site_id' => $inv_asset->site_id,
                    'from_site_name' => $fromSiteName,
                    'to_site_id' => $data['site_id'],
                    'to_site_name' => $toSiteName,
                    'from_location_id' => $inv_asset->location_id,
                    'from_location_name' => $fromLocationName,
                    'to_location_id' => $data['location_id'] ?? null,
                    'to_location_name' => $toLocationName,
                ],
                'client_id' => $inv_asset->client_id,
                'date' => now(),
            ]);

            $inv_asset->update([
                'site_id' => $data['site_id'],
                'location_id' => $data['location_id'] ?? null,
            ]);

            return $movement;
        });

        return response()->json($movement->load(['user', 'previousUser', 'admin']), 201);
    }

    /**
     * Métodos de disposición (auditoría de Inventario, fase 2.2) --
     * `retire()` antes solo pedía un `reason` de texto libre, sin nada
     * estructurado para reportar "cuántas bajas por robo/venta/etc.".
     */
    public function retire(Request $request, InvAsset $inv_asset)
    {
        $this->authorizeAssetAccess($inv_asset);
        $user = Auth::user();

        $data = $request->validate([
            'status_id' => 'required|exists:inv_statuses,id',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string|max:2000',
            'method' => ['required', new \Illuminate\Validation\Rules\Enum(\App\Enums\InvAssetDisposalMethod::class)],
            'authorized_by' => 'nullable|exists:users,id',
            'residual_value' => 'nullable|numeric|min:0',
        ]);

        if ($inv_asset->operational_state->isTerminal()) {
            return response()->json(['message' => 'El activo ya se encuentra fuera de operación.'], 422);
        }

        $status = app(OperatorCatalogScopeService::class)
            ->apply(InvStatus::query(), $user, 'inv_statuses')
            ->whereKey($data['status_id'])
            ->first();
        if (! $status) {
            return response()->json(['message' => 'El estatus seleccionado no pertenece a tu alcance.'], 422);
        }
        if ($status->assignable) {
            return response()->json(['message' => 'Elige un estatus marcado como no asignable para dar de baja'], 422);
        }

        if (! empty($data['authorized_by']) && ! $this->clientScope()->assertUserAccessible($user, (int) $data['authorized_by'])) {
            return response()->json(['message' => 'El usuario seleccionado no pertenece a tu cliente'], 422);
        }
        if (InvMaintenance::query()->where('asset_id', $inv_asset->id)->whereNull('end_date')->exists()) {
            return response()->json(['message' => 'Cierra el mantenimiento abierto antes de dar de baja el activo.'], 422);
        }
        if ($inv_asset->operational_state === InvAssetOperationalState::MAINTENANCE) {
            return response()->json(['message' => 'El activo en mantenimiento no puede darse de baja.'], 422);
        }

        $method = \App\Enums\InvAssetDisposalMethod::from($data['method']);
        $nextState = $method->operationalState();

        $movement = DB::transaction(function () use ($inv_asset, $data, $user, $nextState) {
            $movement = InvMovement::create([
                'asset_id' => $inv_asset->id,
                'type' => $nextState->disposalMovementType()->value,
                'user_id' => $inv_asset->current_user_id,
                'previous_user_id' => null,
                'admin_id' => $user->id,
                'reason' => $data['reason'],
                'notes' => $data['notes'] ?? null,
                'metadata' => [
                    'from_operational_state' => $inv_asset->operational_state->value,
                    'to_operational_state' => $nextState->value,
                    'disposal_method' => $data['method'],
                ],
                'client_id' => $inv_asset->client_id,
                'date' => now(),
            ]);

            $inv_asset->update([
                'status_id' => $data['status_id'],
                'current_user_id' => null,
                'operational_state' => $nextState,
            ]);

            InvDisposal::create([
                'asset_id' => $inv_asset->id,
                'movement_id' => $movement->id,
                'method' => $data['method'],
                'authorized_by' => $data['authorized_by'] ?? null,
                'residual_value' => $data['residual_value'] ?? null,
                'client_id' => $inv_asset->client_id,
            ]);

            return $movement;
        });

        return response()->json($movement->load(['user', 'previousUser', 'admin']), 201);
    }
}
