<?php

namespace App\Exports\TimeDesk;

use App\Models\User;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Exportador de empleados RH a Excel/CSV (formato maestro).
 * Usa PhpSpreadsheet directamente (maatwebsite/excel no compatible con PhpSpreadsheet 5.x).
 */
class EmployeeExport
{
    private const HEADINGS = [
        'FECHA DE INGRESO',
        'SEDE',
        'TIPO DE INGRESO',
        'NOMBRE COMPLETO',
        'ÁREA',
        'CAMPAÑA',
        'PUESTO ESPECÍFICO',
        'HORARIO',
        'ESTATUS',
        'JEFE INMEDIATO',
    ];

    /**
     * Construye el Spreadsheet en memoria (para enviar por stream sin archivo temporal).
     *
     * @param  'activos'|'bajas'  $type
     */
    public function buildSpreadsheet(string $type): Spreadsheet
    {
        $query = User::query()
            ->with([
                'employeeProfile.terminationReason',
                'employeeProfile.employeeStatus',
                'employeeProfile.hireType',
                'employeeProfile.manager',
                'campaign',
                'area',
                'position',
                'sede',
            ]);

        if ($type === 'bajas') {
            $query->onlyTrashed();
        } else {
            $query->whereNull('users.deleted_at');
        }

        $users = $query->orderBy('id')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($type === 'bajas' ? 'Bajas' : 'Activos');

        $row = 1;
        foreach (self::HEADINGS as $col => $heading) {
            $sheet->setCellValue($this->colLetter($col + 1) . $row, $heading);
        }
        $sheet->getStyle('A1:' . $this->colLetter(count(self::HEADINGS)) . '1')
            ->getFont()->setBold(true);
        $sheet->getStyle('A1:' . $this->colLetter(count(self::HEADINGS)) . '1')
            ->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE0E0E0');
        $row++;

        foreach ($users as $user) {
            $schedule = $user->getTodaySchedule();
            $profile = $user->employeeProfile;

            $sheet->setCellValue('A' . $row, $profile?->hire_date?->format('d/m/Y') ?? '—');
            $sheet->setCellValue('B' . $row, $user->sede?->name ?? '—');
            $sheet->setCellValue('C' . $row, $profile?->hireType?->name ?? '—');
            $sheet->setCellValue('D' . $row, $user->name ?? '—');
            $sheet->setCellValue('E' . $row, $user->area?->name ?? '—');
            $sheet->setCellValue('F' . $row, $user->campaign?->name ?? '—');
            $sheet->setCellValue('G' . $row, $user->position?->name ?? '—');
            $sheet->setCellValue('H' . $row, $schedule->name ?? '—');
            $sheet->setCellValue('I' . $row, $profile?->employeeStatus?->name ?? '—');
            $sheet->setCellValue('J' . $row, $profile?->manager?->name ?? '—');
            $row++;
        }

        for ($c = 1; $c <= count(self::HEADINGS); $c++) {
            $sheet->getColumnDimension($this->colLetter($c))->setAutoSize(true);
        }

        return $spreadsheet;
    }

    /**
     * Exporta a archivo Excel (.xlsx) o CSV.
     *
     * @param  'activos'|'bajas'  $type
     */
    public function export(string $type, string $filePath): void
    {
        $spreadsheet = $this->buildSpreadsheet($type);
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if ($ext === 'csv') {
            $writer = new Csv($spreadsheet);
            $writer->setDelimiter(',');
            $writer->setEnclosure('"');
            $writer->save($filePath);
        } else {
            $writer = new Xlsx($spreadsheet);
            $writer->save($filePath);
        }
    }

    private function colLetter(int $colIndex): string
    {
        $letter = '';
        while ($colIndex > 0) {
            $colIndex--;
            $letter = chr(65 + ($colIndex % 26)) . $letter;
            $colIndex = (int) floor($colIndex / 26);
        }
        return $letter ?: 'A';
    }
}
