<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\InvAsset;
use App\Models\InvCategory;
use App\Models\InvStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InventoryOperationalMutationGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'inventory.manage_assets', 'guard_name' => 'web']);
    }

    public function test_generic_edit_cannot_change_site_location_or_operational_status(): void
    {
        $client = Client::factory()->create();
        $site = $this->site($client->id);
        $otherSite = $this->site($client->id);
        $location = $this->location($site);
        $admin = $this->user($client->id, $site);
        setPermissionsTeamId(config('tenancy.super_admin_team_id'));
        $admin->givePermissionTo('inventory.manage_assets');
        $category = InvCategory::create(['name' => 'Laptops', 'is_active' => true]);
        $available = InvStatus::create(['name' => 'Disponible', 'assignable' => true, 'is_active' => true]);
        $retired = InvStatus::create(['name' => 'Baja', 'assignable' => false, 'is_active' => true]);
        $asset = InvAsset::create([
            'internal_tag' => 'MUT-1', 'name' => 'Activo protegido', 'category_id' => $category->id,
            'status_id' => $available->id, 'site_id' => $site, 'location_id' => $location, 'client_id' => $client->id,
        ]);

        $response = $this->actingAs($admin, 'web')->putJson("/api/inv-assets/{$asset->id}", [
            'internal_tag' => $asset->internal_tag,
            'name' => 'Intento de bypass',
            'category_id' => $category->id,
            'status_id' => $retired->id,
            'site_id' => $otherSite,
            'location_id' => null,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['site_id', 'status_id']);

        $locationOnly = $this->actingAs($admin, 'web')->putJson("/api/inv-assets/{$asset->id}", [
            'internal_tag' => $asset->internal_tag,
            'name' => 'Intento de bypass',
            'category_id' => $category->id,
            'status_id' => $available->id,
            'site_id' => $site,
            'location_id' => null,
        ]);
        $locationOnly->assertStatus(422)
            ->assertJsonPath('message', 'Usa la acción Trasladar para cambiar la ubicación.');
        $fresh = $asset->fresh();
        $this->assertSame('Activo protegido', $fresh->name);
        $this->assertSame($site, $fresh->site_id);
        $this->assertSame($location, $fresh->location_id);
        $this->assertSame($available->id, $fresh->status_id);
    }

    private function site(int $clientId): int
    {
        return DB::table('sites')->insertGetId([
            'client_id' => $clientId, 'name' => 'S'.uniqid(), 'code' => 'C'.uniqid(),
            'type' => 'physical', 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function location(int $siteId): int
    {
        return DB::table('locations')->insertGetId([
            'site_id' => $siteId, 'name' => 'L'.uniqid(), 'code' => 'L'.uniqid(),
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function user(int $clientId, int $siteId): User
    {
        $areaId = DB::table('areas')->insertGetId(['name' => 'A'.uniqid(), 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $positionId = DB::table('positions')->insertGetId(['name' => 'P'.uniqid(), 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);

        return User::create([
            'first_name' => 'A', 'paternal_last_name' => 'B', 'email' => uniqid().'@test.local',
            'password' => Hash::make('secret'), 'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $areaId, 'position_id' => $positionId, 'site_id' => $siteId,
            'client_id' => $clientId, 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }
}
