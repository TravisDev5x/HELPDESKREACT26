<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ubicacion;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UbicacionController extends Controller
{
    public function index(Request $request)
    {
        $sedeId = $request->query('sede_id');
        $query = Ubicacion::with('sede:id,name,type');
        if ($sedeId) {
            $query->where('sede_id', $sedeId);
        }
        return $query->orderBy('sede_id')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sede_id' => ['required', 'exists:sites,id'],
            'name' => ['required', 'min:2'],
            'code' => ['nullable', 'max:20', 'unique:locations,code'],
            'is_active' => ['boolean'],
        ]);
        $data['is_active'] = $data['is_active'] ?? true;

        $sedeId = $data['sede_id'];
        // unique per sede
        $request->validate([
            'name' => Rule::unique('locations', 'name')->where('sede_id', $sedeId),
        ]);

        $ubicacion = Ubicacion::create($data);
        return response()->json($ubicacion, 201);
    }

    public function update(Request $request, Ubicacion $ubicacione)
    {
        $data = $request->validate([
            'sede_id' => ['required', 'exists:sites,id'],
            'name' => ['required', 'min:2'],
            'code' => ['nullable', 'max:20', Rule::unique('locations', 'code')->ignore($ubicacione->id)],
            'is_active' => ['boolean'],
        ]);
        $request->validate([
            'name' => Rule::unique('locations', 'name')
                ->where('sede_id', $data['sede_id'])
                ->ignore($ubicacione->id),
        ]);

        $ubicacione->update($data);
        return response()->json($ubicacione);
    }

    public function destroy(Ubicacion $ubicacione)
    {
        if ($ubicacione->users()->exists()) {
            return response()->json(['message' => 'No se puede eliminar: hay usuarios asignados'], 422);
        }
        $ubicacione->delete();
        return response()->noContent();
    }
}
