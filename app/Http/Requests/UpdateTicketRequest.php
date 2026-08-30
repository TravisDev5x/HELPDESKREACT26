<?php

namespace App\Http\Requests;

use App\Rules\ScopedCatalogExists;
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
        $catalog = fn (string $table) => new ScopedCatalogExists($table, $this->user());

        return [
            'ticket_state_id' => ['nullable', 'integer', $catalog('ticket_states')],
            'priority_id' => ['nullable', 'integer', $catalog('priorities')],
            'impact_level_id' => ['nullable', 'integer', $catalog('impact_levels')],
            'urgency_level_id' => ['nullable', 'integer', $catalog('urgency_levels')],
            'area_current_id' => ['nullable', 'integer', $catalog('areas')],
            'note' => 'nullable|string|max:1000',
            'is_internal' => 'nullable|boolean',
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
