<?php

namespace App\Http\Requests\Sigua;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Validator;

class StoreCA01Request extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sigua.ca01.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'gerente_user_id' => ['required', 'exists:users,id'],
            'campaign_id' => ['required', 'exists:campaigns,id'],
            'sede_id' => ['required', 'exists:sites,id'],
            'sistema_id' => ['required', 'exists:sigua_systems,id'],
            'fecha_firma' => ['required', 'date'],
            'cuentas' => ['required', 'array', 'min:1'],
            'cuentas.*.cuenta_generica_id' => ['required', 'exists:sigua_accounts,id'],
            'cuentas.*.justificacion' => ['nullable', 'string', 'max:500'],
            'observaciones' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $exists = DB::table('sigua_ca01')
                ->whereNull('deleted_at')
                ->where('gerente_user_id', $this->input('gerente_user_id'))
                ->where('campaign_id', $this->input('campaign_id'))
                ->where('sede_id', $this->input('sede_id'))
                ->where('system_id', $this->input('sistema_id'))
                ->where('estado', 'vigente')
                ->exists();
            if ($exists) {
                $validator->errors()->add(
                    'gerente_user_id',
                    'Ya existe un CA-01 vigente para la misma combinación gerente, campaña, sede y sistema.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'gerente_user_id.required' => 'El gerente es obligatorio.',
            'gerente_user_id.exists' => 'El gerente seleccionado no es válido.',
            'campaign_id.required' => 'La campaña es obligatoria.',
            'campaign_id.exists' => 'La campaña seleccionada no es válida.',
            'sede_id.required' => 'La sede es obligatoria.',
            'sede_id.exists' => 'La sede seleccionada no es válida.',
            'sistema_id.required' => 'El sistema es obligatorio.',
            'sistema_id.exists' => 'El sistema seleccionado no es válido.',
            'fecha_firma.required' => 'La fecha de firma es obligatoria.',
            'fecha_firma.date' => 'La fecha de firma no es válida.',
            'cuentas.required' => 'Debe incluir al menos una cuenta.',
            'cuentas.min' => 'Debe incluir al menos una cuenta.',
            'cuentas.*.cuenta_generica_id.required' => 'Cada entrada debe tener una cuenta asociada.',
            'cuentas.*.cuenta_generica_id.exists' => 'Una de las cuentas seleccionadas no es válida.',
        ];
    }
}
