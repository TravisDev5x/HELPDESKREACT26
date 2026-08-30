<?php

namespace Tests\Feature\Security;

use App\Models\Client;
use App\Models\TicketMacro;
use App\Models\User;
use App\Services\TenantContextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * C4 — ticket_macros es el único catálogo de tickets que nunca entró en el
 * modelo de catálogos maestros documentado en docs/CATALOG_TENANCY_MODEL.md
 * (plataforma con operator_user_id NULL + operador MSP dueño de la fila).
 *
 * Los otros 17 catálogos registrados en OperatorCatalogScopeService::CATALOG_TABLES
 * llevan operator_user_id y se filtran con ese servicio; ticket_macros no tiene
 * la columna, no está en el registro y TicketMacroController no aplica ningún
 * scope ni policy. docs/API_TENANCY_AUDIT.md ya lo tenía marcado como
 * "⚠️ Revisar operador".
 *
 * El alcance correcto es el OPERADOR MSP, no el client: un operador que atiende
 * varias empresas usa las mismas respuestas predefinidas para todas.
 */
class TicketMacroOperatorScopeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Dos operadores MSP independientes, cada uno con su empresa cliente y su
     * agente. Las macros se crean SIEMPRE por la API como el usuario dueño,
     * para no depender de una columna concreta de propiedad.
     *
     * @return array<string, mixed>
     */
    private function createTwoOperatorWorld(): array
    {
        config([
            'tenancy.base_domain' => 'tikara.test',
            'tenancy.strict_client_portal' => true,
            'tenancy.catalog_per_client' => false,
            'tenancy.legacy_msp_wide_access' => false,
        ]);

        foreach (['tickets.manage_all', 'tickets.create', 'catalogs.manage'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $now = now();
        $areaId = DB::table('areas')->insertGetId([
            'name' => 'Área C4 '.uniqid(),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $build = function (string $tag) use ($areaId, $now) {
            $operator = User::create([
                'first_name' => 'Operador',
                'paternal_last_name' => strtoupper($tag),
                'email' => 'op-'.$tag.'-'.uniqid().'@c4.test',
                'password' => Hash::make('password'),
                'employee_number' => strtoupper($tag).random_int(100000, 999999),
                'area_id' => $areaId,
                'status' => 'active',
                'is_operator' => true,
                'onboarding_completed' => true,
                'email_verified_at' => $now,
            ]);

            $client = Client::create([
                'name' => 'Empresa '.strtoupper($tag).' C4',
                'portal_slug' => 'c4-'.$tag.'-'.uniqid(),
                'operator_user_id' => $operator->id,
                'is_active' => true,
            ]);

            $siteId = DB::table('sites')->insertGetId([
                'name' => 'Sede '.strtoupper($tag),
                'code' => strtoupper($tag).'-'.random_int(1000, 9999),
                'type' => 'physical',
                'is_active' => true,
                'client_id' => $client->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $agent = User::create([
                'first_name' => 'Agente',
                'paternal_last_name' => strtoupper($tag),
                'email' => 'agent-'.$tag.'-'.uniqid().'@c4.test',
                'password' => Hash::make('password'),
                'employee_number' => 'AG'.strtoupper($tag).random_int(10000, 99999),
                'area_id' => $areaId,
                'site_id' => $siteId,
                'client_id' => $client->id,
                'status' => 'active',
                'email_verified_at' => $now,
            ]);
            setPermissionsTeamId($client->id);
            $agent->givePermissionTo(['tickets.manage_all', 'tickets.create', 'catalogs.manage']);

            return ['operator' => $operator, 'client' => $client, 'siteId' => $siteId, 'agent' => $agent];
        };

        $a = $build('a');
        $b = $build('b');

        $this->app->forgetInstance(TenantContextService::class);

        return ['a' => $a, 'b' => $b, 'areaId' => $areaId];
    }

    private function actAs(User $user): self
    {
        $this->app['auth']->forgetGuards();
        $this->app->forgetInstance(TenantContextService::class);
        $this->actingAs($user, 'web');

        return $this;
    }

    /** Crea una macro por la API como $user y devuelve su id. */
    private function createMacroAs(User $user, string $name, string $content): int
    {
        $response = $this->actAs($user)->postJson('/api/ticket-macros', [
            'name' => $name,
            'content' => $content,
            'category' => 'Pruebas C4',
            'is_active' => true,
        ]);

        $response->assertCreated();

        return (int) $response->json('id');
    }

    // -----------------------------------------------------------------
    // LECTURA
    // -----------------------------------------------------------------

    public function test_listing_does_not_expose_macros_of_another_operator(): void
    {
        $world = $this->createTwoOperatorWorld();

        $this->createMacroAs($world['a']['agent'], 'Macro de A', 'Contenido privado de A');
        $this->createMacroAs($world['b']['agent'], 'Macro de B', 'Contenido privado de B');

        $names = collect(
            $this->actAs($world['a']['agent'])->getJson('/api/ticket-macros')->assertOk()->json()
        )->pluck('name');

        $this->assertTrue($names->contains('Macro de A'), 'El dueño no ve su propia macro.');
        $this->assertFalse($names->contains('Macro de B'), 'El listado expuso la macro de otro operador.');
    }

    public function test_show_does_not_expose_a_macro_of_another_operator(): void
    {
        $world = $this->createTwoOperatorWorld();
        $macroB = $this->createMacroAs($world['b']['agent'], 'Macro de B', 'Contenido privado de B');

        $response = $this->actAs($world['a']['agent'])->getJson('/api/ticket-macros/'.$macroB);

        $response->assertForbidden();
        $this->assertStringNotContainsString('Contenido privado de B', $response->getContent());
    }

    public function test_inertia_catalog_page_does_not_expose_macros_of_another_operator(): void
    {
        $world = $this->createTwoOperatorWorld();
        $this->createMacroAs($world['b']['agent'], 'Macro de B', 'Contenido privado de B');

        $response = $this->actAs($world['a']['agent'])->get('/ticket-macros');
        $response->assertOk();

        $this->assertStringNotContainsString('Macro de B', $response->getContent());
    }

    // -----------------------------------------------------------------
    // ESCRITURA
    // -----------------------------------------------------------------

    public function test_update_of_a_macro_of_another_operator_is_rejected(): void
    {
        $world = $this->createTwoOperatorWorld();
        $macroB = $this->createMacroAs($world['b']['agent'], 'Macro de B', 'Contenido privado de B');

        $this->actAs($world['a']['agent'])->putJson('/api/ticket-macros/'.$macroB, [
            'name' => 'Secuestrada por A',
            'content' => 'Texto inyectado por A',
        ])->assertForbidden();

        $fresh = TicketMacro::find($macroB);
        $this->assertSame('Macro de B', $fresh->name);
        $this->assertSame('Contenido privado de B', $fresh->content);
    }

    public function test_delete_of_a_macro_of_another_operator_is_rejected(): void
    {
        $world = $this->createTwoOperatorWorld();
        $macroB = $this->createMacroAs($world['b']['agent'], 'Macro de B', 'Contenido privado de B');

        $this->actAs($world['a']['agent'])->deleteJson('/api/ticket-macros/'.$macroB)->assertForbidden();

        $this->assertDatabaseHas('ticket_macros', ['id' => $macroB, 'name' => 'Macro de B']);
    }

    // -----------------------------------------------------------------
    // CASO POSITIVO — el dueño conserva el control de su macro
    // -----------------------------------------------------------------

    public function test_owner_can_read_update_and_delete_their_own_macro(): void
    {
        $world = $this->createTwoOperatorWorld();
        $macroB = $this->createMacroAs($world['b']['agent'], 'Macro de B', 'Contenido privado de B');

        $this->actAs($world['b']['agent'])->getJson('/api/ticket-macros/'.$macroB)
            ->assertOk()
            ->assertJsonPath('name', 'Macro de B');

        $this->actAs($world['b']['agent'])->putJson('/api/ticket-macros/'.$macroB, [
            'name' => 'Macro de B revisada',
            'content' => 'Contenido actualizado por su dueño',
        ])->assertOk();

        $this->assertDatabaseHas('ticket_macros', ['id' => $macroB, 'name' => 'Macro de B revisada']);

        $this->actAs($world['b']['agent'])->deleteJson('/api/ticket-macros/'.$macroB)->assertNoContent();
        $this->assertDatabaseMissing('ticket_macros', ['id' => $macroB]);
    }

    /**
     * Macros de plataforma (las que siembra TicketMacroSeeder, sin operador):
     * el modelo de catálogos maestros dice que son visibles para todos.
     */
    public function test_platform_macros_remain_visible_to_every_operator(): void
    {
        $world = $this->createTwoOperatorWorld();

        $platform = TicketMacro::create([
            'name' => 'Saludo inicial de plataforma',
            'content' => 'Plantilla global sembrada por la plataforma.',
            'category' => 'Atención inicial',
            'is_active' => true,
        ]);

        foreach ([$world['a']['agent'], $world['b']['agent']] as $agent) {
            $names = collect(
                $this->actAs($agent)->getJson('/api/ticket-macros')->assertOk()->json()
            )->pluck('name');

            $this->assertTrue(
                $names->contains('Saludo inicial de plataforma'),
                'La macro de plataforma dejó de ser visible para un operador.'
            );

            $this->actAs($agent)->getJson('/api/ticket-macros/'.$platform->id)->assertOk();
        }
    }

    /**
     * El filtro active_only del dropdown de Resolbeb/Detalle.jsx es la vía por
     * la que un agente obtiene el CONTENIDO de una macro para pegarlo en un
     * comentario ("aplicar la macro"). No existe endpoint de aplicación en el
     * servidor: insertMacro() del frontend trabaja sobre esta misma lista, así
     * que acotar la lista acota la aplicación.
     */
    public function test_active_only_dropdown_feed_is_also_scoped(): void
    {
        $world = $this->createTwoOperatorWorld();
        $this->createMacroAs($world['b']['agent'], 'Macro de B', 'Contenido privado de B');

        $payload = $this->actAs($world['a']['agent'])
            ->getJson('/api/ticket-macros?active_only=1')
            ->assertOk()
            ->getContent();

        $this->assertStringNotContainsString('Contenido privado de B', $payload);
    }
}
