<?php

namespace App\Services\Sigua;

use App\Exceptions\Sigua\SiguaException;
use App\Models\Sigua\Importacion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Servicio de importación de archivos Excel/CSV (RH, AD, Neotel).
 * Lee archivos, normaliza datos y crea registro en sigua_imports con contadores y datos_importados.
 * Soporta CSV nativo; para Excel requiere phpoffice/phpspreadsheet.
 */
class ImportacionService
{
    /**
     * Importa archivo de RH activos (columnas: ID, NOMBRE COMPLETO, SEDE, CAMPAÑA, PUESTO, etc.).
     * Crea registro en sigua_imports con registros_procesados, datos_importados y detalle_errores.
     *
     * @throws SiguaException
     */
    public function importarRhActivos(string $filePath, int $importadoPorUserId): Importacion
    {
        $filas = $this->leerArchivo($filePath);
        $errores = [];
        $datos = [];
        $nuevos = 0;
        $actualizados = 0;

        foreach ($filas as $idx => $row) {
            if ($idx === 0 && $this->pareceEncabezado($row)) {
                continue;
            }
            $normalizado = $this->normalizarFilaRh($row);
            if (empty($normalizado['nombre_completo']) && empty($normalizado['id'])) {
                $errores[] = ['fila' => $idx + 1, 'mensaje' => 'Fila sin nombre ni ID', 'datos' => $row];
                continue;
            }
            $datos[] = $normalizado;
            $nuevos++;
        }

        return DB::transaction(function () use ($filePath, $importadoPorUserId, $datos, $errores, $nuevos, $actualizados) {
            $path = $this->moverAStorage($filePath, 'rh_activos');
            return Importacion::create([
                'tipo' => 'rh_activos',
                'archivo' => $path,
                'registros_procesados' => count($datos) + count($errores),
                'registros_nuevos' => $nuevos,
                'registros_actualizados' => $actualizados,
                'errores' => count($errores),
                'detalle_errores' => $errores ?: null,
                'datos_importados' => $datos,
                'importado_por' => $importadoPorUserId,
            ]);
        });
    }

    /**
     * Importa archivo de usuarios AD (formato ADMPReport: Nombre, CuentaSAM, OU).
     * Categoriza automáticamente (activo, genérico, sistema según OU/nombre).
     *
     * @throws SiguaException
     */
    public function importarAdUsuarios(string $filePath, int $importadoPorUserId): Importacion
    {
        $filas = $this->leerArchivo($filePath);
        $errores = [];
        $datos = [];
        $nuevos = 0;
        $actualizados = 0;

        foreach ($filas as $idx => $row) {
            if ($idx === 0 && $this->pareceEncabezado($row)) {
                continue;
            }
            $normalizado = $this->normalizarFilaAd($row);
            if (empty($normalizado['cuenta_sam'] ?? $normalizado['CuentaSAM'] ?? '')) {
                $errores[] = ['fila' => $idx + 1, 'mensaje' => 'Fila sin cuenta SAM', 'datos' => $row];
                continue;
            }
            $normalizado['categoria'] = $this->categorizarAd($normalizado);
            $datos[] = $normalizado;
            $nuevos++;
        }

        return DB::transaction(function () use ($filePath, $importadoPorUserId, $datos, $errores, $nuevos, $actualizados) {
            $path = $this->moverAStorage($filePath, 'ad_usuarios');
            return Importacion::create([
                'tipo' => 'ad_usuarios',
                'archivo' => $path,
                'registros_procesados' => count($datos) + count($errores),
                'registros_nuevos' => $nuevos,
                'registros_actualizados' => $actualizados,
                'errores' => count($errores),
                'detalle_errores' => $errores ?: null,
                'datos_importados' => $datos,
                'importado_por' => $importadoPorUserId,
            ]);
        });
    }

    /**
     * Importa archivo Neotel por isla (USUARIO, NOMBRE, APELLIDO, IDPERFIL, FECHA_ALTA).
     *
     * @param  string  $isla  neotel_isla2, neotel_isla3 o neotel_isla4
     * @throws SiguaException
     */
    public function importarNeotel(string $filePath, string $isla, int $importadoPorUserId): Importacion
    {
        if (! in_array($isla, ['neotel_isla2', 'neotel_isla3', 'neotel_isla4'], true)) {
            throw new SiguaException('Isla no válida. Use neotel_isla2, neotel_isla3 o neotel_isla4.');
        }

        $filas = $this->leerArchivo($filePath);
        $errores = [];
        $datos = [];
        $nuevos = 0;

        foreach ($filas as $idx => $row) {
            if ($idx === 0 && $this->pareceEncabezado($row)) {
                continue;
            }
            $normalizado = $this->normalizarFilaNeotel($row);
            if (empty($normalizado['usuario'] ?? '')) {
                $errores[] = ['fila' => $idx + 1, 'mensaje' => 'Fila sin usuario', 'datos' => $row];
                continue;
            }
            $datos[] = $normalizado;
            $nuevos++;
        }

        return DB::transaction(function () use ($filePath, $isla, $importadoPorUserId, $datos, $errores, $nuevos) {
            $path = $this->moverAStorage($filePath, $isla);
            return Importacion::create([
                'tipo' => $isla,
                'archivo' => $path,
                'registros_procesados' => count($datos) + count($errores),
                'registros_nuevos' => $nuevos,
                'registros_actualizados' => 0,
                'errores' => count($errores),
                'detalle_errores' => $errores ?: null,
                'datos_importados' => $datos,
                'importado_por' => $importadoPorUserId,
            ]);
        });
    }

    /**
     * Lee archivo Excel o CSV y retorna array de filas (cada fila es array asociativo o indexado).
     *
     * @return array<int, array>
     * @throws SiguaException
     */
    protected function leerArchivo(string $filePath): array
    {
        if (! file_exists($filePath)) {
            throw new SiguaException("Archivo no encontrado: {$filePath}");
        }

        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if ($ext === 'csv') {
            return $this->leerCsv($filePath);
        }
        if (in_array($ext, ['xlsx', 'xls'], true) && class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
            return $this->leerExcel($filePath);
        }
        if (in_array($ext, ['xlsx', 'xls'], true)) {
            throw new SiguaException('Para importar Excel instale: composer require phpoffice/phpspreadsheet');
        }
        throw new SiguaException('Formato no soportado. Use CSV o Excel (.xlsx, .xls).');
    }

    /**
     * @return array<int, array>
     */
    protected function leerCsv(string $filePath): array
    {
        $out = [];
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new SiguaException('No se pudo abrir el CSV.');
        }
        $header = null;
        while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            if ($header === null) {
                $header = $row;
                $out[] = $row;
                continue;
            }
            $asoc = [];
            foreach ($header as $i => $key) {
                $asoc[$key] = $row[$i] ?? '';
            }
            $out[] = $asoc;
        }
        fclose($handle);
        return $out;
    }

    /**
     * @return array<int, array>
     */
    protected function leerExcel(string $filePath): array
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();
        if (empty($rows)) {
            return [];
        }
        $header = array_shift($rows);
        $out = [array_combine($header, $header) ?: $header];
        foreach ($rows as $row) {
            $asoc = [];
            foreach ($header as $i => $key) {
                $asoc[$key] = $row[$i] ?? '';
            }
            $out[] = $asoc;
        }
        return $out;
    }

    protected function pareceEncabezado(array $row): bool
    {
        $primera = is_array($row) ? (array_values($row)[0] ?? '') : '';
        return (bool) preg_match('/^(id|nombre|usuario|cuenta|sede|campaña)/i', (string) $primera);
    }

    protected function normalizarFilaRh(array $row): array
    {
        $map = [
            'id' => 'id',
            'ID' => 'id',
            'nombre_completo' => 'nombre_completo',
            'NOMBRE COMPLETO' => 'nombre_completo',
            'sede' => 'sede',
            'SEDE' => 'sede',
            'campaña' => 'campaign',
            'CAMPAÑA' => 'campaign',
            'campaign' => 'campaign',
            'puesto' => 'puesto',
            'PUESTO' => 'puesto',
            'numero_empleado' => 'numero_empleado',
        ];
        $out = [];
        foreach ($row as $key => $value) {
            $k = $map[$key] ?? strtolower(str_replace(' ', '_', trim((string) $key)));
            $out[$k] = $value;
        }
        if (! isset($out['nombre_completo']) && isset($row['NOMBRE COMPLETO'])) {
            $out['nombre_completo'] = $row['NOMBRE COMPLETO'];
        }
        return $out;
    }

    protected function normalizarFilaAd(array $row): array
    {
        $map = [
            'Nombre' => 'nombre',
            'CuentaSAM' => 'cuenta_sam',
            'cuenta_sam' => 'cuenta_sam',
            'OU' => 'ou',
            'ou' => 'ou',
        ];
        $out = [];
        foreach ($row as $key => $value) {
            $k = $map[$key] ?? strtolower(str_replace(' ', '_', trim((string) $key)));
            $out[$k] = $value;
        }
        return $out;
    }

    protected function normalizarFilaNeotel(array $row): array
    {
        $map = [
            'USUARIO' => 'usuario',
            'usuario' => 'usuario',
            'NOMBRE' => 'nombre',
            'APELLIDO' => 'apellido',
            'IDPERFIL' => 'id_perfil',
            'FECHA_ALTA' => 'fecha_alta',
        ];
        $out = [];
        foreach ($row as $key => $value) {
            $k = $map[$key] ?? strtolower(str_replace(' ', '_', trim((string) $key)));
            $out[$k] = $value;
        }
        return $out;
    }

    protected function categorizarAd(array $row): string
    {
        $ou = strtolower($row['ou'] ?? $row['OU'] ?? '');
        $cuenta = strtolower($row['cuenta_sam'] ?? $row['CuentaSAM'] ?? '');
        if (str_contains($ou, 'genérico') || str_contains($ou, 'generico') || str_contains($cuenta, 'gen')) {
            return 'genérico';
        }
        if (str_contains($ou, 'sistema') || str_contains($cuenta, 'svc')) {
            return 'sistema';
        }
        return 'activo';
    }

    protected function moverAStorage(string $filePath, string $tipo): string
    {
        $nombre = date('Y-m-d') . '_' . basename($filePath);
        $dest = 'sigua/imports/' . $tipo . '/' . $nombre;
        $content = file_get_contents($filePath);
        Storage::disk('local')->put($dest, $content);
        return $dest;
    }
}
