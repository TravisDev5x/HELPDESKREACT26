<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index()
    {
        return Campaign::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3', 'unique:campaigns,name'],
            'is_active' => ['boolean'],
        ]);

        $campaign = Campaign::create([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json($campaign, 201);
    }

    public function update(Request $request, Campaign $campaign)
    {
        $data = $request->validate([
            'name' => ['required', 'min:3', 'unique:campaigns,name,' . $campaign->id],
            'is_active' => ['boolean'],
        ]);

        $campaign->fill([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? $campaign->is_active,
        ]);
        $campaign->save();

        return response()->json($campaign);
    }

    public function destroy(Campaign $campaign)
    {
        $campaign->delete();
        return response()->noContent();
    }
}
