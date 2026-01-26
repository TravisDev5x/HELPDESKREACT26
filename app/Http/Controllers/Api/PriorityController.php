<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Priority;
use Illuminate\Http\Request;

class PriorityController extends Controller
{
    public function index()
    {
        return Priority::orderBy('level')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|min:2|unique:priorities,name',
            'level' => 'required|integer|min:1|max:10',
            'is_active' => 'boolean',
        ]);
        $priority = Priority::create($data);
        return response()->json($priority, 201);
    }

    public function update(Request $request, Priority $priority)
    {
        $data = $request->validate([
            'name' => 'required|min:2|unique:priorities,name,' . $priority->id,
            'level' => 'required|integer|min:1|max:10',
            'is_active' => 'boolean',
        ]);
        $priority->update($data);
        return response()->json($priority);
    }

    public function destroy(Priority $priority)
    {
        if ($priority->level === 1) {
            return response()->json(['message' => 'No se puede eliminar prioridad base'], 422);
        }
        $priority->delete();
        return response()->noContent();
    }
}
