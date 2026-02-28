<?php

namespace App\Console\Commands;

use App\Exports\TimeDesk\EmployeeExport;
use Illuminate\Console\Command;

/**
 * Prueba local: genera el Excel de activos en storage/app/test_export_activos.xlsx
 * para verificar que el archivo se crea correctamente y abre en Excel.
 * Ejecutar: php artisan timedesk:test-export
 */
class TestEmployeeExportCommand extends Command
{
    protected $signature = 'timedesk:test-export';
    protected $description = 'Genera Excel de empleados activos en storage/app para probar que abre en Excel';

    public function handle(): int
    {
        $path = storage_path('app/test_export_activos.xlsx');
        $export = new EmployeeExport;
        $export->export('activos', $path);
        $this->info('Archivo generado: ' . $path);
        $this->info('Abre ese archivo con Excel. Si abre bien, el problema está en el envío por HTTP.');
        return self::SUCCESS;
    }
}
