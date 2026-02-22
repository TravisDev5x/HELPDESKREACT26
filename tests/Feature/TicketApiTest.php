<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Campaign;
use App\Models\Position;
use App\Models\Priority;
use App\Models\Sede;
use App\Models\Ticket;
use App\Models\TicketState;
use App\Models\TicketType;
use App\Models\Ubicacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TicketApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Area $areaOrigin;
    private Area $areaCurrent;
    private Sede $sede;
    private TicketType $ticketType;
    private Priority $priority;
    private TicketState $ticketState;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createMinimalCatalog();
        $this->createUserWithTicketPermission();
    }

    private function createMinimalCatalog(): void
    {
        Campaign::firstOrCreate(['name' => 'Test Campaign'], ['is_active' => true]);
        $this->areaOrigin = Area::firstOrCreate(['name' => 'Area Origin'], ['is_active' => true]);
        $this->areaCurrent = Area::firstOrCreate(['name' => 'Area Current'], ['is_active' => true]);
        Position::firstOrCreate(['name' => 'Test Position'], ['is_active' => true]);
        $this->sede = Sede::where('code', 'REMOTO')->first();
        if ($this->sede) {
            Ubicacion::firstOrCreate(
                ['sede_id' => $this->sede->id, 'name' => 'Virtual'],
                ['is_active' => true]
            );
        }
        $this->ticketType = TicketType::firstOrCreate(
            ['name' => 'Test Type'],
            ['code' => 'test_type', 'is_active' => true]
        );
        $this->priority = Priority::firstOrCreate(
            ['name' => 'Media'],
            ['level' => 2, 'is_active' => true]
        );
        $this->ticketState = TicketState::firstOrCreate(
            ['name' => 'Abierto'],
            ['code' => 'abierto', 'is_active' => true, 'is_final' => false]
        );
    }

    private function createUserWithTicketPermission(): void
    {
        $this->user = User::factory()->create([
            'email' => 'ticketuser@example.com',
            'employee_number' => 'TKT001',
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
        ]);

        $adminRole = Role::where('name', 'admin')->where('guard_name', 'web')->first();
        if ($adminRole) {
            $this->user->assignRole($adminRole);
        }
    }

    /**
     * GET /api/tickets sin autenticación devuelve 401.
     */
    public function test_tickets_index_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/tickets');

        $response->assertStatus(401);
    }

    /**
     * GET /api/tickets autenticado con permiso devuelve 200 y estructura paginada.
     */
    public function test_tickets_index_authenticated_returns_paginated(): void
    {
        $response = $this->actingAs($this->user, 'web')->getJson('/api/tickets');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    /**
     * POST /api/tickets con payload válido devuelve 201 y ticket con relaciones.
     */
    public function test_tickets_store_valid_returns_201(): void
    {
        $payload = [
            'subject' => 'Ticket de prueba',
            'description' => 'Descripción opcional',
            'area_origin_id' => $this->areaOrigin->id,
            'area_current_id' => $this->areaCurrent->id,
            'sede_id' => $this->sede->id,
            'ubicacion_id' => null,
            'ticket_type_id' => $this->ticketType->id,
            'priority_id' => $this->priority->id,
            'ticket_state_id' => $this->ticketState->id,
            'created_at' => now()->toIso8601String(),
        ];

        $response = $this->actingAs($this->user, 'web')->postJson('/api/tickets', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('subject', 'Ticket de prueba')
            ->assertJsonPath('area_origin_id', $this->areaOrigin->id)
            ->assertJsonPath('sede_id', $this->sede->id);

        $this->assertDatabaseHas('tickets', ['subject' => 'Ticket de prueba']);
    }

    /**
     * GET /api/tickets/{id} autenticado devuelve 200 y ticket.
     */
    public function test_tickets_show_authenticated_returns_ticket(): void
    {
        $ticket = Ticket::create([
            'subject' => 'Ticket show test',
            'area_origin_id' => $this->areaOrigin->id,
            'area_current_id' => $this->areaCurrent->id,
            'sede_id' => $this->sede->id,
            'requester_id' => $this->user->id,
            'ticket_type_id' => $this->ticketType->id,
            'priority_id' => $this->priority->id,
            'ticket_state_id' => $this->ticketState->id,
        ]);

        $response = $this->actingAs($this->user, 'web')->getJson("/api/tickets/{$ticket->id}");

        $response->assertStatus(200)
            ->assertJsonPath('id', $ticket->id)
            ->assertJsonPath('subject', 'Ticket show test');
    }
}
