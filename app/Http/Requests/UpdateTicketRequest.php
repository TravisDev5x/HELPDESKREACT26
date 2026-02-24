<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketRequest extends FormRequest
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
            'ticket_state_id' => 'nullable|exists:ticket_states,id',
            'priority_id' => 'nullable|exists:priorities,id',
            'area_current_id' => 'nullable|exists:areas,id',
            'note' => 'nullable|string|max:1000',
            'due_at' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'ticket_state_id.exists' => 'El estado no es válido.',
            'priority_id.exists' => 'La prioridad no es válida.',
            'area_current_id.exists' => 'El área no es válida.',
            'note.max' => 'La nota no puede superar 1000 caracteres.',
        ];
    }
}
