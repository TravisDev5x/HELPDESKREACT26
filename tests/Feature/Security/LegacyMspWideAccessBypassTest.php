<?php

namespace Tests\Feature\Security;

use App\Models\Client;
use App\Models\Ticket;
use App\Models\TicketSequence;
use App\Models\User;
use App\Services\TenantContextService;
use App\Support\Tenancy\PgsqlRowLevelSecurity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * C3 — el fallback "legacy MSP wide" concede visibilidad total sobre tickets.
 *
 * OperatorScopeService::usesLegacyMspWideAccess() devuelve true cuando se dan
 * a la vez: TENANCY_LEGACY_MSP_WIDE_ACCESS=true, contexto que NO es portal
 * estricto, usuario con tickets.manage_all y sin operador MSP resoluble. En
 * ese caso ClientScopeService::ticketVisibleToUser() hace `return true` sin
 * mirar a qué client pertenece el ticket (línea 366-368).
 *
 * Como update/release/alert/cancel/attach/canManageAction/canAssignTo pasan
 * todos por ticketVisibleToUser(), ese único `return true` convierte un
 * bypass de lectura en un bypass de escritura sobre cualquier tenant.
 *
 * El contexto de plataforma se alcanza por dos vías, y ambas se prueban aquí:
 *   a) el dominio raíz, que ya es modo plataforma por definición;
 *   b) el host de un portal de tenant + la cabecera X-Tenant-Subdomain con un
 *      slug reservado ('www'), que TenantContextService::extractSubdomain()
 *      traduce a null y degrada la petición a plataforma — de paso saltándose
 *      EnforceTenantBoundary, que sí habría rechazado a este usuario en ese
 *      portal.
 */
class LegacyMspWideAccessBypassTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Con RLS (Postgres) la fila ajena es invisible antes de la policy (404 en
     * el binding); sin RLS (SQLite) la policy la encuentra y la rechaza (403).
     * Mismo criterio que TenantApiIsolationTest.
     */
    private function assertTenantBoundaryDenied(TestResponse $response): void
    {
        $this->assertContains($response->status(), [403, 404]);
    }

    private function freshTicketForAssertion(Ticket $ticket): Ticket
    {
        PgsqlRowLevelSecurity::setBypass(true);

        return Ticket::query()->findOrFail($ticket->getKey());
    }

    /**
     * @return array<string, mixed>
     */
    private function createLegacyBypassWorld(): array
    {
        config([
            'tenancy.base_domain' => 'tikara.test',
            'tenancy.strict_client_portal' => true,
            'tenancy.enforce_subdomain' => true,
            // Precondición reportada en C3.
            'tenancy.legacy_msp_wide_access' => true,
        ]);

        foreach (['tickets.manage_all', 'tickets.assign', 'tickets.reassign'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $now = now();

        $areaId = DB::table('areas')->insertGetId([
            'name' => 'Área C3 '.uniqid(),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $positionId = DB::table('positions')->insertGetId([
            'name' => 'Puesto C3 '.uniqid(),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $priorityId = DB::table('priorities')->insertGetId([
            'name' => 'Media C3 '.uniqid(),
            'level' => 3,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $stateId = DB::table('ticket_states')->insertGetId([
            'name' => 'Abierto C3 '.uniqid(),
            'code' => 'abi_c3_'.uniqid(),
            'is_active' => true,
            'is_final' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $typeId = DB::table('ticket_types')->insertGetId([
            'name' => 'Tipo C3 '.uniqid(),
            'code' => 'tipo_c3_'.uniqid(),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Dos tenants completamente independientes. Ambos con operator_user_id
        // NULL: es el estado en que nace todo tenant creado por autoservicio
        // (TenantOnboardingController no asigna esa columna en ningún paso).
        $clientA = Client::create([
            'name' => 'Tenant A C3',
            'portal_slug' => 'tenant-a-'.uniqid(),
            'operator_user_id' => null,
            'is_active' => true,
        ]);
        $clientB = Client::create([
            'name' => 'Tenant B C3',
            'portal_slug' => 'tenant-b-'.uniqid(),
            'operator_user_id' => null,
            'is_active' => true,
        ]);

        $siteA = DB::table('sites')->insertGetId([
            'name' => 'Sede A C3',
            'code' => 'SAC3-'.random_int(1000, 9999),
            'type' => 'physical',
            'is_active' => true,
            'client_id' => $clientA->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $siteB = DB::table('sites')->insertGetId([
            'name' => 'Sede B C3',
            'code' => 'SBC3-'.random_int(1000, 9999),
            'type' => 'physical',
            'is_active' => true,
            'client_id' => $clientB->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // ATACANTE: administrador con tickets.manage_all pero SIN vínculo de
        // tenant resoluble (users.site_id y users.client_id nulos), que es lo
        // que hace que TenantClientResolver::resolve() devuelva null y, con
        // ello, que usesOperatorMspWideScope() -> usesLegacyMspWideAccess()
        // sean alcanzables. Es el perfil "admin legacy de plataforma" que el
        // propio OperatorScopeService::legacyOperatorCandidates() enumera.
        // El permiso se otorga bajo el team centinela porque ApplyPgsqlTenantRls
        // fija ese team_id justamente cuando resolve() es null.
        $attacker = User::create([
            'first_name' => 'Admin',
            'paternal_last_name' => 'Legacy',
            'email' => 'legacy-admin-'.uniqid().'@c3.test',
            'password' => Hash::make('password'),
            'employee_number' => 'LG'.random_int(100000, 999999),
            'area_id' => $areaId,
            'position_id' => $positionId,
            'site_id' => null,
            'client_id' => null,
            'status' => 'active',
            'is_operator' => false,
            'onboarding_completed' => true,
            'email_verified_at' => $now,
        ]);
        setPermissionsTeamId(config('tenancy.super_admin_team_id'));
        $attacker->givePermissionTo(['tickets.manage_all', 'tickets.assign', 'tickets.reassign']);

        // VÍCTIMA: agente propio del tenant B, con site_user en la sede del
        // ticket B para que la validación de destino de canAssignTo() no sea
        // la que rechace la asignación — queremos que lo único en juego sea C3.
        $agentB = User::create([
            'first_name' => 'Agente',
            'paternal_last_name' => 'Beta',
            'email' => 'agent-b-'.uniqid().'@c3.test',
            'password' => Hash::make('password'),
            'employee_number' => 'AB'.random_int(100000, 999999),
            'area_id' => $areaId,
            'position_id' => $positionId,
            'site_id' => $siteB,
            'client_id' => $clientB->id,
            'status' => 'active',
            'email_verified_at' => $now,
        ]);
        DB::table('site_user')->insert(['site_id' => $siteB, 'user_id' => $agentB->id]);

        $ticketA = Ticket::create([
            'subject' => 'Ticket del tenant A',
            'folio' => 'A'.str_pad((string) TicketSequence::nextNumberFor($clientA->id), 5, '0', STR_PAD_LEFT),
            'area_origin_id' => $areaId,
            'area_current_id' => $areaId,
            'site_id' => $siteA,
            'client_id' => $clientA->id,
            'requester_id' => $agentB->id,
            'ticket_type_id' => $typeId,
            'priority_id' => $priorityId,
            'ticket_state_id' => $stateId,
        ]);

        $ticketB = Ticket::create([
            'subject' => 'Ticket confidencial del tenant B',
            'folio' => 'B'.str_pad((string) TicketSequence::nextNumberFor($clientB->id), 5, '0', STR_PAD_LEFT),
            'area_origin_id' => $areaId,
            'area_current_id' => $areaId,
            'site_id' => $siteB,
            'client_id' => $clientB->id,
            'requester_id' => $agentB->id,
            'ticket_type_id' => $typeId,
            'priority_id' => $priorityId,
            'ticket_state_id' => $stateId,
        ]);

        $this->app->forgetInstance(TenantContextService::class);

        return [
            'clientA' => $clientA,
            'clientB' => $clientB,
            'siteA' => $siteA,
            'siteB' => $siteB,
            'attacker' => $attacker,
            'agentB' => $agentB,
            'ticketA' => $ticketA,
            'ticketB' => $ticketB,
            'areaId' => $areaId,
            'stateId' => $stateId,
        ];
    }

    private function rootUrl(string $path): string
    {
        return 'http://tikara.test/'.ltrim($path, '/');
    }

    private function portalUrl(Client $client, string $path): string
    {
        return 'http://'.$client->portal_slug.'.tikara.test/'.ltrim($path, '/');
    }

    /** Cabecera que degrada el contexto a plataforma desde un host de portal. */
    private function reservedSlugHeader(): array
    {
        return ['X-Tenant-Subdomain' => 'www'];
    }

    // -----------------------------------------------------------------
    // READ
    // -----------------------------------------------------------------

    public function test_legacy_admin_cannot_read_a_foreign_tenant_ticket_from_the_root_domain(): void
    {
        $world = $this->createLegacyBypassWorld();

        $response = $this->actingAs($world['attacker'], 'web')
            ->getJson($this->rootUrl('/api/tickets/'.$world['ticketB']->id));

        $this->assertTenantBoundaryDenied($response);
    }

    public function test_legacy_admin_cannot_read_a_foreign_tenant_ticket_via_reserved_subdomain_header(): void
    {
        $world = $this->createLegacyBypassWorld();

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->getJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id));

        $this->assertTenantBoundaryDenied($response);
    }

    public function test_legacy_admin_cannot_list_foreign_tenant_tickets(): void
    {
        $world = $this->createLegacyBypassWorld();

        $response = $this->actingAs($world['attacker'], 'web')
            ->getJson($this->rootUrl('/api/tickets'));

        $subjects = $response->isOk()
            ? collect($response->json('data'))->pluck('subject')
            : collect();

        $this->assertFalse(
            $subjects->contains('Ticket confidencial del tenant B'),
            'El listado expuso el ticket de otro tenant.'
        );
    }

    // -----------------------------------------------------------------
    // UPDATE
    // -----------------------------------------------------------------

    public function test_legacy_admin_cannot_update_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();
        $before = $world['ticketB']->fresh();

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->patchJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id), [
                'due_at' => now()->addDays(9)->toIso8601String(),
            ]);

        $this->assertTenantBoundaryDenied($response);

        $after = $this->freshTicketForAssertion($world['ticketB']);
        $this->assertNull($after->due_at, 'due_at del ticket ajeno fue mutado.');
        $this->assertSame($before->updated_at?->toIso8601String(), $after->updated_at?->toIso8601String());
    }

    public function test_legacy_admin_cannot_comment_on_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->patchJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id), [
                'note' => 'Comentario inyectado desde otro tenant',
                'is_internal' => false,
            ]);

        $this->assertTenantBoundaryDenied($response);

        $this->assertDatabaseMissing('ticket_histories', [
            'ticket_id' => $world['ticketB']->id,
            'actor_id' => $world['attacker']->id,
        ]);
    }

    // -----------------------------------------------------------------
    // ATTACH
    // -----------------------------------------------------------------

    public function test_legacy_admin_cannot_attach_a_file_to_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->post($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id.'/attachments'), [
                'attachments' => [UploadedFile::fake()->create('evidencia.txt', 4)],
            ], ['Accept' => 'application/json']);

        $this->assertTenantBoundaryDenied($response);

        $this->assertDatabaseMissing('ticket_attachments', [
            'ticket_id' => $world['ticketB']->id,
        ]);
    }

    // -----------------------------------------------------------------
    // TAKE / ASSIGN
    // -----------------------------------------------------------------

    public function test_legacy_admin_cannot_take_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->postJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id.'/take'));

        $this->assertTenantBoundaryDenied($response);
        $this->assertNull($this->freshTicketForAssertion($world['ticketB'])->assigned_user_id);
    }

    public function test_legacy_admin_cannot_assign_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->postJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id.'/assign'), [
                'assigned_user_id' => $world['agentB']->id,
            ]);

        $this->assertTenantBoundaryDenied($response);
        $this->assertNull($this->freshTicketForAssertion($world['ticketB'])->assigned_user_id);
    }

    // -----------------------------------------------------------------
    // ESCALATE / RELEASE / ALERT / CANCEL
    // -----------------------------------------------------------------

    public function test_legacy_admin_cannot_escalate_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();

        $otherAreaId = DB::table('areas')->insertGetId([
            'name' => 'Área destino C3 '.uniqid(),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->postJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id.'/escalate'), [
                'area_destino_id' => $otherAreaId,
            ]);

        $this->assertTenantBoundaryDenied($response);
        $this->assertSame($world['areaId'], (int) $this->freshTicketForAssertion($world['ticketB'])->area_current_id);
    }

    public function test_legacy_admin_cannot_release_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();
        $world['ticketB']->forceFill([
            'assigned_user_id' => $world['agentB']->id,
            'assigned_at' => now(),
        ])->save();

        $response = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->postJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id.'/unassign'));

        $this->assertTenantBoundaryDenied($response);
        $this->assertSame(
            (int) $world['agentB']->id,
            (int) $this->freshTicketForAssertion($world['ticketB'])->assigned_user_id,
            'El ticket ajeno fue liberado.'
        );
    }

    public function test_legacy_admin_cannot_alert_or_cancel_a_foreign_tenant_ticket(): void
    {
        $world = $this->createLegacyBypassWorld();

        $alert = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->postJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id.'/alert'), [
                'message' => 'alerta cross-tenant',
            ]);
        $this->assertTenantBoundaryDenied($alert);
        $this->assertDatabaseMissing('ticket_alerts', ['ticket_id' => $world['ticketB']->id]);

        $cancel = $this->actingAs($world['attacker'], 'web')
            ->withHeaders($this->reservedSlugHeader())
            ->postJson($this->portalUrl($world['clientA'], '/api/tickets/'.$world['ticketB']->id.'/cancel'));
        $this->assertTenantBoundaryDenied($cancel);
        $this->assertSame($world['stateId'], (int) $this->freshTicketForAssertion($world['ticketB'])->ticket_state_id);
    }

    // -----------------------------------------------------------------
    // Control: el fallback legacy no debe romper al operador MSP legítimo.
    // -----------------------------------------------------------------

    public function test_a_real_msp_operator_still_reaches_the_tickets_of_their_own_clients(): void
    {
        $world = $this->createLegacyBypassWorld();

        $operator = User::create([
            'first_name' => 'Operador',
            'paternal_last_name' => 'Real',
            'email' => 'op-real-'.uniqid().'@c3.test',
            'password' => Hash::make('password'),
            'employee_number' => 'OR'.random_int(100000, 999999),
            'area_id' => $world['areaId'],
            'position_id' => null,
            'site_id' => null,
            'client_id' => null,
            'status' => 'active',
            'is_operator' => true,
            'onboarding_completed' => true,
            'email_verified_at' => now(),
        ]);
        setPermissionsTeamId(config('tenancy.super_admin_team_id'));
        $operator->givePermissionTo(['tickets.manage_all']);

        // El operador es dueño del tenant B, no del A.
        $world['clientB']->forceFill(['operator_user_id' => $operator->id])->save();
        $this->app->forgetInstance(TenantContextService::class);

        $own = $this->actingAs($operator, 'web')
            ->getJson($this->rootUrl('/api/tickets/'.$world['ticketB']->id));
        $own->assertOk()->assertJsonPath('subject', 'Ticket confidencial del tenant B');

        $this->app['auth']->forgetGuards();

        $foreign = $this->actingAs($operator, 'web')
            ->getJson($this->rootUrl('/api/tickets/'.$world['ticketA']->id));
        $this->assertTenantBoundaryDenied($foreign);
    }
}
