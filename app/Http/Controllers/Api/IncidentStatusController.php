<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentStatus;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IncidentStatusController extends Controller
{
    public function index()
    {
        return IncidentStatus::orderBy('is_final')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|min:2|unique:incident_statuses,name',
            'code' => 'required|min:2|unique:incident_statuses,code',
            'is_active' => 'boolean',
            'is_final' => 'boolean',
        ]);
        $status = IncidentStatus::create($data);
        return response()->json($status, 201);
    }

    public function update(Request $request, IncidentStatus $incident_status)
    {
        $data = $request->validate([
            'name' => ['required','min:2',Rule::unique('incident_statuses','name')->ignore($incident_status->id)],
            'code' => ['required','min:2',Rule::unique('incident_statuses','code')->ignore($incident_status->id)],
            'is_active' => 'boolean',
            'is_final' => 'boolean',
        ]);
        $incident_status->update($data);
        return response()->json($incident_status);
    }

    public function destroy(IncidentStatus $incident_status)
    {
        if ($incident_status->is_final) {
            return response()->json(['message' => 'No se puede eliminar un estado final'], 422);
        }
        $incident_status->delete();
        return response()->noContent();
    }
}
