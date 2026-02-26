<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SIGUA v2: ALTER sigua_accounts — tipo, empleado_rh, datos_extra, importación.
     * No renombrar tabla. Migrar datos existentes a tipo.
     */
    public function up(): void
    {
        Schema::table('sigua_accounts', function (Blueprint $table) {
            $table->foreignId('empleado_rh_id')->nullable()->after('campaign_id')
                ->constrained('sigua_empleados_rh')->nullOnDelete();
            $table->enum('tipo', [
                'nominal',
                'generica',
                'servicio',
                'prueba',
                'desconocida',
            ])->default('desconocida')->after('empleado_rh_id');
            $table->json('datos_extra')->nullable()->after('tipo');
            $table->foreignId('importacion_id')->nullable()->after('datos_extra')
                ->constrained('sigua_imports')->nullOnDelete();
        });

        $this->migrarTiposExistentes();
    }

    private function migrarTiposExistentes(): void
    {
        $genericosOu = ['GENERICOS', 'GENÉRICOS', 'GENERIC'];
        $prbPattern = '/\bPRB\b/i';

        DB::table('sigua_accounts')->orderBy('id')->chunk(500, function ($cuentas) use ($genericosOu, $prbPattern) {
            foreach ($cuentas as $c) {
                $tipo = $this->clasificarTipo($c, $genericosOu, $prbPattern);
                if ($tipo !== 'desconocida') {
                    DB::table('sigua_accounts')->where('id', $c->id)->update(['tipo' => $tipo]);
                }
            }
        });
    }

    private function clasificarTipo(object $c, array $genericosOu, string $prbPattern): string
    {
        $nombre = $c->nombre_cuenta ?? '';
        $ou = $c->ou_ad ?? '';

        // Servicio/sistema: nombres típicos de cuentas de servicio
        if (preg_match('/^(svc|service|sistema|admin|administrator|cuenta\.|cuenta_)\w*$/i', $nombre)
            || preg_match('/\b(servicio|sistema)\b/i', $nombre)) {
            return 'servicio';
        }

        // OU GENÉRICOS o patrón PRB
        $ouUpper = strtoupper($ou);
        foreach ($genericosOu as $g) {
            if (str_contains($ouUpper, strtoupper($g))) {
                return 'generica';
            }
        }
        if (preg_match($prbPattern, $nombre) || preg_match($prbPattern, $ou)) {
            return 'generica';
        }

        // Prueba
        if (preg_match('/\b(prueba|test|demo)\b/i', $nombre) || preg_match('/\b(prueba|test)\b/i', $ou)) {
            return 'prueba';
        }

        // Nominal: nombre que parezca persona (nombre + apellido o formato ECD-12345)
        if (preg_match('/^[A-Za-zÁ-ú\s\-]+ [A-Za-zÁ-ú\s\-]+/', $nombre)
            || preg_match('/^ECD-\d+$/i', trim($nombre))
            || preg_match('/^\d{4,6}$/', trim($nombre))) {
            return 'nominal';
        }

        return 'desconocida';
    }

    public function down(): void
    {
        Schema::table('sigua_accounts', function (Blueprint $table) {
            $table->dropForeign(['empleado_rh_id']);
            $table->dropForeign(['importacion_id']);
            $table->dropColumn(['empleado_rh_id', 'tipo', 'datos_extra', 'importacion_id']);
        });
    }
};
