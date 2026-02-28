<?php

namespace App\Http\Controllers\Api;

use App\Exports\TimeDesk\EmployeeExport;
use App\Http\Controllers\Controller;
use App\Imports\TimeDesk\EmployeeImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeImportExportController extends Controller
{
    /**
     * Importar archivo maestro (Excel/CSV). Devuelve resumen y lista de fallos/advertencias.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $import = new EmployeeImport;
        $result = $import->import($path);

        return response()->json([
            'message' => 'Importación finalizada.',
            'processed' => $result['processed'],
            'created' => $result['created'],
            'updated' => $result['updated'],
            'failures' => $result['failures'],
            'warnings' => $result['warnings'],
        ]);
    }

    /**
     * Generar y descargar reporte de errores de importación (Excel) a partir del payload de failures.
     */
    public function downloadImportErrors(Request $request): StreamedResponse|JsonResponse
    {
        $failures = $request->input('failures', []);
        if (! is_array($failures) || empty($failures)) {
            return response()->json(['message' => 'No hay datos de errores para exportar.'], 422);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Errores de importación');
        $sheet->setCellValue('A1', 'Fila');
        $sheet->setCellValue('B1', 'Campo');
        $sheet->setCellValue('C1', 'Errores');
        $sheet->setCellValue('D1', 'Valores (JSON)');
        $sheet->getStyle('A1:D1')->getFont()->setBold(true);

        $row = 2;
        foreach ($failures as $f) {
            $sheet->setCellValue('A' . $row, $f['row'] ?? '');
            $sheet->setCellValue('B' . $row, $f['attribute'] ?? '');
            $sheet->setCellValue('C' . $row, is_array($f['errors'] ?? null) ? implode('; ', $f['errors']) : (string) ($f['errors'] ?? ''));
            $sheet->setCellValue('D' . $row, is_array($f['values'] ?? null) ? json_encode($f['values'], JSON_UNESCAPED_UNICODE) : '');
            $row++;
        }

        $sheet->getColumnDimension('A')->setAutoSize(true);
        $sheet->getColumnDimension('B')->setAutoSize(true);
        $sheet->getColumnDimension('C')->setAutoSize(true);
        $sheet->getColumnDimension('D')->setWidth(60);

        $filename = 'errores_importacion_' . date('Y-m-d_His') . '.xlsx';
        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Exportar empleados activos (Excel). Se escribe a disco y se envía con download() (mismo flujo que timedesk:test-export).
     */
    public function exportActivos(): BinaryFileResponse
    {
        $export = new EmployeeExport;
        $filename = 'directorio_activos_' . date('Y-m-d_His') . '.xlsx';
        $tempName = 'export_activos_' . substr(uniqid('', true), -8) . '.xlsx';
        $path = storage_path('app' . DIRECTORY_SEPARATOR . $tempName);
        $export->export('activos', $path);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Exportar empleados dados de baja (Excel). Se escribe a disco y se envía con download().
     */
    public function exportBajas(): BinaryFileResponse
    {
        $export = new EmployeeExport;
        $filename = 'directorio_bajas_' . date('Y-m-d_His') . '.xlsx';
        $tempName = 'export_bajas_' . substr(uniqid('', true), -8) . '.xlsx';
        $path = storage_path('app' . DIRECTORY_SEPARATOR . $tempName);
        $export->export('bajas', $path);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
