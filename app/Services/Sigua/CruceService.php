<?php

namespace App\Services\Sigua;

use App\Exceptions\Sigua\SiguaException;
use App\Models\Sigua\Cruce;
use App\Models\Sigua\Importacion;
use Illuminate\Support\Facades\DB;

/**
 * Servicio de cruces RH vs AD vs Neotel.
 * Compara datos de importaciones y persiste resultados en sigua_cross_matches.
 */
class CruceService
{
    /**
     * Compara empleados RH activos contra usuarios AD.
     *
     * @return array{coincidencias: array, en_ad_no_rh: array, en_rh_no_ad: array, categorizacion: array}
     * @throws SiguaException
     */
    public function cruceRhVsAd(int $importacionRhId, int $importacionAdId): array
    {
        $rh = Importacion::with('importadoPor')->find($importacionRhId);
        $ad = Importacion::find($importacionAdId);
        if (! $rh || ! $ad) {
            throw new SiguaException('Una o ambas importaciones no existen.');
        }

        $rhData = $rh->datos_importados ?? [];
        $adData = $ad->datos_importados ?? [];
        if (empty($rhData) || empty($adData)) {
            throw new SiguaException('Faltan datos importados para realizar el cruce. Reimporte los archivos.');
        }

        $rhKeys = $this->normalizarClavesRh($rhData);
        $adKeys = $this->normalizarClavesAd($adData);
        $coincidencias = [];
        $enAdNoRh = [];
        $enRhNoAd = [];

        foreach ($adKeys as $cuenta => $row) {
            $encontrado = $this->buscarEnRh($cuenta, $row, $rhKeys);
            if ($encontrado) {
                $coincidencias[] = array_merge($row, ['rh' => $encontrado, 'categoria' => 'activo']);
            } else {
                $enAdNoRh[] = array_merge($row, ['categoria' => 'baja_pendiente']);
            }
        }
        foreach ($rhKeys as $clave => $row) {
            if (! $this->existeEnAd($clave, $adKeys)) {
                $enRhNoAd[] = array_merge($row, ['categoria' => 'sin_ad']);
            }
        }

        $categorizacion = [
            'activo' => count($coincidencias),
            'baja_pendiente' => count($enAdNoRh),
            'genérico' => 0,
            'sistema' => 0,
        ];

        return [
            'coincidencias' => $coincidencias,
            'en_ad_no_rh' => $enAdNoRh,
            'en_rh_no_ad' => $enRhNoAd,
            'categorizacion' => $categorizacion,
        ];
    }

    /**
     * Compara RH activos contra Neotel (por isla).
     *
     * @return array{coincidencias: array, en_neotel_no_rh: array, en_rh_no_neotel: array}
     * @throws SiguaException
     */
    public function cruceRhVsNeotel(int $importacionRhId, int $importacionNeotelId): array
    {
        $rh = Importacion::find($importacionRhId);
        $neotel = Importacion::find($importacionNeotelId);
        if (! $rh || ! $neotel) {
            throw new SiguaException('Una o ambas importaciones no existen.');
        }

        $rhData = $rh->datos_importados ?? [];
        $neotelData = $neotel->datos_importados ?? [];
        if (empty($rhData) || empty($neotelData)) {
            throw new SiguaException('Faltan datos importados para realizar el cruce.');
        }

        $rhKeys = $this->normalizarClavesRh($rhData);
        $neotelKeys = $this->normalizarClavesNeotel($neotelData);
        $coincidencias = [];
        $enNeotelNoRh = [];
        $enRhNoNeotel = [];

        foreach ($neotelKeys as $usuario => $row) {
            $encontrado = $this->buscarEnRhPorNombreOuUsuario($row, $rhKeys);
            if ($encontrado) {
                $coincidencias[] = array_merge($row, ['rh' => $encontrado]);
            } else {
                $enNeotelNoRh[] = $row;
            }
        }
        foreach ($rhKeys as $clave => $row) {
            if (! $this->existeEnNeotel($row, $neotelKeys)) {
                $enRhNoNeotel[] = $row;
            }
        }

        return [
            'coincidencias' => $coincidencias,
            'en_neotel_no_rh' => $enNeotelNoRh,
            'en_rh_no_neotel' => $enRhNoNeotel,
        ];
    }

    /**
     * Ejecuta todos los cruces con las últimas importaciones por tipo y guarda en sigua_cruces.
     *
     * @throws SiguaException
     */
    public function cruceCompleto(int $ejecutadoPorUserId): array
    {
        $ultimaRh = Importacion::where('tipo', 'rh_activos')->orderByDesc('id')->first();
        $ultimaAd = Importacion::where('tipo', 'ad_usuarios')->orderByDesc('id')->first();
        $ultimasNeotel = Importacion::whereIn('tipo', ['neotel_isla2', 'neotel_isla3', 'neotel_isla4'])
            ->orderByDesc('id')
            ->get()
            ->keyBy('tipo');

        if (! $ultimaRh) {
            throw new SiguaException('No hay importación de RH activos.');
        }

        $resultados = [];
        $importId = null;

        return DB::transaction(function () use ($ultimaRh, $ultimaAd, $ultimasNeotel, $ejecutadoPorUserId) {
            $resultados = [];
            if ($ultimaRh && $ultimaAd) {
                $cruceRhAd = $this->cruceRhVsAd($ultimaRh->id, $ultimaAd->id);
                $total = count($cruceRhAd['coincidencias']) + count($cruceRhAd['en_ad_no_rh']) + count($cruceRhAd['en_rh_no_ad']);
                $cruce = Cruce::create([
                    'import_id' => $ultimaAd->id,
                    'tipo_cruce' => 'rh_vs_ad',
                    'fecha_ejecucion' => now(),
                    'total_analizados' => $total,
                    'coincidencias' => count($cruceRhAd['coincidencias']),
                    'sin_match' => count($cruceRhAd['en_ad_no_rh']) + count($cruceRhAd['en_rh_no_ad']),
                    'resultado_json' => $cruceRhAd,
                    'ejecutado_por' => $ejecutadoPorUserId,
                ]);
                $resultados['rh_vs_ad'] = $cruce;
            }

            foreach (['neotel_isla2', 'neotel_isla3', 'neotel_isla4'] as $isla) {
                $impNeotel = $ultimasNeotel->get($isla);
                if ($ultimaRh && $impNeotel) {
                    $cruceRhNeotel = $this->cruceRhVsNeotel($ultimaRh->id, $impNeotel->id);
                    $total = count($cruceRhNeotel['coincidencias']) + count($cruceRhNeotel['en_neotel_no_rh']) + count($cruceRhNeotel['en_rh_no_neotel']);
                    $cruce = Cruce::create([
                        'import_id' => $impNeotel->id,
                        'tipo_cruce' => 'rh_vs_neotel',
                        'fecha_ejecucion' => now(),
                        'total_analizados' => $total,
                        'coincidencias' => count($cruceRhNeotel['coincidencias']),
                        'sin_match' => count($cruceRhNeotel['en_neotel_no_rh']) + count($cruceRhNeotel['en_rh_no_neotel']),
                        'resultado_json' => $cruceRhNeotel,
                        'ejecutado_por' => $ejecutadoPorUserId,
                    ]);
                    $resultados[$isla] = $cruce;
                }
            }

            return $resultados;
        });
    }

    /**
     * Guarda el resultado de un cruce en sigua_cruces.
     */
    public function guardarResultado(
        string $tipoCruce,
        array $resultadoJson,
        int $ejecutadoPorUserId,
        ?int $importId = null
    ): Cruce {
        $coincidenciasArr = $resultadoJson['coincidencias'] ?? [];
        $coincidenciasCount = $resultadoJson['coincidencias_count'] ?? count($coincidenciasArr);
        $total = $resultadoJson['total_analizados'] ?? 0;
        $sinMatch = $resultadoJson['sin_match_count'] ?? $resultadoJson['sin_match'] ?? max(0, $total - $coincidenciasCount);

        return Cruce::create([
            'import_id' => $importId,
            'tipo_cruce' => $tipoCruce,
            'fecha_ejecucion' => now(),
            'total_analizados' => $total,
            'coincidencias' => $coincidenciasCount,
            'sin_match' => $sinMatch,
            'resultado_json' => $resultadoJson,
            'ejecutado_por' => $ejecutadoPorUserId,
        ]);
    }

    private function normalizarClavesRh(array $data): array
    {
        $out = [];
        foreach ($data as $row) {
            $id = $row['id'] ?? $row['ID'] ?? $row['numero_empleado'] ?? null;
            $id = $id ?? trim(($row['nombre_completo'] ?? $row['NOMBRE COMPLETO'] ?? '') . '_' . ($row['sede'] ?? $row['SEDE'] ?? ''));
            if ($id !== null && $id !== '') {
                $out[strtolower((string) $id)] = $row;
            }
        }
        return $out;
    }

    private function normalizarClavesAd(array $data): array
    {
        $out = [];
        foreach ($data as $row) {
            $cuenta = $row['cuenta_sam'] ?? $row['CuentaSAM'] ?? $row['cuenta'] ?? null;
            if ($cuenta !== null && $cuenta !== '') {
                $out[strtolower(trim((string) $cuenta))] = $row;
            }
        }
        return $out;
    }

    private function normalizarClavesNeotel(array $data): array
    {
        $out = [];
        foreach ($data as $row) {
            $usuario = $row['usuario'] ?? $row['USUARIO'] ?? $row['cuenta'] ?? null;
            if ($usuario !== null && $usuario !== '') {
                $out[strtolower(trim((string) $usuario))] = $row;
            }
        }
        return $out;
    }

    private function buscarEnRh(string $cuentaAd, array $rowAd, array $rhKeys): ?array
    {
        $nombre = $rowAd['nombre'] ?? $rowAd['Nombre'] ?? '';
        foreach ($rhKeys as $rhRow) {
            $nombreRh = $rhRow['nombre_completo'] ?? $rhRow['NOMBRE COMPLETO'] ?? '';
            if (stripos($nombreRh, $nombre) !== false || stripos($nombre, $nombreRh) !== false) {
                return $rhRow;
            }
        }
        if (isset($rhKeys[strtolower($cuentaAd)])) {
            return $rhKeys[strtolower($cuentaAd)];
        }
        return null;
    }

    private function existeEnAd(string $claveRh, array $adKeys): bool
    {
        foreach ($adKeys as $adRow) {
            $nombre = $adRow['nombre'] ?? $adRow['Nombre'] ?? '';
            if (stripos($claveRh, $nombre) !== false) {
                return true;
            }
        }
        return false;
    }

    private function buscarEnRhPorNombreOuUsuario(array $rowNeotel, array $rhKeys): ?array
    {
        $nombre = trim(($rowNeotel['nombre'] ?? '') . ' ' . ($rowNeotel['apellido'] ?? ''));
        $usuario = $rowNeotel['usuario'] ?? $rowNeotel['USUARIO'] ?? '';
        foreach ($rhKeys as $rhRow) {
            $nombreRh = $rhRow['nombre_completo'] ?? $rhRow['NOMBRE COMPLETO'] ?? '';
            if ($nombre && (stripos($nombreRh, $nombre) !== false || stripos($nombre, $nombreRh) !== false)) {
                return $rhRow;
            }
            if ($usuario && isset($rhKeys[strtolower($usuario)])) {
                return $rhKeys[strtolower($usuario)];
            }
        }
        return null;
    }

    private function existeEnNeotel(array $rowRh, array $neotelKeys): bool
    {
        $nombreRh = $rowRh['nombre_completo'] ?? $rowRh['NOMBRE COMPLETO'] ?? '';
        foreach ($neotelKeys as $nRow) {
            $nombreN = trim(($nRow['nombre'] ?? '') . ' ' . ($nRow['apellido'] ?? ''));
            if ($nombreN && stripos($nombreRh, $nombreN) !== false) {
                return true;
            }
        }
        return false;
    }
}
