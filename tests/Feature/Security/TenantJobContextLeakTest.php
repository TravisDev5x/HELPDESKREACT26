<?php

namespace Tests\Feature\Security;

use App\Jobs\ProcessInboundTicket;
use App\Models\Client;
use App\Models\User;
use App\Support\Tenancy\PgsqlRowLevelSecurity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesTenantFixtures;
use Tests\TestCase;

/** Regresión: los jobs de correo deben restaurar el contexto del worker. */
class TenantJobContextLeakTest extends TestCase
{
    use CreatesTenantFixtures;
    use RefreshDatabase;

    /** Defensa adicional para que una aserción fallida no contamine la suite. */
    protected function tearDown(): void
    {
        setPermissionsTeamId(null);
        if (PgsqlRowLevelSecurity::enabled()) {
            PgsqlRowLevelSecurity::clear();
        }

        parent::tearDown();
    }

    /**
     * El bypass de RLS se limpia DESPUÉS de crear las fixtures (no en
     * setUp()): CreatesTenantFixtures inserta filas por DB::table() crudo,
     * y con FORCE ROW LEVEL SECURITY esas inserciones necesitan el bypass
     * que TestCase::setUp() ya deja activo por default -- limpiarlo antes
     * de tiempo rompe la creación de fixtures con un error de RLS ajeno al
     * hallazgo que este test prueba.
     */
    private function resetTenantStateToClean(): void
    {
        setPermissionsTeamId(null);
        if (PgsqlRowLevelSecurity::enabled()) {
            PgsqlRowLevelSecurity::clear();
        }
    }

    public function test_inbound_email_job_restores_permissions_team_id_after_finishing(): void
    {
        $fixture = $this->createTenantFixtureSet();
        $tenant = Client::find($fixture['client_id']);
        DB::table('sites')->where('id', $fixture['site_id'])->update(['client_id' => $tenant->id, 'is_active' => true]);
        DB::table('users')->where('id', $fixture['user_id'])->update(['client_id' => $tenant->id]);
        $requesterEmail = User::find($fixture['user_id'])->email;

        $now = now();
        DB::table('ticket_types')->insertOrIgnore(['id' => 3, 'name' => 'Solicitud de cambio', 'code' => 'change_request', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('priorities')->insertOrIgnore(['id' => 3, 'name' => 'Media', 'level' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);

        $this->resetTenantStateToClean();
        $this->assertNull(getPermissionsTeamId(), 'Precondición: sin team_id antes de correr el job.');

        ProcessInboundTicket::dispatch($tenant->id, [
            'from' => $requesterEmail,
            'from_name' => 'Cliente',
            'to' => 'soporte@'.$tenant->portal_slug.'.tikara.mx',
            'subject' => 'Ayuda',
            'body_plain' => 'Detalle',
            'message_id' => '<leak-test@empresa.test>',
        ]);

        // El job ya terminó (QUEUE_CONNECTION=sync en tests).
        $this->assertNull(getPermissionsTeamId());
    }

    public function test_inbound_email_job_restores_rls_session_state_after_finishing(): void
    {
        if (! PgsqlRowLevelSecurity::enabled()) {
            $this->markTestSkipped('Requiere Postgres + TENANCY_PGSQL_RLS=true.');
        }

        $fixture = $this->createTenantFixtureSet();
        $tenant = Client::find($fixture['client_id']);
        DB::table('sites')->where('id', $fixture['site_id'])->update(['client_id' => $tenant->id, 'is_active' => true]);
        DB::table('users')->where('id', $fixture['user_id'])->update(['client_id' => $tenant->id]);
        $requesterEmail = User::find($fixture['user_id'])->email;

        $now = now();
        DB::table('ticket_types')->insertOrIgnore(['id' => 3, 'name' => 'Solicitud de cambio', 'code' => 'change_request', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('priorities')->insertOrIgnore(['id' => 3, 'name' => 'Media', 'level' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);

        $this->resetTenantStateToClean();
        $before = DB::selectOne("select current_setting('app.tenant_bypass', true) as v")->v;
        $this->assertNotSame('true', $before, 'Precondición: bypass no debe estar activo antes del job.');

        ProcessInboundTicket::dispatch($tenant->id, [
            'from' => $requesterEmail,
            'from_name' => 'Cliente',
            'to' => 'soporte@'.$tenant->portal_slug.'.tikara.mx',
            'subject' => 'Ayuda',
            'body_plain' => 'Detalle',
            'message_id' => '<leak-test-rls@empresa.test>',
        ]);

        $after = DB::selectOne("select current_setting('app.tenant_bypass', true) as v")->v;
        $this->assertNotSame('true', $after);
    }
}
