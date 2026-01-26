<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    public function index()
    {
        return Area::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3', 'unique:areas,name'],
            'is_active' => ['boolean'],
        ]);

        $area = Area::create([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json($area, 201);
    }

    public function update(Request $request, Area $area)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3', 'unique:areas,name,' . $area->id],
            'is_active' => ['boolean'],
        ]);

        $area->fill([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? $area->is_active,
        ]);
        $area->save();

        return response()->json($area);
    }

    public function destroy(Area $area)
    {
        $area->delete();
        return response()->noContent();
    }
}
