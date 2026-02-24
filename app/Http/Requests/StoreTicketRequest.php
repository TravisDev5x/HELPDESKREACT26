<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    /**
     * Authorization is handled by the controller (Gate::authorize) and TicketPolicy.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'area_origin_id' => 'required|exists:areas,id',
            'area_current_id' => 'required|exists:areas,id',
            'sede_id' => 'required|exists:sites,id',
            'ubicacion_id' => 'nullable|exists:locations,id',
            'ticket_type_id' => 'required|exists:ticket_types,id',
            'priority_id' => 'required|exists:priorities,id',
            'ticket_state_id' => 'required|exists:ticket_states,id',
            'created_at' => 'required|date|before_or_equal:now',
            'due_at' => 'nullable|date|after_or_equal:created_at',
        ];
    }

    public function messages(): array
    {
        return [
            'subject.required' => 'El asunto es obligatorio.',
            'area_origin_id.required' => 'El área de origen es obligatoria.',
            'area_origin_id.exists' => 'El área de origen no es válida.',
            'area_current_id.required' => 'El área actual es obligatoria.',
            'area_current_id.exists' => 'El área actual no es válida.',
            'sede_id.required' => 'La sede es obligatoria.',
            'sede_id.exists' => 'La sede no es válida.',
            'ticket_type_id.required' => 'El tipo de ticket es obligatorio.',
            'ticket_type_id.exists' => 'El tipo de ticket no es válido.',
            'priority_id.required' => 'La prioridad es obligatoria.',
            'priority_id.exists' => 'La prioridad no es válida.',
            'ticket_state_id.required' => 'El estado es obligatorio.',
            'ticket_state_id.exists' => 'El estado no es válido.',
            'created_at.required' => 'La fecha de creación es obligatoria.',
            'created_at.before_or_equal' => 'La fecha no puede ser futura.',
        ];
    }
}
