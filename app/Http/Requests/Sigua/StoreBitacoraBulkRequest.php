<?php

namespace App\Http\Requests\Sigua;

use Illuminate\Foundation\Http\FormRequest;

class StoreBitacoraBulkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sigua.bitacora.registrar') ?? false;
    }

    public function rules(): array
    {
        return [
            'registros' => ['required', 'array', 'min:1'],
            'registros.*.cuenta_generica_id' => ['required', 'exists:sigua_accounts,id'],
            'registros.*.fecha' => ['required', 'date'],
            'registros.*.turno' => ['required', 'in:matutino,vespertino,nocturno,mixto'],
            'registros.*.agente_nombre' => ['required', 'string', 'max:255'],
            'registros.*.agente_num_empleado' => ['nullable', 'string', 'max:50'],
            'registros.*.hora_inicio' => ['nullable', 'date_format:H:i'],
            'registros.*.hora_fin' => ['nullable', 'date_format:H:i'],
            'registros.*.hora_cambio' => ['nullable', 'date_format:H:i'],
            'registros.*.observaciones' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'registros.required' => 'Debe incluir al menos un registro.',
            'registros.min' => 'Debe incluir al menos un registro.',
            'registros.*.cuenta_generica_id.required' => 'Cada registro debe tener una cuenta asociada.',
            'registros.*.cuenta_generica_id.exists' => 'Una de las cuentas seleccionadas no es válida.',
            'registros.*.fecha.required' => 'La fecha es obligatoria en cada registro.',
            'registros.*.fecha.date' => 'Una de las fechas no es válida.',
            'registros.*.turno.required' => 'El turno es obligatorio en cada registro.',
            'registros.*.turno.in' => 'El turno debe ser matutino, vespertino, nocturno o mixto.',
            'registros.*.agente_nombre.required' => 'El nombre del agente es obligatorio en cada registro.',
            'registros.*.agente_nombre.max' => 'El nombre del agente no puede superar 255 caracteres.',
        ];
    }
}
