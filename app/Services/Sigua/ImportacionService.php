<?php

namespace App\Services\Sigua;

use App\Exceptions\Sigua\SiguaException;
use App\Models\Campaign;
use App\Models\Sede;
use App\Models\Sigua\Alerta;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\EmpleadoRh;
use App\Models\Sigua\Importacion;
use App\Models\Sigua\Sistema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Servicio de importación SIGUA v2: dinámico y multi-sistema.
 * - importarRH: snapshot RH → sigua_empleados_rh, detección de bajas.
 * - importarBajasRH: marcar bajas y alertar cuentas vinculadas activas.
 * - importarSistema: importación genérica por mapeo (reemplaza AD/Neotel/Ahevaa).
 * - preview: vista previa sin modificar BD.
 */
class ImportacionService
{
    private const PREVIEW_LIMIT = 10;

    /**
     * Importa archivo de RH activos. Guarda en sigua_empleados_rh, upsert por num_empleado.
     * Vincula sede_id y campaign_id por nombre. Detecta bajas (no aparecen en archivo) → estatus 'Baja probable'.
     */
    public function importarRH(string $filePath, int $importadoPorUserId): Importacion
    {
        $filas = $this->leerArchivo($filePath);
        $errores = [];
        $nuevos = 0;
        $actualizados = 0;
        $sinCambio = 0;
        $numEmpleadosEnArchivo = [];

        $primeraFila = true;
        foreach ($filas as $idx => $row) {
            if ($primeraFila && $this->pareceEncabezado($row)) {
                $primeraFila = false;
                continue;
            }
            $normalizado = $this->normalizarFilaRh($row);
            $numEmpleado = $this->extraerNumEmpleadoRh($normalizado);
            if (empty($normalizado['nombre_completo']) && empty($numEmpleado)) {
                $errores[] = ['fila' => $idx + 1, 'mensaje' => 'Fila sin nombre ni ID', 'datos' => $row];
                continue;
            }
            if (empty($numEmpleado)) {
                $errores[] = ['fila' => $idx + 1, 'mensaje' => 'No se pudo obtener número de empleado', 'datos' => $row];
                continue;
            }
            $numEmpleadosEnArchivo[$numEmpleado] = true;
        }

        return DB::transaction(function () use (
            $filePath,
            $importadoPorUserId,
            $filas,
            $errores,
            $numEmpleadosEnArchivo,
            &$nuevos,
            &$actualizados,
            &$sinCambio
        ) {
            $path = $this->moverAStorage($filePath, 'rh_activos');
            $import = Importacion::create([
                'tipo' => 'rh_activos',
                'archivo' => $path,
                'registros_procesados' => 0,
                'registros_nuevos' => 0,
                'registros_actualizados' => 0,
                'registros_sin_cambio' => 0,
                'errores' => count($errores),
                'detalle_errores' => $errores ?: null,
                'importado_por' => $importadoPorUserId,
            ]);

            $primeraFila = true;
            foreach ($filas as $idx => $row) {
                if ($primeraFila && $this->pareceEncabezado($row)) {
                    $primeraFila = false;
                    continue;
                }
                $normalizado = $this->normalizarFilaRh($row);
                $numEmpleado = $this->extraerNumEmpleadoRh($normalizado);
                if (empty($numEmpleado)) {
                    continue;
                }

                $sedeId = $this->resolverSedePorNombre($normalizado['sede'] ?? '');
                $campaignId = $this->resolverCampaignPorNombre($normalizado['campaign'] ?? $normalizado['campaña'] ?? '');

                $existe = EmpleadoRh::where('num_empleado', $numEmpleado)->first();
                $payload = [
                    'num_empleado' => $numEmpleado,
                    'nombre_completo' => trim($normalizado['nombre_completo'] ?? '') ?: $numEmpleado,
                    'sede_id' => $sedeId,
                    'campaign_id' => $campaignId,
                    'area' => $normalizado['area'] ?? null,
                    'puesto' => $normalizado['puesto'] ?? null,
                    'jefe_inmediato' => $normalizado['jefe_inmediato'] ?? null,
                    'horario' => $normalizado['horario'] ?? null,
                    'tipo_ingreso' => $normalizado['tipo_ingreso'] ?? null,
                    'fecha_ingreso' => $this->parsearFecha($normalizado['fecha_ingreso'] ?? null),
                    'estatus' => 'Activo',
                    'importacion_id' => $import->id,
                ];

                if ($existe) {
                    $existe->update($payload);
                    $actualizados++;
                } else {
                    EmpleadoRh::create($payload);
                    $nuevos++;
                }
            }

            $import->update([
                'registros_procesados' => $nuevos + $actualizados + $sinCambio + count($errores),
                'registros_nuevos' => $nuevos,
                'registros_actualizados' => $actualizados,
                'registros_sin_cambio' => $sinCambio,
            ]);

            $this->marcarBajasProbablesRh($import->id, array_keys($numEmpleadosEnArchivo));

            return $import->fresh();
        });
    }

    /**
     * Importa archivo de bajas RH. Marca empleados como baja y genera alertas para cuentas vinculadas activas.
     */
    public function importarBajasRH(string $filePath, int $importadoPorUserId): Importacion
    {
        $filas = $this->leerArchivo($filePath);
        $errores = [];
        $numEmpleadosBaja = [];

        $primeraFila = true;
        foreach ($filas as $idx => $row) {
            if ($primeraFila && $this->pareceEncabezado($row)) {
                $primeraFila = false;
                continue;
            }
            $normalizado = $this->normalizarFilaRh($row);
            $numEmpleado = $this->extraerNumEmpleadoRh($normalizado) ?: ($normalizado['id'] ?? null);
            if (empty($numEmpleado)) {
                $errores[] = ['fila' => $idx + 1, 'mensaje' => 'Fila sin número de empleado', 'datos' => $row];
                continue;
            }
            $numEmpleadosBaja[] = (string) $numEmpleado;
        }

        return DB::transaction(function () use ($filePath, $importadoPorUserId, $numEmpleadosBaja, $errores) {
            $path = $this->moverAStorage($filePath, 'bajas_rh');
            $import = Importacion::create([
                'tipo' => 'bajas_rh',
                'archivo' => $path,
                'registros_procesados' => count($numEmpleadosBaja) + count($errores),
                'registros_nuevos' => 0,
                'registros_actualizados' => count($numEmpleadosBaja),
                'registros_sin_cambio' => 0,
                'errores' => count($errores),
                'detalle_errores' => $errores ?: null,
                'importado_por' => $importadoPorUserId,
            ]);

            foreach ($numEmpleadosBaja as $num) {
                EmpleadoRh::where('num_empleado', $num)->update(['estatus' => 'Baja']);
                $this->alertarCuentasActivasConEmpleadoBaja($num, $importadoPorUserId);
            }

            return $import->fresh();
        });
    }

    /**
     * Importación dinámica por sistema: usa campos_mapeo del Sistema, upsert en sigua_accounts.
     */
    public function importarSistema(string $filePath, int $sistemaId, int $importadoPorUserId, ?int $sedeIdDefault = null): Importacion
    {
        $sistema = Sistema::findOrFail($sistemaId);
        $mapeo = $sistema->campos_mapeo ?? [];
        if (empty($mapeo)) {
            throw new SiguaException("El sistema {$sistema->name} no tiene campos_mapeo configurado.");
        }

        $filas = $this->leerArchivo($filePath);
        if (empty($filas)) {
            throw new SiguaException('El archivo no tiene filas.');
        }

        $header = $this->obtenerEncabezado($filas);
        $columnasFaltantes = $this->validarColumnasMapeadas($mapeo, $header);
        if (! empty($columnasFaltantes)) {
            throw new SiguaException('Columnas requeridas por el mapeo no encontradas en el archivo: ' . implode(', ', $columnasFaltantes));
        }

        $sedeDefault = $sedeIdDefault ?? Sede::query()->min('id');
        if (! $sedeDefault) {
            throw new SiguaException('No hay sedes en el catálogo. Cree al menos una sede para importar cuentas.');
        }
        $regex = $sistema->regex_id_empleado ? $this->compilarRegex($sistema->regex_id_empleado) : null;
        $campoCuenta = 'cuenta';
        $camposNombre = array_values(array_filter(['nombre', 'apellido'], fn ($k) => isset($mapeo[$k])));

        $errores = [];
        $nuevos = 0;
        $actualizados = 0;
        $sinCambio = 0;
        $identificadoresEnArchivo = [];
        $primeraFila = true;
        $indiceInicioDatos = 0;

        foreach ($filas as $idx => $row) {
            if ($primeraFila && $this->pareceEncabezado($row)) {
                $primeraFila = false;
                $indiceInicioDatos = $idx + 1;
                continue;
            }
            $filaMap = $this->filaConClavesMapeadas($row, $mapeo, $header);
            $identificadorCuenta = $this->valorMapeado($filaMap, $campoCuenta);
            if (empty($identificadorCuenta)) {
                $errores[] = ['fila' => $idx + 1, 'mensaje' => 'Sin identificador de cuenta', 'datos' => $row];
                continue;
            }
            $identificadoresEnArchivo[(string) $identificadorCuenta] = true;
        }

        return DB::transaction(function () use (
            $filePath,
            $sistema,
            $importadoPorUserId,
            $filas,
            $mapeo,
            $header,
            $regex,
            $campoCuenta,
            $camposNombre,
            $sedeDefault,
            $errores,
            $identificadoresEnArchivo,
            $indiceInicioDatos,
            &$nuevos,
            &$actualizados,
            &$sinCambio
        ) {
            $path = $this->moverAStorage($filePath, 'sistema_' . $sistema->slug);
            $import = Importacion::create([
                'tipo' => 'sistema',
                'archivo' => $path,
                'registros_procesados' => 0,
                'registros_nuevos' => 0,
                'registros_actualizados' => 0,
                'registros_sin_cambio' => 0,
                'errores' => count($errores),
                'detalle_errores' => $errores ?: null,
                'mapeo_usado' => $mapeo,
                'importado_por' => $importadoPorUserId,
            ]);

            $cuentasPrevias = CuentaGenerica::where('system_id', $sistema->id)
                ->pluck('usuario_cuenta')
                ->flip()
                ->all();

            $primeraFila = true;
            foreach ($filas as $idx => $row) {
                if ($primeraFila && $this->pareceEncabezado($row)) {
                    $primeraFila = false;
                    continue;
                }
                $filaMap = $this->filaConClavesMapeadas($row, $mapeo, $header);
                $identificadorCuenta = $this->valorMapeado($filaMap, $campoCuenta);
                if (empty($identificadorCuenta)) {
                    continue;
                }

                $nombreMostrar = $this->construirNombreMostrar($filaMap, $camposNombre);
                $datosExtra = $this->construirDatosExtra($filaMap, $mapeo);

                $empleadoRhId = null;
                $tipo = 'desconocida';
                $sedeId = $sedeDefault;

                if ($regex && preg_match($regex, (string) $identificadorCuenta, $m)) {
                    $numExtraido = $m[1] ?? $m[0];
                    $empleado = EmpleadoRh::where('num_empleado', $numExtraido)->where('estatus', 'Activo')->first();
                    if ($empleado) {
                        $empleadoRhId = $empleado->id;
                        $tipo = 'nominal';
                        if ($empleado->sede_id) {
                            $sedeId = $empleado->sede_id;
                        }
                    }
                }

                if ($tipo === 'desconocida') {
                    $tipo = $this->clasificarTipoCuenta(
                        (string) $identificadorCuenta,
                        $nombreMostrar,
                        $datosExtra
                    );
                }

                $existe = CuentaGenerica::where('system_id', $sistema->id)
                    ->where('usuario_cuenta', $identificadorCuenta)
                    ->first();

                $payload = [
                    'system_id' => $sistema->id,
                    'usuario_cuenta' => $identificadorCuenta,
                    'nombre_cuenta' => $nombreMostrar ?: $identificadorCuenta,
                    'sede_id' => $sedeId,
                    'estado' => 'activa',
                    'tipo' => $tipo,
                    'empleado_rh_id' => $empleadoRhId,
                    'datos_extra' => $datosExtra ?: null,
                    'importacion_id' => $import->id,
                ];

                if (isset($filaMap['perfil'])) {
                    $payload['perfil'] = $filaMap['perfil'];
                }
                if (isset($filaMap['ou'])) {
                    $payload['ou_ad'] = $filaMap['ou'];
                }

                if ($existe) {
                    $existe->update($payload);
                    $actualizados++;
                } else {
                    CuentaGenerica::create($payload);
                    $nuevos++;
                }
            }

            foreach (array_keys($cuentasPrevias) as $usuarioCuenta) {
                if (! isset($identificadoresEnArchivo[(string) $usuarioCuenta])) {
                    CuentaGenerica::where('system_id', $sistema->id)
                        ->where('usuario_cuenta', $usuarioCuenta)
                        ->update(['estado' => 'pendiente_revision']);
                }
            }

            $import->update([
                'registros_procesados' => $nuevos + $actualizados + $sinCambio + count($errores),
                'registros_nuevos' => $nuevos,
                'registros_actualizados' => $actualizados,
                'registros_sin_cambio' => $sinCambio,
            ]);

            return $import->fresh();
        });
    }

    /**
     * Vista previa: primeras filas mapeadas, sin modificar BD.
     *
     * @return array{columnas_detectadas: array, columnas_mapeadas: array, preview: array, advertencias: array}
     */
    public function preview(string $filePath, int $sistemaId): array
    {
        $sistema = Sistema::findOrFail($sistemaId);
        $mapeo = $sistema->campos_mapeo ?? [];
        if (empty($mapeo)) {
            throw new SiguaException("El sistema {$sistema->name} no tiene campos_mapeo configurado.");
        }

        $filas = $this->leerArchivo($filePath);
        if (empty($filas)) {
            return [
                'columnas_detectadas' => [],
                'columnas_mapeadas' => array_keys($mapeo),
                'preview' => [],
                'advertencias' => ['El archivo no tiene filas.'],
            ];
        }

        $header = $this->obtenerEncabezado($filas);
        $columnasDetectadas = is_array($header) ? array_values($header) : [];
        $advertencias = [];
        $columnasFaltantes = $this->validarColumnasMapeadas($mapeo, $header);
        if (! empty($columnasFaltantes)) {
            $advertencias[] = 'Columnas no encontradas en el archivo: ' . implode(', ', $columnasFaltantes);
        }

        $preview = [];
        $limit = 0;
        $primeraFila = true;
        foreach ($filas as $idx => $row) {
            if ($primeraFila && $this->pareceEncabezado($row)) {
                $primeraFila = false;
                continue;
            }
            if ($limit >= self::PREVIEW_LIMIT) {
                break;
            }
            $filaMap = $this->filaConClavesMapeadas($row, $mapeo, $header);
            $preview[] = $filaMap;
            $limit++;
        }

        return [
            'columnas_detectadas' => $columnasDetectadas,
            'columnas_mapeadas' => $mapeo,
            'preview' => $preview,
            'advertencias' => $advertencias,
        ];
    }

    // --------------- Wrappers v1 (retrocompatibilidad) ---------------

    public function importarRhActivos(string $filePath, int $importadoPorUserId): Importacion
    {
        return $this->importarRH($filePath, $importadoPorUserId);
    }

    public function importarAdUsuarios(string $filePath, int $importadoPorUserId): Importacion
    {
        $sistema = Sistema::where('slug', 'ad')->first();
        if (! $sistema) {
            throw new SiguaException('Sistema AD no encontrado. Ejecute seeders o cree el sistema con slug "ad".');
        }
        return $this->importarSistema($filePath, $sistema->id, $importadoPorUserId);
    }

    public function importarNeotel(string $filePath, string $isla, int $importadoPorUserId): Importacion
    {
        $sistema = Sistema::where('slug', 'neotel')->first();
        if (! $sistema) {
            throw new SiguaException('Sistema Neotel no encontrado.');
        }
        return $this->importarSistema($filePath, $sistema->id, $importadoPorUserId);
    }

    // --------------- Lectura de archivos ---------------

    /**
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
                $asoc[trim((string) $key)] = $row[$i] ?? '';
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
        $header = array_map(fn ($k) => trim((string) $k), $header);
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

    protected function obtenerEncabezado(array $filas): array
    {
        if (empty($filas)) {
            return [];
        }
        $primera = $filas[0];
        return array_keys($primera) !== range(0, count($primera) - 1) ? array_keys($primera) : $primera;
    }

    // --------------- RH ---------------

    protected function normalizarFilaRh(array $row): array
    {
        $map = [
            'id' => 'id', 'ID' => 'id',
            'nombre_completo' => 'nombre_completo', 'NOMBRE COMPLETO' => 'nombre_completo',
            'sede' => 'sede', 'SEDE' => 'sede',
            'campaña' => 'campaign', 'CAMPAÑA' => 'campaign', 'campaign' => 'campaign',
            'puesto' => 'puesto', 'PUESTO' => 'puesto',
            'numero_empleado' => 'numero_empleado', 'num_empleado' => 'numero_empleado',
            'area' => 'area', 'AREA' => 'area',
            'jefe_inmediato' => 'jefe_inmediato', 'horario' => 'horario', 'tipo_ingreso' => 'tipo_ingreso',
            'fecha_ingreso' => 'fecha_ingreso',
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

    protected function extraerNumEmpleadoRh(array $normalizado): ?string
    {
        $id = $normalizado['id'] ?? $normalizado['numero_empleado'] ?? $normalizado['num_empleado'] ?? null;
        if ($id !== null && $id !== '') {
            return trim((string) $id);
        }
        return null;
    }

    protected function resolverSedePorNombre(string $nombre): ?int
    {
        if (trim($nombre) === '') {
            return null;
        }
        $sede = Sede::where('name', 'like', '%' . trim($nombre) . '%')
            ->orWhere('code', 'like', '%' . trim($nombre) . '%')
            ->first();
        return $sede?->id;
    }

    protected function resolverCampaignPorNombre(string $nombre): ?int
    {
        if (trim($nombre) === '') {
            return null;
        }
        $campaign = Campaign::where('name', 'like', '%' . trim($nombre) . '%')->first();
        return $campaign?->id;
    }

    protected function parsearFecha(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }
        try {
            $d = \Carbon\Carbon::parse($value);
            return $d->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    protected function marcarBajasProbablesRh(int $importacionActualId, array $numEmpleadosEnArchivo): void
    {
        $prevImport = Importacion::where('tipo', 'rh_activos')
            ->where('id', '!=', $importacionActualId)
            ->orderByDesc('id')
            ->first();
        if (! $prevImport) {
            return;
        }
        $empleadosPrevios = EmpleadoRh::where('importacion_id', $prevImport->id)->pluck('num_empleado')->all();
        $bajas = array_diff($empleadosPrevios, array_keys($numEmpleadosEnArchivo));
        if (! empty($bajas)) {
            EmpleadoRh::whereIn('num_empleado', $bajas)->update(['estatus' => 'Baja probable']);
        }
    }

    protected function alertarCuentasActivasConEmpleadoBaja(string $numEmpleado, int $userId): void
    {
        $empleado = EmpleadoRh::where('num_empleado', $numEmpleado)->first();
        if (! $empleado) {
            return;
        }
        $cuentasActivas = CuentaGenerica::where('empleado_rh_id', $empleado->id)->where('estado', 'activa')->get();
        foreach ($cuentasActivas as $cuenta) {
            Alerta::create([
                'tipo' => 'cuenta_sin_responsable',
                'titulo' => 'Cuenta activa con empleado dado de baja',
                'descripcion' => "La cuenta {$cuenta->usuario_cuenta} ({$cuenta->nombre_cuenta}) sigue activa pero el empleado RH {$empleado->nombre_completo} ({$numEmpleado}) fue dado de baja.",
                'severidad' => 'warning',
                'entidad_tipo' => 'cuenta',
                'entidad_id' => $cuenta->id,
                'sede_id' => $cuenta->sede_id,
                'sistema_id' => $cuenta->system_id,
                'dirigida_a' => null,
            ]);
        }
    }

    // --------------- Sistema dinámico ---------------

    protected function validarColumnasMapeadas(array $mapeo, array $header): array
    {
        $headerNorm = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $faltantes = [];
        foreach ($mapeo as $clave => $columnaArchivo) {
            if (trim((string) $columnaArchivo) === '') {
                continue;
            }
            $colNorm = strtolower(trim((string) $columnaArchivo));
            if (! in_array($colNorm, $headerNorm, true)) {
                $faltantes[] = $columnaArchivo;
            }
        }
        return $faltantes;
    }

    /**
     * Convierte fila del archivo a claves del mapeo (cuenta, nombre, apellido, ou, perfil, etc.).
     */
    protected function filaConClavesMapeadas(array $row, array $mapeo, array $header): array
    {
        $out = [];
        $rowNorm = [];
        foreach ($row as $key => $v) {
            $rowNorm[strtolower(trim((string) $key))] = $v;
        }
        foreach ($mapeo as $clave => $columnaArchivo) {
            $colNorm = strtolower(trim((string) $columnaArchivo));
            $val = $rowNorm[$colNorm] ?? null;
            $out[$clave] = $val !== null && $val !== '' ? trim((string) $val) : '';
        }
        return $out;
    }

    protected function valorMapeado(array $filaMap, string $clave): ?string
    {
        $v = $filaMap[$clave] ?? $filaMap['cuenta'] ?? null;
        return $v !== null && $v !== '' ? (string) $v : null;
    }

    protected function construirNombreMostrar(array $filaMap, array $camposNombre): string
    {
        $partes = [];
        foreach ($camposNombre as $c) {
            if (! empty($filaMap[$c] ?? '')) {
                $partes[] = trim((string) $filaMap[$c]);
            }
        }
        return implode(' ', $partes);
    }

    protected function construirDatosExtra(array $filaMap, array $mapeo): array
    {
        $extra = [];
        foreach ($filaMap as $k => $v) {
            if ($v !== '' && $v !== null) {
                $extra[$k] = $v;
            }
        }
        return $extra;
    }

    protected function compilarRegex(string $regex): ?string
    {
        if (trim($regex) === '') {
            return null;
        }
        $delim = '/';
        if (str_contains($regex, $delim)) {
            $delim = '#';
        }
        return $delim . $regex . $delim;
    }

    protected function clasificarTipoCuenta(string $identificadorCuenta, string $nombreMostrar, array $datosExtra): string
    {
        $cuentaLower = strtolower($identificadorCuenta);
        $nombreLower = strtolower($nombreMostrar);
        $ou = strtolower((string) ($datosExtra['ou'] ?? ''));

        if (preg_match('/\b(prueba|test|demo|gpo)\b/i', $nombreLower) || preg_match('/\b(prueba|test|demo)\b/i', $cuentaLower)) {
            return 'prueba';
        }
        if (preg_match('/^(svc|service|msol|krbtgt|sistema|admin)/i', $cuentaLower) || str_contains($ou, 'servicio')) {
            return 'servicio';
        }
        if (str_contains($ou, 'generico') || str_contains($ou, 'genérico') || preg_match('/\bprb\b/i', $cuentaLower)) {
            return 'generica';
        }
        return 'desconocida';
    }

    protected function moverAStorage(string $filePath, string $tipo): string
    {
        $nombre = date('Y-m-d_His') . '_' . basename($filePath);
        $dest = 'sigua/imports/' . $tipo . '/' . $nombre;
        $content = file_get_contents($filePath);
        Storage::disk('local')->put($dest, $content);
        return $dest;
    }
}
