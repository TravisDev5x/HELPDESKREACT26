<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentType;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IncidentTypeController extends Controller
{
    public function index()
    {
        return IncidentType::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|min:2|unique:incident_types,name',
            'code' => 'required|min:2|unique:incident_types,code',
            'is_active' => 'boolean',
        ]);
        $type = IncidentType::create($data);
        return response()->json($type, 201);
    }

    public function update(Request $request, IncidentType $incident_type)
    {
        $data = $request->validate([
            'name' => ['required','min:2',Rule::unique('incident_types','name')->ignore($incident_type->id)],
            'code' => ['required','min:2',Rule::unique('incident_types','code')->ignore($incident_type->id)],
            'is_active' => 'boolean',
        ]);
        $incident_type->update($data);
        return response()->json($incident_type);
    }

    public function destroy(IncidentType $incident_type)
    {
        $incident_type->delete();
        return response()->noContent();
    }
}
