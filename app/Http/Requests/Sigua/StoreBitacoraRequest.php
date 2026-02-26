<?php

namespace App\Http\Requests\Sigua;

use Illuminate\Foundation\Http\FormRequest;

class StoreBitacoraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sigua.bitacora.registrar') ?? false;
    }

    public function rules(): array
    {
        return [
            'cuenta_generica_id' => ['required', 'exists:sigua_accounts,id'],
            'fecha' => ['required', 'date'],
            'turno' => ['required', 'in:matutino,vespertino,nocturno,mixto'],
            'agente_nombre' => ['required', 'string', 'max:255'],
            'agente_num_empleado' => ['nullable', 'string', 'max:50'],
            'hora_inicio' => ['nullable', 'date_format:H:i'],
            'hora_fin' => ['nullable', 'date_format:H:i'],
            'hora_cambio' => ['nullable', 'date_format:H:i'],
            'observaciones' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'cuenta_generica_id.required' => 'La cuenta genérica es obligatoria.',
            'cuenta_generica_id.exists' => 'La cuenta seleccionada no es válida.',
            'fecha.required' => 'La fecha es obligatoria.',
            'fecha.date' => 'La fecha no es válida.',
            'turno.required' => 'El turno es obligatorio.',
            'turno.in' => 'El turno debe ser matutino, vespertino, nocturno o mixto.',
            'agente_nombre.required' => 'El nombre del agente es obligatorio.',
            'agente_nombre.max' => 'El nombre del agente no puede superar 255 caracteres.',
            'hora_inicio.date_format' => 'La hora de inicio debe tener formato HH:MM.',
            'hora_fin.date_format' => 'La hora de fin debe tener formato HH:MM.',
            'hora_cambio.date_format' => 'La hora de cambio debe tener formato HH:MM.',
        ];
    }
}
