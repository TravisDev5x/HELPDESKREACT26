<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: ALTER sigua_systems — mapeo Excel, UI y activo.
     */
    public function up(): void
    {
        Schema::table('sigua_systems', function (Blueprint $table) {
            $table->json('campos_mapeo')->nullable()->after('contacto_externo');
            $table->string('campo_id_empleado')->nullable()->after('campos_mapeo');
            $table->string('regex_id_empleado')->nullable()->after('campo_id_empleado');
            $table->boolean('activo')->default(true)->after('regex_id_empleado');
            $table->string('icono')->nullable()->after('activo');
            $table->string('color', 7)->nullable()->after('icono'); // hex
            $table->integer('orden')->default(0)->after('color');
        });

        $this->poblarCamposMapeo();
    }

    private function poblarCamposMapeo(): void
    {
        $mapeos = [
            'ad' => [
                'campos_mapeo' => json_encode([
                    'cuenta' => 'CuentaSAM',
                    'nombre' => 'NombreMostrar',
                    'ou' => 'OU',
                ]),
                'regex_id_empleado' => 'ECD-(\\d+)',
            ],
            'neotel' => [
                'campos_mapeo' => json_encode([
                    'cuenta' => 'USUARIO',
                    'nombre' => 'NOMBRE',
                    'apellido' => 'APELLIDO',
                    'perfil' => 'IDPERFIL',
                ]),
                'regex_id_empleado' => null,
            ],
            'ahevaa' => [
                'campos_mapeo' => json_encode([
                    'cuenta' => 'Usuario',
                    'nombre' => 'Nombre',
                    'apellido' => 'Apellido',
                    'perfil' => 'Perfil',
                ]),
                'regex_id_empleado' => null,
            ],
        ];

        foreach ($mapeos as $slug => $data) {
            DB::table('sigua_systems')->where('slug', $slug)->update($data);
        }

        // Insertar AD si no existe (solo name/slug mínimos; mapeo ya aplicado si existía)
        $adExists = DB::table('sigua_systems')->where('slug', 'ad')->exists();
        if (!$adExists) {
            DB::table('sigua_systems')->insert([
                'name' => 'AD',
                'slug' => 'ad',
                'description' => 'Active Directory',
                'es_externo' => false,
                'contacto_externo' => null,
                'campos_mapeo' => $mapeos['ad']['campos_mapeo'],
                'regex_id_empleado' => $mapeos['ad']['regex_id_empleado'],
                'activo' => true,
                'orden' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('sigua_systems', function (Blueprint $table) {
            $table->dropColumn([
                'campos_mapeo', 'campo_id_empleado', 'regex_id_empleado',
                'activo', 'icono', 'color', 'orden',
            ]);
        });
    }
};
