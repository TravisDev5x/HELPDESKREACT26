<?php

namespace App\Http\Requests;

use App\Rules\FormattedTextLength;
use App\Rules\ScopedCatalogExists;
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
        $catalog = fn (string $table) => new ScopedCatalogExists($table, $this->user());

        return [
            'subject' => 'required|string|max:255',
            // El editor limita a 10k caracteres visibles; se permite margen para
            // las etiquetas HTML seguras que representan el formato.
            'description' => ['nullable', 'string', 'max:20000', new FormattedTextLength(10000)],
            'area_origin_id' => ['required', 'integer', $catalog('areas')],
            // Opcional para el solicitante: TicketCreationService enruta por
            // tipo y conserva NOT NULL en la base de datos.
            'area_current_id' => ['nullable', 'integer', $catalog('areas')],
            'site_id' => 'nullable|exists:sites,id',
            'location_id' => 'nullable|exists:locations,id',
            'ticket_type_id' => ['required', 'integer', $catalog('ticket_types')],
            'priority_id' => ['nullable', 'integer', $catalog('priorities')],
            'impact_level_id' => ['nullable', 'integer', $catalog('impact_levels')],
            'urgency_level_id' => ['nullable', 'integer', $catalog('urgency_levels')],
            'ticket_state_id' => ['required', 'integer', $catalog('ticket_states')],
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
            'area_current_id.exists' => 'El área actual no es válida.',
            'site_id.required' => 'La sede es obligatoria.',
            'site_id.exists' => 'La sede no es válida.',
            'ticket_type_id.required' => 'El tipo de ticket es obligatorio.',
            'ticket_type_id.exists' => 'El tipo de ticket no es válido.',
            'priority_id.exists' => 'La prioridad no es válida.',
            'impact_level_id.exists' => 'El nivel de impacto no es válido.',
            'urgency_level_id.exists' => 'El nivel de urgencia no es válido.',
            'ticket_state_id.required' => 'El estado es obligatorio.',
            'ticket_state_id.exists' => 'El estado no es válido.',
            'created_at.required' => 'La fecha de creación es obligatoria.',
            'created_at.before_or_equal' => 'La fecha no puede ser futura.',
            'description.max' => 'La descripción es demasiado extensa.',
        ];
    }
}
