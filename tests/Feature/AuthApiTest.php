<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Area;
use App\Models\Position;
use App\Models\Sede;
use App\Models\Ubicacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createMinimalCatalog();
    }

    private function createMinimalCatalog(): void
    {
        Campaign::firstOrCreate(['name' => 'Test Campaign'], ['is_active' => true]);
        Area::firstOrCreate(['name' => 'Test Area'], ['is_active' => true]);
        Position::firstOrCreate(['name' => 'Test Position'], ['is_active' => true]);
        $sede = Sede::where('code', 'REMOTO')->first();
        if ($sede) {
            Ubicacion::firstOrCreate(
                ['sede_id' => $sede->id, 'name' => 'Virtual'],
                ['is_active' => true]
            );
        }
    }

    /**
     * Login con credenciales válidas devuelve user, roles y permissions.
     */
    public function test_login_success_returns_user_and_permissions(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'employee_number' => 'EMP001',
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'identifier' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'roles', 'permissions'])
            ->assertJsonPath('user.email', 'test@example.com');
    }

    /**
     * Login con credenciales inválidas devuelve 422.
     */
    public function test_login_invalid_credentials_returns_422(): void
    {
        $response = $this->postJson('/api/login', [
            'identifier' => 'nonexistent@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.root', 'Credenciales inválidas');
    }

    /**
     * check-auth sin autenticación devuelve user null.
     */
    public function test_check_auth_unauthenticated_returns_null_user(): void
    {
        $response = $this->getJson('/api/check-auth');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertArrayHasKey('user', $data);
        $this->assertNull($data['user']);
    }

    /**
     * check-auth autenticado devuelve user, roles y permissions.
     */
    public function test_check_auth_authenticated_returns_user(): void
    {
        $user = User::factory()->create([
            'email' => 'auth@example.com',
            'employee_number' => 'EMP002',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user, 'web')->getJson('/api/check-auth');

        $response->assertStatus(200)
            ->assertJsonPath('user.email', 'auth@example.com');
    }
}
