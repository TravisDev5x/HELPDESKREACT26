<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sede;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SedeController extends Controller
{
    public function index()
    {
        return Sede::orderBy('type')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'min:2', 'unique:sites,name'],
            'code' => ['nullable', 'max:20', 'unique:sites,code'],
            'type' => ['required', Rule::in(['physical', 'virtual'])],
            'is_active' => ['boolean'],
        ]);

        $sede = Sede::create($data);
        return response()->json($sede, 201);
    }

    public function update(Request $request, Sede $sede)
    {
        $data = $request->validate([
            'name' => ['required', 'min:2', Rule::unique('sites', 'name')->ignore($sede->id)],
            'code' => ['nullable', 'max:20', Rule::unique('sites', 'code')->ignore($sede->id)],
            'type' => ['required', Rule::in(['physical', 'virtual'])],
            'is_active' => ['boolean'],
        ]);

        $sede->update($data);
        return response()->json($sede);
    }

    public function destroy(Sede $sede)
    {
        // prevenir eliminar sede remota usada como fallback
        if ($sede->code === 'REMOTO') {
            return response()->json(['message' => 'La sede Remoto no puede eliminarse'], 422);
        }
        if ($sede->users()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: hay usuarios asignados'], 422);
        }
        $sede->delete();
        return response()->noContent();
    }
}
