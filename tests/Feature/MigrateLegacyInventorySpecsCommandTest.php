<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\InvAsset;
use App\Models\InvCategory;
use App\Models\InvStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MigrateLegacyInventorySpecsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_migrates_compatible_legacy_specs_only_when_explicitly_executed_and_is_idempotent(): void
    {
        $asset = $this->legacyAsset();

        $this->artisan('inventory:migrate-legacy-specs')->assertSuccessful();
        $this->assertDatabaseMissing('inv_asset_specs', ['asset_id' => $asset->id, 'key' => 'ram']);

        $this->artisan('inventory:migrate-legacy-specs --execute')->assertSuccessful();
        $this->assertDatabaseHas('inv_asset_specs', [
            'asset_id' => $asset->id,
            'client_id' => $asset->client_id,
            'key' => 'ram',
            'value' => '16 GB',
        ]);
        $this->assertNotNull($asset->fresh()->getRawOriginal('specs'));

        $this->artisan('inventory:migrate-legacy-specs --execute')->assertSuccessful();
        $this->assertSame(1, DB::table('inv_asset_specs')->where('asset_id', $asset->id)->count());
    }

    private function legacyAsset(): InvAsset
    {
        $client = Client::factory()->create();
        $siteId = DB::table('sites')->insertGetId([
            'client_id' => $client->id,
            'name' => 'S'.uniqid(),
            'code' => 'C'.uniqid(),
            'type' => 'physical',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $category = InvCategory::create([
            'name' => 'Hardware '.uniqid(),
            'type' => 'HARDWARE',
            'is_active' => true,
        ]);
        $status = InvStatus::create([
            'name' => 'Disponible '.uniqid(),
            'assignable' => true,
            'is_active' => true,
        ]);

        return InvAsset::create([
            'internal_tag' => 'TAG-'.uniqid(),
            'name' => 'Activo con ficha legacy',
            'category_id' => $category->id,
            'status_id' => $status->id,
            'site_id' => $siteId,
            'client_id' => $client->id,
            'specs' => ['ram' => '16 GB'],
        ]);
    }
}
