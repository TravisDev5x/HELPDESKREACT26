<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\Request;

class PositionController extends Controller
{
    public function index()
    {
        return Position::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3', 'unique:positions,name'],
            'is_active' => ['boolean'],
        ]);

        $position = Position::create([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json($position, 201);
    }

    public function update(Request $request, Position $position)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3', 'unique:positions,name,' . $position->id],
            'is_active' => ['boolean'],
        ]);

        $position->fill([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? $position->is_active,
        ]);
        $position->save();

        return response()->json($position);
    }

    public function destroy(Position $position)
    {
        $position->delete();
        return response()->noContent();
    }
}
