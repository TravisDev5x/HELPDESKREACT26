<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Sigua\ImportacionService;
use Illuminate\Console\Command;

class SiguaImportarAutomaticoCommand extends Command
{
    protected $signature = 'sigua:importar-automatico
                            {tipo : rh_activos | ad_usuarios | neotel_isla2 | neotel_isla3 | neotel_isla4 }
                            {ruta : Ruta absoluta o relativa al archivo CSV/Excel}';

    protected $description = 'Importa archivo SIGUA por línea de comando (cron o pipelines)';

    public function handle(ImportacionService $importacionService): int
    {
        $tipo = $this->argument('tipo');
        $ruta = $this->argument('ruta');

        $tiposValidos = ['rh_activos', 'ad_usuarios', 'neotel_isla2', 'neotel_isla3', 'neotel_isla4'];
        if (! in_array($tipo, $tiposValidos, true)) {
            $this->error("Tipo debe ser uno de: " . implode(', ', $tiposValidos));
            return self::FAILURE;
        }

        $path = realpath($ruta) ?: realpath(base_path($ruta));
        if (! $path || ! is_file($path)) {
            $this->error("Archivo no encontrado: {$ruta}");
            return self::FAILURE;
        }

        $userId = User::permission('sigua.importar')->first()?->id
            ?? User::role('admin')->first()?->id
            ?? 1;

        try {
            if ($tipo === 'rh_activos') {
                $import = $importacionService->importarRhActivos($path, $userId);
            } elseif ($tipo === 'ad_usuarios') {
                $import = $importacionService->importarAdUsuarios($path, $userId);
            } elseif (in_array($tipo, ['neotel_isla2', 'neotel_isla3', 'neotel_isla4'], true)) {
                $import = $importacionService->importarNeotel($path, $tipo, $userId);
            } else {
                $this->error('Tipo no implementado.');
                return self::FAILURE;
            }

            $this->info("Importación completada. ID: {$import->id}, procesados: {$import->registros_procesados}, nuevos: {$import->registros_nuevos}, errores: {$import->errores}.");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error al importar: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
