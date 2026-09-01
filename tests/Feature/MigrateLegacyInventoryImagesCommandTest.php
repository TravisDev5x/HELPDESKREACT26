<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\InvAsset;
use App\Models\InvAssetImage;
use App\Models\InvCategory;
use App\Models\InvStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MigrateLegacyInventoryImagesCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_moves_a_legacy_public_image_to_private_storage_and_is_idempotent(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $image = $this->legacyImage('inv-assets/1/legacy.jpg');
        Storage::disk('public')->put($image->path, 'legacy-image');

        $this->artisan('inventory:migrate-legacy-images')->assertSuccessful();
        $this->assertTrue(Storage::disk('public')->exists($image->path));
        $this->assertSame('public', $image->fresh()->disk);

        $this->artisan('inventory:migrate-legacy-images --execute')->assertSuccessful();
        $this->assertFalse(Storage::disk('public')->exists($image->path));
        $this->assertTrue(Storage::disk('local')->exists($image->path));
        $this->assertSame('local', $image->fresh()->disk);

        $this->artisan('inventory:migrate-legacy-images --execute')->assertSuccessful();
        $this->assertTrue(Storage::disk('local')->exists($image->path));
        $this->assertSame('local', $image->fresh()->disk);
    }

    public function test_it_never_moves_a_path_outside_inventory_storage(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $image = $this->legacyImage('other-module/document.pdf');
        Storage::disk('public')->put($image->path, 'do-not-move');

        $this->artisan('inventory:migrate-legacy-images --execute')->assertSuccessful();

        $this->assertTrue(Storage::disk('public')->exists($image->path));
        $this->assertFalse(Storage::disk('local')->exists($image->path));
        $this->assertSame('public', $image->fresh()->disk);
    }

    private function legacyImage(string $path): InvAssetImage
    {
        $client = Client::factory()->create();
        $siteId = DB::table('sites')->insertGetId([
            'client_id' => $client->id, 'name' => 'S'.uniqid(), 'code' => 'C'.uniqid(),
            'type' => 'physical', 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $category = InvCategory::create(['name' => 'Categoría '.uniqid(), 'is_active' => true]);
        $status = InvStatus::create(['name' => 'Disponible '.uniqid(), 'assignable' => true, 'is_active' => true]);
        $asset = InvAsset::create([
            'internal_tag' => 'TAG-'.uniqid(), 'name' => 'Activo legado', 'category_id' => $category->id,
            'status_id' => $status->id, 'site_id' => $siteId, 'client_id' => $client->id,
        ]);

        return InvAssetImage::create(['inv_asset_id' => $asset->id, 'path' => $path, 'disk' => 'public']);
    }
}
