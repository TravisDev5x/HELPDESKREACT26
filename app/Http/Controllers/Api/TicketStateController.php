<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketState;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketStateController extends Controller
{
    public function index()
    {
        return TicketState::orderBy('is_final')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|min:2|unique:ticket_states,name',
            'code' => 'required|min:2|unique:ticket_states,code',
            'is_active' => 'boolean',
            'is_final' => 'boolean',
        ]);
        $state = TicketState::create($data);
        return response()->json($state, 201);
    }

    public function update(Request $request, TicketState $ticket_state)
    {
        $data = $request->validate([
            'name' => ['required','min:2',Rule::unique('ticket_states','name')->ignore($ticket_state->id)],
            'code' => ['required','min:2',Rule::unique('ticket_states','code')->ignore($ticket_state->id)],
            'is_active' => 'boolean',
            'is_final' => 'boolean',
        ]);
        $ticket_state->update($data);
        return response()->json($ticket_state);
    }

    public function destroy(TicketState $ticket_state)
    {
        if ($ticket_state->is_final) {
            return response()->json(['message' => 'No se puede eliminar un estado final'], 422);
        }
        $ticket_state->delete();
        return response()->noContent();
    }
}
