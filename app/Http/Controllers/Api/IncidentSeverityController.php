<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentSeverity;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IncidentSeverityController extends Controller
{
    public function index()
    {
        return IncidentSeverity::orderBy('level')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|min:2|unique:incident_severities,name',
            'code' => 'required|min:2|unique:incident_severities,code',
            'level' => 'required|integer|min:1|max:10',
            'is_active' => 'boolean',
        ]);
        $severity = IncidentSeverity::create($data);
        return response()->json($severity, 201);
    }

    public function update(Request $request, IncidentSeverity $incident_severity)
    {
        $data = $request->validate([
            'name' => ['required','min:2',Rule::unique('incident_severities','name')->ignore($incident_severity->id)],
            'code' => ['required','min:2',Rule::unique('incident_severities','code')->ignore($incident_severity->id)],
            'level' => 'required|integer|min:1|max:10',
            'is_active' => 'boolean',
        ]);
        $incident_severity->update($data);
        return response()->json($incident_severity);
    }

    public function destroy(IncidentSeverity $incident_severity)
    {
        if ($incident_severity->level === 1) {
            return response()->json(['message' => 'No se puede eliminar la severidad base'], 422);
        }
        $incident_severity->delete();
        return response()->noContent();
    }
}
