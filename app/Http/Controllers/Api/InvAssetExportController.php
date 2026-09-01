<?php

namespace App\Http\Controllers\Api;

use App\Exports\InvAssetExport;
use App\Enums\InvAssetOperationalState;
use App\Http\Controllers\Controller;
use App\Models\InvAsset;
use App\Models\InvCategory;
use App\Models\InvStatus;
use App\Services\ClientScopeService;
use App\Services\OperatorCatalogScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Export general de activos (fase 7.2, port desde HelpdeskECD2026 --
 * InventoryExportController). Mismos filtros que InvAssetController::index(),
 * más "assigned" (fase 7.2).
 */
class InvAssetExportController extends Controller
{
    public function __construct(
        protected ClientScopeService $clientScope,
        protected OperatorCatalogScopeService $catalogScope,
    ) {}

    public function __invoke(Request $request)
    {
        $user = Auth::user();

        $query = $this->clientScope->applyInventoryAssetScope(
            InvAsset::query()
                ->select(['id', 'internal_tag', 'name', 'serial', 'category_id', 'status_id', 'label_id', 'condition', 'site_id', 'location_id', 'current_user_id', 'cost', 'purchase_date', 'warranty_expiry', 'supplier', 'invoice_number', 'created_at'])
                ->with(['category', 'status', 'label', 'site', 'location', 'currentUser']),
            $user
        );

        $filterLabels = [];

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
            $filterLabels['category'] = $this->catalogScope
                ->apply(InvCategory::query(), $user, 'inv_categories')
                ->whereKey($request->input('category_id'))
                ->value('name');
        }
        if ($request->filled('status_id')) {
            $query->where('status_id', $request->input('status_id'));
            $filterLabels['status'] = $this->catalogScope
                ->apply(InvStatus::query(), $user, 'inv_statuses')
                ->whereKey($request->input('status_id'))
                ->value('name');
        }
        if ($request->filled('operational_state')) {
            $state = InvAssetOperationalState::tryFrom((string) $request->input('operational_state'));
            if (! $state) {
                return response()->json(['message' => 'El estado operativo seleccionado no es válido.'], 422);
            }
            $query->where('operational_state', $state->value);
            $filterLabels['operational_state'] = match ($state) {
                InvAssetOperationalState::AVAILABLE => 'Disponible',
                InvAssetOperationalState::ASSIGNED => 'Asignado',
                InvAssetOperationalState::MAINTENANCE => 'En mantenimiento',
                InvAssetOperationalState::RETIRED => 'Retirado',
                InvAssetOperationalState::LOST => 'Perdido',
                InvAssetOperationalState::STOLEN => 'Robado',
            };
        }
        if ($request->filled('site_id')) {
            $site = $this->clientScope->sitesQueryForUser($user)
                ->where('id', $request->input('site_id'))
                ->first(['name']);
            if (! $site) {
                return response()->json(['message' => 'La sede seleccionada no pertenece a tu alcance.'], 422);
            }
            $query->where('site_id', $request->input('site_id'));
            $filterLabels['site'] = $site->name;
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('internal_tag', 'like', "%{$search}%")
                    ->orWhere('serial', 'like', "%{$search}%");
            });
            $filterLabels['search'] = $search;
        }
        if ($request->filled('assigned')) {
            $assigned = $request->input('assigned') === '1';
            $assigned ? $query->whereNotNull('current_user_id') : $query->whereNull('current_user_id');
            $filterLabels['assigned'] = $assigned ? 'Asignados' : 'Sin asignar';
        }

        $assets = $query->orderBy('name')->get();

        $export = new InvAssetExport($assets, $filterLabels);
        $filename = 'activos_'.now()->format('Ymd_His').'.xlsx';
        $tempName = 'inv_asset_export_'.substr(uniqid('', true), -8).'.xlsx';
        $path = storage_path('app'.DIRECTORY_SEPARATOR.$tempName);
        $export->exportToPath($path);

        // Protege el binario Excel de basura previa en el buffer -- se
        // omite bajo PHPUnit, donde cerraría el buffer propio del test
        // runner (PHPUnit lo marca "risky": "closed output buffers other
        // than its own").
        if (! app()->runningUnitTests() && ob_get_length() > 0) {
            ob_end_clean();
        }

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
