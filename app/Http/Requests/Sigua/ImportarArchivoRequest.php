<?php

namespace App\Http\Requests\Sigua;

use Illuminate\Foundation\Http\FormRequest;

class ImportarArchivoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sigua.importar') ?? false;
    }

    public function rules(): array
    {
        return [
            'archivo' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
            'tipo' => [
                'required',
                'in:rh_activos,ad_usuarios,neotel_isla2,neotel_isla3,neotel_isla4,bajas_rh,sistema',
            ],
            'sistema_id' => ['required_if:tipo,sistema', 'nullable', 'integer', 'exists:sigua_systems,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'archivo.required' => 'El archivo es obligatorio.',
            'archivo.file' => 'Debe enviar un archivo válido.',
            'archivo.mimes' => 'El archivo debe ser Excel (.xlsx, .xls) o CSV.',
            'archivo.max' => 'El archivo no puede superar 10 MB.',
            'tipo.required' => 'El tipo de importación es obligatorio.',
            'tipo.in' => 'El tipo de importación no es válido.',
        ];
    }
}
