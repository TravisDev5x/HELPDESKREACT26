<?php

namespace Tests\Feature;

use App\Enums\InvAssetOperationalState;
use App\Models\Client;
use App\Models\InvAsset;
use App\Models\InvDisposal;
use App\Models\InvCategory;
use App\Models\InvMovement;
use App\Models\InvStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InventoryLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'inventory.manage_assets', 'guard_name' => 'web']);
    }

    public function test_available_asset_can_be_assigned_and_returned_with_consistent_state(): void
    {
        ['admin' => $admin, 'asset' => $asset, 'client' => $client, 'site' => $site] = $this->fixtures();
        $employee = $this->clientUser($client->id, $site);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/checkout", [
            'user_id' => $employee->id,
        ])->assertCreated();

        $this->assertAssetState($asset, InvAssetOperationalState::ASSIGNED, $employee->id);
        $this->assertDatabaseHas('inv_movements', [
            'asset_id' => $asset->id, 'type' => 'CHECKOUT', 'user_id' => $employee->id,
        ]);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/checkin")
            ->assertCreated();

        $this->assertAssetState($asset, InvAssetOperationalState::AVAILABLE, null);
        $this->assertDatabaseHas('inv_movements', [
            'asset_id' => $asset->id, 'type' => 'CHECKIN', 'user_id' => $employee->id,
        ]);
    }

    public function test_assigned_asset_can_be_reassigned_with_one_traceable_movement(): void
    {
        ['admin' => $admin, 'asset' => $asset, 'client' => $client, 'site' => $site] = $this->fixtures();
        $firstUser = $this->clientUser($client->id, $site);
        $nextUser = $this->clientUser($client->id, $site);
        $asset->update([
            'current_user_id' => $firstUser->id,
            'operational_state' => InvAssetOperationalState::ASSIGNED,
        ]);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/reassign", [
            'user_id' => $nextUser->id,
            'notes' => 'Cambio de puesto',
        ])->assertCreated();

        $this->assertAssetState($asset, InvAssetOperationalState::ASSIGNED, $nextUser->id);
        $this->assertDatabaseHas('inv_movements', [
            'asset_id' => $asset->id,
            'type' => 'REASSIGN',
            'previous_user_id' => $firstUser->id,
            'user_id' => $nextUser->id,
            'notes' => 'Cambio de puesto',
        ]);
        $this->assertSame(1, InvMovement::where('asset_id', $asset->id)->where('type', 'REASSIGN')->count());
    }

    public function test_reassignment_rejects_same_user_foreign_user_and_non_assigned_asset(): void
    {
        ['admin' => $admin, 'asset' => $asset, 'client' => $client, 'site' => $site] = $this->fixtures();
        $assignedUser = $this->clientUser($client->id, $site);
        $asset->update([
            'current_user_id' => $assignedUser->id,
            'operational_state' => InvAssetOperationalState::ASSIGNED,
        ]);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/reassign", [
            'user_id' => $assignedUser->id,
        ])->assertStatus(422);

        $otherClient = Client::factory()->create();
        $foreignUser = $this->clientUser($otherClient->id, $this->makeSite($otherClient->id));
        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/reassign", [
            'user_id' => $foreignUser->id,
        ])->assertStatus(422);

        $asset->update([
            'current_user_id' => null,
            'operational_state' => InvAssetOperationalState::AVAILABLE,
        ]);
        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/reassign", [
            'user_id' => $assignedUser->id,
        ])->assertStatus(422);
    }

    public function test_reassignment_requires_permission_and_asset_tenant_access(): void
    {
        config(['security.testing_permission_bypass' => false]);
        ['admin' => $admin, 'asset' => $asset, 'client' => $client, 'site' => $site] = $this->fixtures();
        $assignedUser = $this->clientUser($client->id, $site);
        $targetUser = $this->clientUser($client->id, $site);
        $asset->update([
            'current_user_id' => $assignedUser->id,
            'operational_state' => InvAssetOperationalState::ASSIGNED,
        ]);
        $withoutPermission = $this->clientUser($client->id, $site);

        $this->actingAs($withoutPermission, 'web')->postJson("/api/inv-assets/{$asset->id}/reassign", [
            'user_id' => $targetUser->id,
        ])->assertForbidden();

        $otherClient = Client::factory()->create();
        $foreignAdmin = $this->clientUser($otherClient->id, $this->makeSite($otherClient->id));
        setPermissionsTeamId(config('tenancy.super_admin_team_id'));
        $foreignAdmin->givePermissionTo('inventory.manage_assets');
        $this->actingAs($foreignAdmin, 'web')->postJson("/api/inv-assets/{$asset->id}/reassign", [
            'user_id' => $targetUser->id,
        ])->assertForbidden();

        $this->assertAssetState($asset, InvAssetOperationalState::ASSIGNED, $assignedUser->id);
    }

    #[DataProvider('terminalStates')]
    public function test_terminal_assets_cannot_be_assigned_or_transferred(InvAssetOperationalState $state): void
    {
        ['admin' => $admin, 'asset' => $asset, 'client' => $client, 'site' => $site] = $this->fixtures();
        $asset->update(['operational_state' => $state]);
        $employee = $this->clientUser($client->id, $site);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/checkout", [
            'user_id' => $employee->id,
        ])->assertStatus(422);
        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/transfer", [
            'site_id' => $site,
        ])->assertStatus(422);
        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/checkin")
            ->assertStatus(422);
        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/reassign", [
            'user_id' => $employee->id,
        ])->assertStatus(422);

        $this->assertAssetState($asset, $state, null);
    }

    public static function terminalStates(): array
    {
        return [
            'retired' => [InvAssetOperationalState::RETIRED],
            'lost' => [InvAssetOperationalState::LOST],
            'stolen' => [InvAssetOperationalState::STOLEN],
            'maintenance' => [InvAssetOperationalState::MAINTENANCE],
        ];
    }

    public function test_maintenance_transitions_available_asset_back_to_available_when_closed(): void
    {
        ['admin' => $admin, 'asset' => $asset] = $this->fixtures();

        $opened = $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/maintenances", [
            'title' => 'Diagnóstico de pantalla',
            'start_date' => now()->toDateString(),
        ])->assertCreated();

        $this->assertAssetState($asset, InvAssetOperationalState::MAINTENANCE, null);
        $this->assertDatabaseHas('inv_movements', [
            'asset_id' => $asset->id, 'type' => 'MAINTENANCE_START',
        ]);

        $maintenance = $opened->json('id');
        $this->actingAs($admin, 'web')->putJson("/api/inv-maintenances/{$maintenance}", [
            'title' => 'Diagnóstico de pantalla',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'solution' => 'Se reemplazó el panel.',
        ])->assertOk();

        $this->assertAssetState($asset, InvAssetOperationalState::AVAILABLE, null);
        $this->assertDatabaseHas('inv_movements', [
            'asset_id' => $asset->id, 'type' => 'MAINTENANCE_END',
        ]);
    }

    public function test_terminal_asset_cannot_start_maintenance_and_closed_maintenance_cannot_close_again(): void
    {
        ['admin' => $admin, 'asset' => $asset] = $this->fixtures();
        $asset->update(['operational_state' => InvAssetOperationalState::RETIRED]);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/maintenances", [
            'title' => 'No permitido',
            'start_date' => now()->toDateString(),
        ])->assertStatus(422);

        $asset->update(['operational_state' => InvAssetOperationalState::AVAILABLE]);
        $maintenance = $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/maintenances", [
            'title' => 'Revisión',
            'start_date' => now()->toDateString(),
        ])->json('id');
        $payload = [
            'title' => 'Revisión',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
        ];
        $this->actingAs($admin, 'web')->putJson("/api/inv-maintenances/{$maintenance}", $payload)->assertOk();
        $this->actingAs($admin, 'web')->putJson("/api/inv-maintenances/{$maintenance}", $payload)->assertStatus(422);
    }

    public function test_assigned_asset_can_be_retired_and_is_cleared_from_its_responsible_user(): void
    {
        ['admin' => $admin, 'asset' => $asset, 'client' => $client, 'site' => $site] = $this->fixtures();
        $employee = $this->clientUser($client->id, $site);
        $retiredStatus = InvStatus::create(['name' => 'Baja '.uniqid(), 'assignable' => false, 'is_active' => true]);
        $asset->update([
            'current_user_id' => $employee->id,
            'operational_state' => InvAssetOperationalState::ASSIGNED,
        ]);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/retire", [
            'status_id' => $retiredStatus->id,
            'reason' => 'Sin reparación viable',
            'method' => 'OBSOLESCENCIA',
        ])->assertCreated();

        $this->assertAssetState($asset, InvAssetOperationalState::RETIRED, null);
        $this->assertDatabaseHas('inv_movements', [
            'asset_id' => $asset->id, 'type' => 'RETIRE', 'user_id' => $employee->id,
        ]);
        $this->assertDatabaseHas('inv_disposals', [
            'asset_id' => $asset->id, 'method' => 'OBSOLESCENCIA',
        ]);
    }

    #[DataProvider('disposalMethods')]
    public function test_disposal_methods_have_explicit_terminal_states_and_movements(string $method, InvAssetOperationalState $state, string $movementType): void
    {
        ['admin' => $admin, 'asset' => $asset] = $this->fixtures();
        $retiredStatus = InvStatus::create(['name' => 'No asignable '.uniqid(), 'assignable' => false, 'is_active' => true]);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/retire", [
            'status_id' => $retiredStatus->id,
            'reason' => 'Reporte de '.$method,
            'method' => $method,
        ])->assertCreated();

        $this->assertAssetState($asset, $state, null);
        $this->assertDatabaseHas('inv_movements', ['asset_id' => $asset->id, 'type' => $movementType]);
        $this->assertSame($method, InvDisposal::where('asset_id', $asset->id)->value('method'));

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/retire", [
            'status_id' => $retiredStatus->id,
            'reason' => 'No debe repetirse',
            'method' => $method,
        ])->assertStatus(422);
    }

    public static function disposalMethods(): array
    {
        return [
            'retired from available' => ['RECICLAJE', InvAssetOperationalState::RETIRED, 'RETIRE'],
            'lost' => ['PERDIDA', InvAssetOperationalState::LOST, 'MARK_LOST'],
            'stolen' => ['ROBO', InvAssetOperationalState::STOLEN, 'MARK_STOLEN'],
        ];
    }

    public function test_assigned_asset_can_be_transferred_and_movement_keeps_origin_and_destination(): void
    {
        ['admin' => $admin, 'asset' => $asset, 'client' => $client, 'site' => $fromSite] = $this->fixtures();
        $employee = $this->clientUser($client->id, $fromSite);
        $toSite = $this->makeSite($client->id);
        $toLocation = DB::table('locations')->insertGetId([
            'site_id' => $toSite, 'name' => 'Almacén '.uniqid(), 'code' => 'LOC'.uniqid(),
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $asset->update([
            'current_user_id' => $employee->id,
            'operational_state' => InvAssetOperationalState::ASSIGNED,
        ]);

        $this->actingAs($admin, 'web')->postJson("/api/inv-assets/{$asset->id}/transfer", [
            'site_id' => $toSite,
            'location_id' => $toLocation,
        ])->assertCreated();

        $asset->refresh();
        $this->assertSame($toSite, $asset->site_id);
        $this->assertSame($toLocation, $asset->location_id);
        $this->assertSame(InvAssetOperationalState::ASSIGNED, $asset->operational_state);
        $movement = InvMovement::where('asset_id', $asset->id)->where('type', 'TRASLADO')->sole();
        $this->assertSame($fromSite, $movement->metadata['from_site_id']);
        $this->assertSame($toSite, $movement->metadata['to_site_id']);
        $this->assertSame($toLocation, $movement->metadata['to_location_id']);
    }

    private function fixtures(): array
    {
        $client = Client::factory()->create();
        $site = $this->makeSite($client->id);
        $admin = $this->clientUser($client->id, $site);
        setPermissionsTeamId(config('tenancy.super_admin_team_id'));
        $admin->givePermissionTo('inventory.manage_assets');
        $category = InvCategory::create(['name' => 'Laptops '.uniqid(), 'is_active' => true]);
        $status = InvStatus::create(['name' => 'Disponible '.uniqid(), 'assignable' => true, 'is_active' => true]);
        $asset = InvAsset::create([
            'internal_tag' => 'TAG-'.uniqid(),
            'name' => 'Laptop',
            'category_id' => $category->id,
            'status_id' => $status->id,
            'site_id' => $site,
            'client_id' => $client->id,
        ]);

        return compact('client', 'site', 'admin', 'asset');
    }

    private function assertAssetState(InvAsset $asset, InvAssetOperationalState $state, ?int $userId): void
    {
        $asset->refresh();
        $this->assertSame($state, $asset->operational_state);
        $this->assertSame($userId, $asset->current_user_id);
    }

    private function makeSite(int $clientId): int
    {
        $now = now();

        return DB::table('sites')->insertGetId([
            'client_id' => $clientId, 'name' => 'S'.uniqid(), 'code' => 'X'.uniqid(),
            'type' => 'physical', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    private function clientUser(int $clientId, int $siteId): User
    {
        $now = now();
        $areaId = DB::table('areas')->insertGetId(['name' => 'A'.uniqid(), 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        $positionId = DB::table('positions')->insertGetId(['name' => 'P'.uniqid(), 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);

        return User::create([
            'first_name' => 'T', 'paternal_last_name' => 'U', 'email' => uniqid().'@t.local',
            'password' => Hash::make('x'), 'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $areaId, 'position_id' => $positionId, 'site_id' => $siteId,
            'client_id' => $clientId, 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }
}
