<?php

namespace App\Imports\TimeDesk;

use App\Models\Area;
use App\Models\Campaign;
use App\Models\EmployeeProfile;
use App\Models\EmployeeStatus;
use App\Models\HireType;
use App\Models\Position;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use App\Models\Sede;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Importador de empleados RH desde Excel/CSV (formato maestro).
 * Usa PhpSpreadsheet directamente (maatwebsite/excel no compatible con PhpSpreadsheet 5.x).
 * Política: si un catálogo no existe, la fila falla; si el jefe no existe, se inserta con manager_id null y advertencia.
 */
class EmployeeImport
{
    /** @var array<int, array{row: int, attribute: string, errors: array<int, string>, values: array<string, mixed>}> */
    private array $failures = [];

    /** @var array<int, array{row: int, message: string}> */
    private array $warnings = [];

    private int $processed = 0;
    private int $created = 0;
    private int $updated = 0;

    private const HEADER_MAP = [
        'fecha_de_ingreso' => ['fecha_de_ingreso', 'fecha ingreso', 'fecha ingreso'],
        'sede' => ['sede', 'centro', 'ubicacion', 'ubicación'],
        'tipo_de_ingreso' => ['tipo_de_ingreso', 'tipo ingreso', 'tipo de ingreso'],
        'nombre_completo' => ['nombre_completo', 'nombre completo', 'nombre'],
        'area' => ['area', 'área'],
        'campana' => ['campana', 'campaña', 'campaign'],
        'puesto_especifico' => ['puesto_especifico', 'puesto específico', 'puesto'],
        'horario' => ['horario', 'schedule'],
        'estatus' => ['estatus', 'status', 'estado'],
        'jefe_inmediato' => ['jefe_inmediato', 'jefe inmediato', 'jefe'],
        'numero_empleado' => ['numero_empleado', 'número de empleado', 'num_empleado', 'no_empleado', 'id'],
    ];

    /**
     * Importa el archivo y devuelve resumen + fallos.
     *
     * @return array{processed: int, created: int, updated: int, failures: array}
     */
    public function import(string $filePath): array
    {
        $this->failures = [];
        $this->warnings = [];
        $this->processed = 0;
        $this->created = 0;
        $this->updated = 0;

        $rows = $this->readFile($filePath);
        if (empty($rows)) {
            return [
                'processed' => 0,
                'created' => 0,
                'updated' => 0,
                'failures' => [['row' => 0, 'attribute' => 'file', 'errors' => ['El archivo no contiene filas de datos.'], 'values' => []]],
                'warnings' => [],
            ];
        }

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // 1-based + header
            $normalized = $this->normalizeRow($row);
            $errors = $this->validateRow($normalized);
            if (!empty($errors)) {
                $this->failures[] = [
                    'row' => $rowNumber,
                    'attribute' => array_key_first($errors),
                    'errors' => $errors,
                    'values' => $normalized,
                ];
                continue;
            }

            $resolved = $this->resolveIds($normalized, $rowNumber);
            if (isset($resolved['_errors'])) {
                $this->failures[] = [
                    'row' => $rowNumber,
                    'attribute' => $resolved['_errors']['attribute'] ?? 'catalog',
                    'errors' => $resolved['_errors']['errors'],
                    'values' => $normalized,
                ];
                continue;
            }

            $rowWarnings = $resolved['_warnings'] ?? [];
            try {
                DB::transaction(function () use ($normalized, $resolved, $rowNumber, $rowWarnings) {
                    $nameParts = $this->splitFullName(trim((string) ($normalized['nombre_completo'] ?? '')));
                    $employeeNumber = $this->extractEmployeeNumber($normalized);
                    if ($employeeNumber === null || $employeeNumber === '') {
                        $employeeNumber = 'IMP-' . $rowNumber . '-' . substr(uniqid(), -6);
                    }

                    $user = User::withTrashed()->where('employee_number', $employeeNumber)->first();
                    $isNew = $user === null;
                    if ($user === null) {
                        $user = new User;
                        $user->employee_number = $employeeNumber;
                        $user->password = Hash::make(Str::random(32));
                        $user->status = 'active';
                    }
                    if ($user->trashed()) {
                        $user->restore();
                    }

                    $user->first_name = $nameParts['first_name'];
                    $user->paternal_last_name = $nameParts['paternal_last_name'];
                    $user->maternal_last_name = $nameParts['maternal_last_name'];
                    $user->campaign_id = $resolved['campaign_id'];
                    $user->area_id = $resolved['area_id'];
                    $user->position_id = $resolved['position_id'];
                    $user->sede_id = $resolved['sede_id'];
                    $user->syncNameColumn();
                    $user->save();

                    $profile = $user->employeeProfile ?? new EmployeeProfile;
                    $profile->user_id = $user->id;
                    $profile->hire_date = $resolved['hire_date'];
                    $profile->employee_status_id = $resolved['employee_status_id'];
                    $profile->hire_type_id = $resolved['hire_type_id'];
                    $profile->manager_id = $resolved['manager_id'];
                    $profile->save();

                    $scheduleId = $resolved['schedule_id'] ?? null;
                    if ($scheduleId) {
                        $this->assignScheduleToUser($user->id, $scheduleId);
                    }

                    if ($isNew) {
                        $this->created++;
                    } else {
                        $this->updated++;
                    }
                    $this->processed++;

                    foreach ($rowWarnings as $w) {
                        $this->warnings[] = ['row' => $rowNumber, 'message' => $w];
                    }
                });
            } catch (\Throwable $e) {
                $this->failures[] = [
                    'row' => $rowNumber,
                    'attribute' => 'exception',
                    'errors' => [$e->getMessage()],
                    'values' => $normalized,
                ];
            }
        }

        return [
            'processed' => $this->processed,
            'created' => $this->created,
            'updated' => $this->updated,
            'failures' => $this->failures,
            'warnings' => $this->warnings,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readFile(string $filePath): array
    {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if ($ext === 'csv') {
            return $this->readCsv($filePath);
        }
        if (in_array($ext, ['xlsx', 'xls'], true)) {
            return $this->readExcel($filePath);
        }
        throw new \InvalidArgumentException('Formato no soportado. Use .xlsx, .xls o .csv');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readCsv(string $filePath): array
    {
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new \RuntimeException('No se pudo abrir el CSV.');
        }
        $header = fgetcsv($handle, 0, ',', '"', '\\');
        if ($header === false) {
            fclose($handle);
            return [];
        }
        $header = array_map(fn ($h) => $this->normalizeHeaderKey((string) $h), $header);
        $out = [];
        while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            $assoc = [];
            foreach ($header as $i => $key) {
                $assoc[$key] = $row[$i] ?? '';
            }
            $out[] = $assoc;
        }
        fclose($handle);
        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readExcel(string $filePath): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();
        if (empty($rows)) {
            return [];
        }
        $header = array_shift($rows);
        $header = array_map(fn ($h) => $this->normalizeHeaderKey((string) $h), $header);
        $out = [];
        foreach ($rows as $row) {
            $assoc = [];
            foreach ($header as $i => $key) {
                $assoc[$key] = $row[$i] ?? '';
            }
            $out[] = $assoc;
        }
        return $out;
    }

    private function normalizeHeaderKey(string $key): string
    {
        $key = trim($key);
        $key = preg_replace('/\s+/', '_', $key);
        $key = mb_strtolower($key);
        $key = preg_replace('/[^a-z0-9_áéíóúñ]/u', '', $key);
        foreach (self::HEADER_MAP as $canonical => $aliases) {
            if ($key === $canonical || in_array($key, $aliases, true)) {
                return $canonical;
            }
            $keyNoAccent = $this->removeAccents($key);
            foreach ($aliases as $alias) {
                if ($this->removeAccents($alias) === $keyNoAccent || $keyNoAccent === $this->removeAccents($canonical)) {
                    return $canonical;
                }
            }
        }
        return $key;
    }

    private function removeAccents(string $s): string
    {
        $map = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n', 'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ñ' => 'N'];
        return strtr(mb_strtolower($s), $map);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        $out = [];
        foreach (array_keys(self::HEADER_MAP) as $canonical) {
            $out[$canonical] = isset($row[$canonical]) ? trim((string) $row[$canonical]) : '';
        }
        foreach ($row as $k => $v) {
            if (!array_key_exists($k, $out)) {
                $out[$k] = is_scalar($v) ? trim((string) $v) : $v;
            }
        }
        return $out;
    }

    /**
     * @param array<string, mixed> $normalized
     * @return array<string, string>
     */
    private function validateRow(array $normalized): array
    {
        $errors = [];
        if (empty($normalized['nombre_completo'])) {
            $errors['nombre_completo'] = ['El nombre completo es obligatorio.'];
        }
        return $errors;
    }

    /**
     * Resuelve IDs desde texto. Si falla un catálogo obligatorio devuelve ['_errors' => ...]. Si solo falla jefe, manager_id null y '_warnings'.
     *
     * @param array<string, mixed> $normalized
     * @return array<string, mixed>
     */
    private function resolveIds(array $normalized, int $rowNumber): array
    {
        $resolved = [
            'hire_date' => null,
            'sede_id' => null,
            'campaign_id' => null,
            'area_id' => null,
            'position_id' => null,
            'schedule_id' => null,
            'employee_status_id' => null,
            'hire_type_id' => null,
            'manager_id' => null,
            '_warnings' => [],
        ];

        $hireDateStr = $normalized['fecha_de_ingreso'] ?? '';
        if ($hireDateStr !== '') {
            try {
                $resolved['hire_date'] = \Carbon\Carbon::parse($hireDateStr)->format('Y-m-d');
            } catch (\Throwable $e) {
                return ['_errors' => ['attribute' => 'fecha_de_ingreso', 'errors' => ['Fecha de ingreso inválida.']]];
            }
        }

        $sedeId = $this->resolveSede($normalized['sede'] ?? '');
        if ($sedeId === null && (string) ($normalized['sede'] ?? '') !== '') {
            return ['_errors' => ['attribute' => 'sede', 'errors' => ['Sede no encontrada: ' . $normalized['sede']]]];
        }
        $resolved['sede_id'] = $sedeId;

        $campaignId = $this->resolveCampaign($normalized['campana'] ?? '');
        if ($campaignId === null && (string) ($normalized['campana'] ?? '') !== '') {
            return ['_errors' => ['attribute' => 'campana', 'errors' => ['Campaña no encontrada: ' . $normalized['campana']]]];
        }
        $resolved['campaign_id'] = $campaignId;

        $areaId = $this->resolveArea($normalized['area'] ?? '');
        if ($areaId === null && (string) ($normalized['area'] ?? '') !== '') {
            return ['_errors' => ['attribute' => 'area', 'errors' => ['Área no encontrada: ' . $normalized['area']]]];
        }
        $resolved['area_id'] = $areaId;

        $positionId = $this->resolvePosition($normalized['puesto_especifico'] ?? '');
        if ($positionId === null && (string) ($normalized['puesto_especifico'] ?? '') !== '') {
            return ['_errors' => ['attribute' => 'puesto_especifico', 'errors' => ['Puesto no encontrado: ' . $normalized['puesto_especifico']]]];
        }
        $resolved['position_id'] = $positionId;

        $scheduleId = $this->resolveSchedule($normalized['horario'] ?? '');
        if ($scheduleId === null && (string) ($normalized['horario'] ?? '') !== '') {
            return ['_errors' => ['attribute' => 'horario', 'errors' => ['Horario no encontrado: ' . $normalized['horario']]]];
        }
        $resolved['schedule_id'] = $scheduleId;

        $statusId = $this->resolveEmployeeStatus($normalized['estatus'] ?? '');
        if ($statusId === null && (string) ($normalized['estatus'] ?? '') !== '') {
            return ['_errors' => ['attribute' => 'estatus', 'errors' => ['Estatus no encontrado: ' . $normalized['estatus']]]];
        }
        $resolved['employee_status_id'] = $statusId;

        $hireTypeId = $this->resolveHireType($normalized['tipo_de_ingreso'] ?? '');
        if ($hireTypeId === null && (string) ($normalized['tipo_de_ingreso'] ?? '') !== '') {
            return ['_errors' => ['attribute' => 'tipo_de_ingreso', 'errors' => ['Tipo de ingreso no encontrado: ' . $normalized['tipo_de_ingreso']]]];
        }
        $resolved['hire_type_id'] = $hireTypeId;

        $managerId = $this->resolveManager($normalized['jefe_inmediato'] ?? '');
        if ($managerId === null && (string) ($normalized['jefe_inmediato'] ?? '') !== '') {
            $resolved['_warnings'][] = 'Jefe inmediato no encontrado: ' . $normalized['jefe_inmediato'] . '. Se deja sin asignar.';
        } else {
            $resolved['manager_id'] = $managerId;
        }

        return $resolved;
    }

    private function resolveSede(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        $q = Sede::where('is_active', true);
        $q->where(function ($q) use ($value) {
            $q->whereRaw('LOWER(name) = ?', [mb_strtolower($value)])
                ->orWhereRaw('LOWER(code) = ?', [mb_strtolower($value)]);
        });
        $sede = $q->first();
        return $sede?->id;
    }

    private function resolveCampaign(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return Campaign::where('is_active', true)->whereRaw('LOWER(name) = ?', [mb_strtolower($value)])->value('id');
    }

    private function resolveArea(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return Area::where('is_active', true)->whereRaw('LOWER(name) = ?', [mb_strtolower($value)])->value('id');
    }

    private function resolvePosition(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return Position::where('is_active', true)->whereRaw('LOWER(name) = ?', [mb_strtolower($value)])->value('id');
    }

    private function resolveSchedule(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return Schedule::where('is_active', true)->whereRaw('LOWER(name) = ?', [mb_strtolower($value)])->value('id');
    }

    private function resolveEmployeeStatus(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return EmployeeStatus::active()->whereRaw('LOWER(name) = ?', [mb_strtolower($value)])->value('id');
    }

    private function resolveHireType(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return HireType::active()->whereRaw('LOWER(name) = ?', [mb_strtolower($value)])->value('id');
    }

    private function resolveManager(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        $name = mb_strtolower($value);
        $user = User::withoutTrashed()
            ->whereNotNull('name')
            ->whereRaw('LOWER(TRIM(name)) = ?', [$name])
            ->first();
        return $user?->id;
    }

    /**
     * 1 token → first_name; 2 → first + paternal; 3 → first + paternal + maternal; 4+ → últimos dos apellidos, resto first_name.
     *
     * @return array{first_name: string|null, paternal_last_name: string|null, maternal_last_name: string|null}
     */
    private function splitFullName(string $fullName): array
    {
        $tokens = preg_split('/\s+/u', $fullName, -1, PREG_SPLIT_NO_EMPTY);
        $tokens = array_map('trim', $tokens);
        $tokens = array_values(array_filter($tokens));

        if (count($tokens) === 0) {
            return ['first_name' => null, 'paternal_last_name' => null, 'maternal_last_name' => null];
        }
        if (count($tokens) === 1) {
            return ['first_name' => $tokens[0], 'paternal_last_name' => null, 'maternal_last_name' => null];
        }
        if (count($tokens) === 2) {
            return ['first_name' => $tokens[0], 'paternal_last_name' => $tokens[1], 'maternal_last_name' => null];
        }
        if (count($tokens) === 3) {
            return ['first_name' => $tokens[0], 'paternal_last_name' => $tokens[1], 'maternal_last_name' => $tokens[2]];
        }
        $lastTwo = array_slice($tokens, -2);
        $first = implode(' ', array_slice($tokens, 0, -2));
        return ['first_name' => $first, 'paternal_last_name' => $lastTwo[0], 'maternal_last_name' => $lastTwo[1]];
    }

    private function extractEmployeeNumber(array $normalized): ?string
    {
        $v = $normalized['numero_empleado'] ?? '';
        if ($v !== '' && $v !== null) {
            return trim((string) $v);
        }
        return null;
    }

    private function assignScheduleToUser(int $userId, int $scheduleId): void
    {
        $today = now()->format('Y-m-d');
        $existing = ScheduleAssignment::where('scheduleable_type', User::class)
            ->where('scheduleable_id', $userId)
            ->where('valid_from', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('valid_until')->orWhere('valid_until', '>=', $today);
            })
            ->first();
        if ($existing && (int) $existing->schedule_id === $scheduleId) {
            return;
        }
        if ($existing) {
            $existing->update(['valid_until' => $today]);
        }
        ScheduleAssignment::create([
            'schedule_id' => $scheduleId,
            'scheduleable_type' => User::class,
            'scheduleable_id' => $userId,
            'valid_from' => $today,
            'valid_until' => null,
        ]);
    }

    /**
     * @return array<int, array{row: int, attribute: string, errors: array, values: array}>
     */
    public function getFailures(): array
    {
        return $this->failures;
    }
}
