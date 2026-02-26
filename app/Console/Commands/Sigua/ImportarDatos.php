<?php

namespace App\Console\Commands\Sigua;

use App\Models\Sigua\Sistema;
use App\Models\User;
use App\Services\Sigua\ImportacionService;
use Illuminate\Console\Command;

class ImportarDatos extends Command
{
    protected $signature = 'sigua:importar
                            {tipo : Tipo de importación: rh_activos, rh_bajas, sistema}
                            {ruta : Ruta absoluta al archivo}
                            {--sistema_id= : ID del sistema (obligatorio si tipo=sistema)}
                            {--dry-run : Solo preview, no importar}
                            {--force : No pedir confirmación}';

    protected $description = 'Importa datos desde archivo Excel/CSV a SIGUA (RH, bajas, o cualquier sistema)';

    public function handle(ImportacionService $importacionService): int
    {
        try {
            $tipo = $this->argument('tipo');
            $ruta = $this->argument('ruta');
            $dryRun = $this->option('dry-run');
            $force = $this->option('force');
            $sistemaIdOpt = $this->option('sistema_id');

            $tiposValidos = ['rh_activos', 'rh_bajas', 'sistema'];
            if (! in_array($tipo, $tiposValidos, true)) {
                $this->error("Tipo inválido: {$tipo}. Use: " . implode(', ', $tiposValidos));
                return self::FAILURE;
            }

            if (! is_file($ruta) || ! is_readable($ruta)) {
                $this->error("El archivo no existe o no es legible: {$ruta}");
                return self::FAILURE;
            }

            $ext = strtolower(pathinfo($ruta, PATHINFO_EXTENSION));
            if (! in_array($ext, ['xlsx', 'xls', 'csv'], true)) {
                $this->error('Formato no soportado. Use xlsx, xls o csv.');
                return self::FAILURE;
            }

            if ($tipo === 'sistema') {
                if ($sistemaIdOpt === null || $sistemaIdOpt === '') {
                    $this->error('Para tipo=sistema debe indicar --sistema_id=ID');
                    return self::FAILURE;
                }
                $sistemaId = (int) $sistemaIdOpt;
                $sistema = Sistema::where('id', $sistemaId)->where('activo', true)->first();
                if (! $sistema) {
                    $this->error("Sistema ID {$sistemaId} no encontrado o inactivo.");
                    return self::FAILURE;
                }
                $this->info("Sistema: {$sistema->name}");
                $this->info('Campos mapeo: ' . json_encode($sistema->campos_mapeo ?? [], JSON_UNESCAPED_UNICODE));
                $this->info('Regex ID empleado: ' . ($sistema->regex_id_empleado ?? '—'));
            }

            $userId = User::permission('sigua.importar')->first()?->id ?? 1;

            if ($dryRun) {
                return $this->ejecutarPreview($importacionService, $tipo, $ruta, $sistemaIdOpt ?? 0) ? self::SUCCESS : self::FAILURE;
            }

            if (! $force && ! $this->confirm("¿Importar {$ruta} como {$tipo}?", true)) {
                $this->warn('Importación cancelada.');
                return self::SUCCESS;
            }

            $inicio = microtime(true);

            if ($tipo === 'rh_activos') {
                $import = $importacionService->importarRH($ruta, $userId);
            } elseif ($tipo === 'rh_bajas') {
                $import = $importacionService->importarBajasRH($ruta, $userId);
            } else {
                $import = $importacionService->importarSistema($ruta, (int) $sistemaIdOpt, $userId, null);
            }

            $segundos = round(microtime(true) - $inicio, 2);

            $this->info("Importación completada en {$segundos}s.");
            $this->table(
                ['Leídos', 'Nuevos', 'Actualizados', 'Sin cambio', 'Errores'],
                [[
                    $import->registros_procesados ?? 0,
                    $import->registros_nuevos ?? 0,
                    $import->registros_actualizados ?? 0,
                    $import->registros_sin_cambio ?? 0,
                    $import->errores ?? 0,
                ]]
            );

            $detalle = $import->detalle_errores ?? [];
            if (! empty($detalle) && is_array($detalle)) {
                $this->warn('Primeros 10 errores:');
                $muestra = array_slice($detalle, 0, 10);
                foreach ($muestra as $err) {
                    $this->line('  - Fila ' . ($err['fila'] ?? '?') . ': ' . ($err['mensaje'] ?? json_encode($err)));
                }
            }

            $totalReg = ($import->registros_nuevos ?? 0) + ($import->registros_actualizados ?? 0) + ($import->registros_sin_cambio ?? 0);
            \Illuminate\Support\Facades\Log::info("SIGUA Import: {$tipo} - {$ruta} - {$totalReg} registros por usuario {$userId}");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            if ($this->output->isVerbose()) {
                $this->error($e->getTraceAsString());
            }
            \Illuminate\Support\Facades\Log::error('SIGUA importar: ' . $e->getMessage(), ['exception' => $e]);

            return self::FAILURE;
        }
    }

    private function ejecutarPreview(ImportacionService $importacionService, string $tipo, string $ruta, int $sistemaId): bool
    {
        if ($tipo === 'sistema' && $sistemaId > 0) {
            $preview = $importacionService->preview($ruta, $sistemaId);
            $this->info('Columnas detectadas: ' . implode(', ', $preview['columnas_detectadas'] ?? []));
            $this->info('Columnas mapeadas: ' . json_encode($preview['columnas_mapeadas'] ?? [], JSON_UNESCAPED_UNICODE));
            if (! empty($preview['advertencias'])) {
                foreach ($preview['advertencias'] as $adv) {
                    $this->warn($adv);
                }
            }
            $filas = $preview['preview'] ?? [];
            if (! empty($filas)) {
                $headers = array_keys($filas[0] ?? []);
                $rows = array_map(fn ($f) => array_values($f), array_slice($filas, 0, 10));
                $this->table($headers, $rows);
            }
        } else {
            $this->info('Preview RH: primeras filas del archivo (sin mapeo).');
            $filas = $this->leerPrimerasFilas($ruta, 10);
            if (! empty($filas)) {
                $headers = array_keys($filas[0] ?? []);
                $rows = array_map(fn ($f) => array_values($f), $filas);
                $this->table($headers ?: ['Columna 1', 'Columna 2'], $rows);
            }
        }

        $this->info('Modo dry-run: no se modificó la base de datos.');
        if (! $this->option('force') && $this->confirm('¿Desea continuar con la importación completa? (y/n)', false)) {
            $this->info('Ejecute el comando sin --dry-run para importar.');
        }

        return true;
    }

    private function leerPrimerasFilas(string $ruta, int $limite): array
    {
        $ext = strtolower(pathinfo($ruta, PATHINFO_EXTENSION));
        if ($ext === 'csv') {
            $handle = fopen($ruta, 'r');
            if (! $handle) {
                return [];
            }
            $out = [];
            $header = fgetcsv($handle);
            if (! $header) {
                fclose($handle);
                return [];
            }
            $n = 0;
            while (($row = fgetcsv($handle)) !== false && $n < $limite) {
                $out[] = array_combine($header, array_pad($row, count($header), ''));
                $n++;
            }
            fclose($handle);

            return $out;
        }
        $this->warn('Preview de Excel para RH: solo se muestra mensaje. Ejecute sin --dry-run para importar.');
        return [];
    }
}
