<?php

namespace App\Http\Requests\Sigua;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncidenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sigua.incidentes.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'cuenta_generica_id' => ['required', 'exists:sigua_accounts,id'],
            'fecha_incidente' => ['required', 'date'],
            'descripcion' => ['required', 'string', 'max:5000'],
            'ip_origen' => ['nullable', 'ip'],
        ];
    }

    public function messages(): array
    {
        return [
            'cuenta_generica_id.required' => 'La cuenta genérica es obligatoria.',
            'cuenta_generica_id.exists' => 'La cuenta seleccionada no es válida.',
            'fecha_incidente.required' => 'La fecha del incidente es obligatoria.',
            'fecha_incidente.date' => 'La fecha del incidente no es válida.',
            'descripcion.required' => 'La descripción es obligatoria.',
            'descripcion.max' => 'La descripción no puede superar 5000 caracteres.',
            'ip_origen.ip' => 'La IP de origen no es válida.',
        ];
    }
}
