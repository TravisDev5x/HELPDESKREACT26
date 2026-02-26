<?php

namespace App\Http\Requests\Sigua;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCuentaGenericaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sigua.cuentas.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'sistema_id' => ['required', 'exists:sigua_systems,id'],
            'usuario_cuenta' => [
                'required',
                'string',
                'max:100',
                Rule::unique('sigua_accounts', 'usuario_cuenta')->where('system_id', $this->input('sistema_id')),
            ],
            'nombre_cuenta' => ['required', 'string', 'max:255'],
            'sede_id' => ['required', 'exists:sites,id'],
            'campaign_id' => ['nullable', 'exists:campaigns,id'],
            'isla' => ['nullable', 'string', 'max:100'],
            'perfil' => ['nullable', 'string', 'max:100'],
            'ou_ad' => ['nullable', 'string', 'max:255'],
            'estado' => ['required', 'in:activa,suspendida,baja'],
        ];
    }

    public function messages(): array
    {
        return [
            'sistema_id.required' => 'El sistema es obligatorio.',
            'sistema_id.exists' => 'El sistema seleccionado no es válido.',
            'usuario_cuenta.required' => 'El usuario/cuenta es obligatorio.',
            'usuario_cuenta.max' => 'El usuario/cuenta no puede superar 100 caracteres.',
            'usuario_cuenta.unique' => 'Ya existe una cuenta con ese usuario en el sistema seleccionado.',
            'nombre_cuenta.required' => 'El nombre de la cuenta es obligatorio.',
            'nombre_cuenta.max' => 'El nombre de la cuenta no puede superar 255 caracteres.',
            'sede_id.required' => 'La sede es obligatoria.',
            'sede_id.exists' => 'La sede seleccionada no es válida.',
            'campaign_id.exists' => 'La campaña seleccionada no es válida.',
            'estado.required' => 'El estado es obligatorio.',
            'estado.in' => 'El estado debe ser activa, suspendida o baja.',
        ];
    }
}
