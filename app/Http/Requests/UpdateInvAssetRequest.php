<?php

namespace App\Http\Requests;

use App\Enums\InvAssetCondition;
use App\Models\Site;
use App\Services\ClientScopeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInvAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $asset = $this->route('inv_asset');
        $user = Auth::user();

        return $asset && $user && app(ClientScopeService::class)
            ->applyInventoryAssetScope(\App\Models\InvAsset::query()->whereKey($asset->id), $user)
            ->exists();
    }

    public function rules(): array
    {
        $asset = $this->route('inv_asset');
        $clientId = $this->filled('site_id')
            ? Site::where('id', $this->input('site_id'))->value('client_id')
            : $asset->client_id;

        return [
            'uuid' => ['nullable', 'uuid', Rule::unique('inv_assets', 'uuid')->where('client_id', $clientId)->ignore($asset->id)],
            'internal_tag' => ['required', 'string', 'max:255', Rule::unique('inv_assets', 'internal_tag')->where('client_id', $clientId)->ignore($asset->id)],
            'serial' => ['nullable', 'string', 'max:255', Rule::unique('inv_assets', 'serial')->where('client_id', $clientId)->ignore($asset->id)],
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:inv_categories,id',
            'manufacturer_id' => 'nullable|exists:inv_manufacturers,id',
            'model' => 'nullable|string|max:255',
            'status_id' => 'required|exists:inv_statuses,id',
            'label_id' => 'nullable|exists:inv_labels,id',
            'condition' => ['nullable', new \Illuminate\Validation\Rules\Enum(InvAssetCondition::class)],
            'site_id' => 'required|exists:sites,id',
            'location_id' => 'nullable|exists:locations,id',
            'specs' => 'nullable|array',
            'specs.*.key' => 'required_with:specs|string|max:60',
            'specs.*.value' => 'nullable|string|max:1000',
            'cost' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'supplier' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    public function messages(): array
    {
        return [
            'internal_tag.required' => 'El número de inventario es obligatorio.',
            'internal_tag.unique' => 'Ya existe un activo con este número de inventario.',
            'serial.unique' => 'Ya existe un activo con este número de serie.',
            'site_id.required' => 'La sede es obligatoria.',
            'site_id.exists' => 'La sede no es válida.',
            'category_id.required' => 'La categoría es obligatoria.',
            'status_id.required' => 'El estatus es obligatorio.',
        ];
    }

    public function after(): array
    {
        return [function ($validator) {
            $asset = $this->route('inv_asset');
            if (! $asset || $validator->errors()->isNotEmpty()) {
                return;
            }

            // Sede/ubicación se cambian solo mediante traslado, que deja una
            // bitácora. El estatus operativo se reserva para sus flujos
            // especializados (por ahora baja); la edición sigue siendo para
            // datos descriptivos y técnicos.
            if ((int) $this->input('site_id') !== (int) $asset->site_id) {
                $validator->errors()->add('site_id', 'Usa la acción Trasladar para cambiar la sede.');
            }
            if ((int) $this->input('status_id') !== (int) $asset->status_id) {
                $validator->errors()->add('status_id', 'El estatus operativo no se modifica desde Editar activo.');
            }
        }];
    }
}
