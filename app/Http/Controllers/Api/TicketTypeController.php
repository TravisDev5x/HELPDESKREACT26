<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketType;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketTypeController extends Controller
{
    public function index()
    {
        return TicketType::with('areas:id,name')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|min:2|unique:ticket_types,name',
            'code' => 'required|min:2|unique:ticket_types,code',
            'area_ids' => 'array',
            'area_ids.*' => 'exists:areas,id',
            'is_active' => 'boolean',
        ]);
        $type = TicketType::create($data);
        if (!empty($data['area_ids'])) {
            $type->areas()->sync($data['area_ids']);
        }
        return response()->json($type->load('areas:id,name'), 201);
    }

    public function update(Request $request, TicketType $ticket_type)
    {
        $data = $request->validate([
            'name' => ['required','min:2',Rule::unique('ticket_types','name')->ignore($ticket_type->id)],
            'code' => ['required','min:2',Rule::unique('ticket_types','code')->ignore($ticket_type->id)],
            'area_ids' => 'array',
            'area_ids.*' => 'exists:areas,id',
            'is_active' => 'boolean',
        ]);
        $ticket_type->update($data);
        if (isset($data['area_ids'])) {
            $ticket_type->areas()->sync($data['area_ids']);
        }
        return response()->json($ticket_type->load('areas:id,name'));
    }

    public function destroy(TicketType $ticket_type)
    {
        $ticket_type->areas()->detach();
        $ticket_type->delete();
        return response()->noContent();
    }
}
