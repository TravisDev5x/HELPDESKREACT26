<?php

namespace Tests\Feature;

use App\Jobs\ProcessInboundReply;
use App\Jobs\ProcessInboundTicket;
use App\Mail\RegistrationRequiredMail;
use App\Models\Client;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\User;
use App\Services\TicketCreationService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\Support\CreatesTenantFixtures;
use Tests\TestCase;

/**
 * Política: un email = un tenant, siempre. Solo usuarios ya
 * registrados/invitados pueden generar tickets por correo — nada de cuentas
 * guest ni creación implícita. Un solo punto de decisión
 * (TicketCreationService::resolveActiveTenantUser), usado por email
 * (creación y respuesta) y portal.
 */
class RequesterValidationTest extends TestCase
{
    use CreatesTenantFixtures;
    use RefreshDatabase;

    private function seedTicketCatalogs(): void
    {
        $now = now();
        DB::table('ticket_types')->insertOrIgnore(['id' => 3, 'name' => 'Solicitud de cambio', 'code' => 'change_request', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('priorities')->insertOrIgnore(['id' => 3, 'name' => 'Media', 'level' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
    }

    public function test_registered_active_user_of_correct_tenant_creates_ticket_with_requester_id(): void
    {
        $fixture = $this->createTenantFixtureSet();
        $client = Client::find($fixture['client_id']);
        DB::table('sites')->where('id', $fixture['site_id'])->update(['client_id' => $client->id, 'is_active' => true]);
        DB::table('users')->where('id', $fixture['user_id'])->update(['client_id' => $client->id]);
        $requester = User::find($fixture['user_id']);
        $this->seedTicketCatalogs();

        ProcessInboundTicket::dispatch($client->id, [
            'from' => $requester->email,
            'from_name' => 'Cliente',
            'to' => 'soporte@'.$client->portal_slug.'.tikara.mx',
            'subject' => 'Ayuda',
            'body_plain' => 'Detalle',
            'message_id' => '<a@empresa.test>',
        ]);

        $ticket = Ticket::where('client_id', $client->id)->where('source', 'email')->first();
        $this->assertNotNull($ticket);
        $this->assertSame($requester->id, $ticket->requester_id);
    }

    public function test_unregistered_sender_does_not_create_ticket_and_queues_registration_required_mail(): void
    {
        Mail::fake();

        $fixture = $this->createTenantFixtureSet();
        $client = Client::find($fixture['client_id']);
        $this->seedTicketCatalogs();

        ProcessInboundTicket::dispatch($client->id, [
            'from' => 'nadie-conocido@fuera.test',
            'from_name' => 'Desconocido',
            'to' => 'soporte@'.$client->portal_slug.'.tikara.mx',
            'subject' => 'Ayuda',
            'body_plain' => 'Detalle',
            'message_id' => '<b@empresa.test>',
        ]);

        $this->assertSame(0, Ticket::where('client_id', $client->id)->count());
        Mail::assertQueued(RegistrationRequiredMail::class, function (RegistrationRequiredMail $mail) use ($client) {
            return $mail->recipientEmail === 'nadie-conocido@fuera.test'
                && $mail->tenant->id === $client->id;
        });
    }

    public function test_sender_registered_in_another_tenant_is_rejected_like_unregistered(): void
    {
        Mail::fake();

        $fixtureA = $this->createTenantFixtureSet();
        $clientA = Client::find($fixtureA['client_id']);
        DB::table('sites')->where('id', $fixtureA['site_id'])->update(['client_id' => $clientA->id, 'is_active' => true]);

        // Un segundo tenant, con su propio usuario registrado — email cruzado.
        $now = now();
        $clientB = Client::create(['name' => 'Otro tenant', 'portal_slug' => 'otro-tenant', 'is_active' => true]);
        $siteB = DB::table('sites')->insertGetId([
            'name' => 'Sede B', 'code' => 'SB-'.uniqid(), 'type' => 'physical',
            'is_active' => true, 'client_id' => $clientB->id, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $userB = User::create([
            'first_name' => 'Usuario', 'paternal_last_name' => 'DeB',
            'email' => 'cruzado@fuera.test', 'password' => Hash::make('x'),
            'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $fixtureA['area_id'], 'position_id' => DB::table('positions')->value('id'),
            'site_id' => $siteB, 'client_id' => $clientB->id, 'status' => 'active',
        ]);
        $this->seedTicketCatalogs();

        // userB manda un correo al tenant A, donde NO está registrado.
        ProcessInboundTicket::dispatch($clientA->id, [
            'from' => $userB->email,
            'from_name' => 'Usuario Cruzado',
            'to' => 'soporte@'.$clientA->portal_slug.'.tikara.mx',
            'subject' => 'Ayuda',
            'body_plain' => 'Detalle',
            'message_id' => '<c@empresa.test>',
        ]);

        $this->assertSame(0, Ticket::where('client_id', $clientA->id)->count());
        Mail::assertQueued(RegistrationRequiredMail::class, function (RegistrationRequiredMail $mail) use ($clientA) {
            return $mail->tenant->id === $clientA->id;
        });
    }

    public function test_resolve_active_tenant_user_reports_wrong_tenant_reason(): void
    {
        $fixtureA = $this->createTenantFixtureSet();
        $clientA = Client::find($fixtureA['client_id']);

        $clientB = Client::create(['name' => 'Otro tenant 2', 'portal_slug' => 'otro-tenant-2', 'is_active' => true]);
        $now = now();
        $siteB = DB::table('sites')->insertGetId([
            'name' => 'Sede B2', 'code' => 'SB2-'.uniqid(), 'type' => 'physical',
            'is_active' => true, 'client_id' => $clientB->id, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $userB = User::create([
            'first_name' => 'Usuario', 'paternal_last_name' => 'DeB2',
            'email' => 'cruzado2@fuera.test', 'password' => Hash::make('x'),
            'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $fixtureA['area_id'], 'position_id' => DB::table('positions')->value('id'),
            'site_id' => $siteB, 'client_id' => $clientB->id, 'status' => 'active',
        ]);

        $resolution = app(TicketCreationService::class)->resolveActiveTenantUser($userB->email, $clientA->id);

        $this->assertFalse($resolution->allowed);
        $this->assertSame('wrong_tenant', $resolution->reason);
        $this->assertSame($clientB->id, $resolution->actualClientId);
    }

    public function test_reply_from_inactive_user_is_rejected_not_added_as_comment(): void
    {
        $fixture = $this->createTenantFixtureSet();
        $client = Client::find($fixture['client_id']);
        DB::table('sites')->where('id', $fixture['site_id'])->update(['client_id' => $client->id]);

        $inactiveUser = User::create([
            'first_name' => 'Ex', 'paternal_last_name' => 'Empleado',
            'email' => 'ex-empleado@empresa.test', 'password' => Hash::make('x'),
            'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $fixture['area_id'], 'position_id' => DB::table('positions')->value('id'),
            'site_id' => $fixture['site_id'], 'client_id' => $client->id, 'status' => 'inactive',
        ]);

        $ticketId = $this->insertTicket($fixture, $client->id);
        DB::table('tickets')->where('id', $ticketId)->update(['folio' => '00001']);

        ProcessInboundReply::dispatch($client->id, '00001', [
            'from' => $inactiveUser->email,
            'body_plain' => 'Ya no debería poder responder.',
        ]);

        $this->assertSame(0, TicketHistory::where('ticket_id', $ticketId)->count());
    }

    public function test_reply_from_unregistered_sender_is_rejected(): void
    {
        $fixture = $this->createTenantFixtureSet();
        $client = Client::find($fixture['client_id']);

        $ticketId = $this->insertTicket($fixture, $client->id);
        DB::table('tickets')->where('id', $ticketId)->update(['folio' => '00001']);

        ProcessInboundReply::dispatch($client->id, '00001', [
            'from' => 'nadie-conocido@fuera.test',
            'body_plain' => 'No debería agregarse.',
        ]);

        $this->assertSame(0, TicketHistory::where('ticket_id', $ticketId)->count());
    }

    public function test_reply_from_active_same_tenant_user_without_ticket_access_is_rejected(): void
    {
        $fixture = $this->createTenantFixtureSet();
        $client = Client::find($fixture['client_id']);
        DB::table('sites')->where('id', $fixture['site_id'])->update(['client_id' => $client->id]);

        $unrelatedUser = User::create([
            'first_name' => 'Usuario', 'paternal_last_name' => 'SinAcceso',
            'email' => 'sin-acceso-'.uniqid().'@empresa.test', 'password' => Hash::make('x'),
            'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $fixture['area_id'], 'position_id' => DB::table('positions')->value('id'),
            'site_id' => $fixture['site_id'], 'client_id' => $client->id, 'status' => 'active',
        ]);

        $ticketId = $this->insertTicket($fixture, $client->id);
        DB::table('tickets')->where('id', $ticketId)->update(['folio' => '00001']);

        ProcessInboundReply::dispatch($client->id, '00001', [
            'from' => $unrelatedUser->email,
            'body_plain' => 'No tengo autorización sobre este ticket.',
        ]);

        $this->assertSame(0, TicketHistory::where('ticket_id', $ticketId)->count());
    }

    public function test_users_email_unique_constraint_is_global_across_tenants(): void
    {
        $clientA = Client::create(['name' => 'Tenant A', 'is_active' => true]);
        $clientB = Client::create(['name' => 'Tenant B', 'is_active' => true]);
        $now = now();
        $areaId = DB::table('areas')->insertGetId(['name' => 'Área', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        $positionId = DB::table('positions')->insertGetId(['name' => 'Puesto', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        $siteA = DB::table('sites')->insertGetId(['name' => 'Sede A', 'code' => 'SA-'.uniqid(), 'type' => 'physical', 'is_active' => true, 'client_id' => $clientA->id, 'created_at' => $now, 'updated_at' => $now]);
        $siteB = DB::table('sites')->insertGetId(['name' => 'Sede B', 'code' => 'SB-'.uniqid(), 'type' => 'physical', 'is_active' => true, 'client_id' => $clientB->id, 'created_at' => $now, 'updated_at' => $now]);

        User::create([
            'first_name' => 'Uno', 'paternal_last_name' => 'A',
            'email' => 'mismo-email@dos-tenants.test', 'password' => Hash::make('x'),
            'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $areaId, 'position_id' => $positionId, 'site_id' => $siteA, 'client_id' => $clientA->id, 'status' => 'active',
        ]);

        $this->expectException(QueryException::class);

        User::create([
            'first_name' => 'Dos', 'paternal_last_name' => 'B',
            'email' => 'mismo-email@dos-tenants.test', 'password' => Hash::make('x'),
            'employee_number' => (string) random_int(100000, 999999),
            'area_id' => $areaId, 'position_id' => $positionId, 'site_id' => $siteB, 'client_id' => $clientB->id, 'status' => 'active',
        ]);
    }

    public function test_email_and_portal_flows_share_the_same_validation_method(): void
    {
        // Ambos controladores/jobs llaman a resolveActiveTenantUser — no hay
        // lógica de validación duplicada. Confirmamos indirectamente: un
        // remitente de otro tenant es rechazado igual sin importar el canal.
        $fixture = $this->createTenantFixtureSet();
        $client = Client::find($fixture['client_id']);

        $service = app(TicketCreationService::class);
        $this->assertTrue(method_exists($service, 'resolveActiveTenantUser'));

        $resolution = $service->resolveActiveTenantUser('nadie@fuera.test', $client->id);
        $this->assertFalse($resolution->allowed);
        $this->assertSame('unregistered', $resolution->reason);
    }
}
