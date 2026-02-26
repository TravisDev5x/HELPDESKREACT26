<?php

namespace App\Services\Sigua;

use App\Exceptions\Sigua\SiguaException;
use App\Models\Sigua\Alerta;
use App\Models\Sigua\Configuracion;
use App\Models\Sigua\CuentaGenerica;
use App\Models\Sigua\EmpleadoRh;
use App\Models\Sigua\FormatoCA01;
use App\Models\Sigua\Bitacora;
use App\Models\Sigua\Importacion;
use App\Models\Sigua\Sistema;
use App\Models\Sede;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Servicio de alertas automáticas SIGUA.
 * Umbrales desde sigua_configuracion (no hardcodeados).
 */
class AlertaService
{
    /** Tipos de importación por slug de sistema (para verificar sistemas sin importación). */
    private const SISTEMA_IMPORT_TIPOS = [
        'ad' => ['ad_usuarios'],
        'neotel' => ['neotel_isla2', 'neotel_isla3', 'neotel_isla4'],
    ];

    /**
     * Ejecuta todas las verificaciones y crea alertas (no duplica si ya existe alerta no resuelta del mismo tipo/entidad).
     */
    public function generarAlertas(): void
    {
        $this->verificarCA01PorVencer()->each(fn ($ca01) => $this->crearAlertaCA01PorVencer($ca01));
        $this->verificarCA01Vencidos(); // ya crea alerta y marca vencido internamente
        $this->verificarBitacorasFaltantes()->each(fn ($item) => $this->crearAlertaBitacoraFaltante($item));
        $this->verificarBajasPendientes()->each(fn ($item) => $this->crearAlertaBajaPendiente($item));
        $this->verificarGenericasSinCA01()->each(fn ($cuenta) => $this->crearAlertaGenericaSinCA01($cuenta));
        $this->verificarSistemasSinImportacion()->each(fn ($item) => $this->crearAlertaSistemaSinImportacion($item));
    }

    /**
     * Ejecuta solo un tipo de verificación y crea alertas.
     * Tipos: ca01, bitacora, bajas, genericas, sistemas.
     */
    public function ejecutarTipo(string $tipo): void
    {
        switch ($tipo) {
            case 'ca01':
                $this->ejecutarTipoCA01();
                break;
            case 'bitacora':
                $this->verificarBitacorasFaltantes()->each(fn ($item) => $this->crearAlertaBitacoraFaltante($item));
                break;
            case 'bajas':
                $this->verificarBajasPendientes()->each(fn ($item) => $this->crearAlertaBajaPendiente($item));
                break;
            case 'genericas':
                $this->verificarGenericasSinCA01()->each(fn ($cuenta) => $this->crearAlertaGenericaSinCA01($cuenta));
                break;
            case 'sistemas':
                $this->verificarSistemasSinImportacion()->each(fn ($item) => $this->crearAlertaSistemaSinImportacion($item));
                break;
            default:
                throw new SiguaException("Tipo de alerta no válido: {$tipo}");
        }
    }

    private function ejecutarTipoCA01(): void
    {
        $this->verificarCA01PorVencer()->each(fn ($ca01) => $this->crearAlertaCA01PorVencer($ca01));
        $this->verificarCA01Vencidos();
    }

    /**
     * CA-01 que vencen en los próximos N días (N desde ca01_dias_alerta_vencimiento).
     *
     * @param  int|null  $sedeId  Filtrar por sede (opcional).
     * @return Collection<int, FormatoCA01>
     */
    public function verificarCA01PorVencer(?int $sedeId = null): Collection
    {
        $dias = Configuracion::getValor('ca01_dias_alerta_vencimiento', 15);
        $limite = Carbon::today()->addDays($dias);

        $query = FormatoCA01::vigentes()
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [Carbon::today(), $limite])
            ->orderBy('fecha_vencimiento');
        if ($sedeId !== null) {
            $query->where('sede_id', $sedeId);
        }

        return $query->get();
    }

    /**
     * CA-01 ya vencidos; crea alerta y marca estado vencido si aplica.
     *
     * @param  int|null  $sedeId  Filtrar por sede (opcional).
     * @return Collection<int, FormatoCA01>
     */
    public function verificarCA01Vencidos(?int $sedeId = null): Collection
    {
        $query = FormatoCA01::vigentes()
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', Carbon::today());
        if ($sedeId !== null) {
            $query->where('sede_id', $sedeId);
        }
        $lista = $query->get();

        foreach ($lista as $ca01) {
            $ca01->update(['estado' => 'vencido']);
            $this->crearAlertaCA01Vencido($ca01);
        }

        return $lista;
    }

    /**
     * Sedes/campañas sin bitácora en los últimos N días (bitacora_dias_tolerancia).
     * Retorna array de {sede_id, sede_nombre, campaign_id?, campaign_nombre?, dias_sin_registro}.
     *
     * @return Collection<int, array>
     */
    public function verificarBitacorasFaltantes(): Collection
    {
        $dias = Configuracion::getValor('bitacora_dias_tolerancia', 5);
        $desde = Carbon::today()->subDays($dias);
        $sedesConRegistro = Bitacora::query()
            ->whereDate('fecha', '>=', $desde)
            ->distinct()
            ->pluck('sede_id')
            ->all();
        $cuentasActivas = CuentaGenerica::where('estado', 'activa')
            ->whereNotNull('sede_id')
            ->get()
            ->groupBy('sede_id');
        $out = new Collection;
        foreach ($cuentasActivas as $sedeId => $cuentas) {
            if (in_array($sedeId, $sedesConRegistro, true)) {
                continue;
            }
            $sede = Sede::find($sedeId);
            $out->push([
                'sede_id' => $sedeId,
                'sede_nombre' => $sede?->name ?? (string) $sedeId,
                'campaign_id' => null,
                'campaign_nombre' => null,
                'dias_sin_registro' => $dias,
            ]);
        }
        return $out;
    }

    /**
     * Empleados dados de baja en RH con cuentas activas.
     *
     * @return Collection<int, array{empleado: EmpleadoRh, cuentas: Collection}>
     */
    public function verificarBajasPendientes(): Collection
    {
        $empleados = EmpleadoRh::whereIn('estatus', ['Baja', 'Baja probable'])
            ->with(['cuentas' => fn ($q) => $q->where('estado', 'activa')])
            ->get();

        return $empleados->filter(fn ($e) => $e->cuentas->isNotEmpty())->map(fn ($e) => [
            'empleado' => $e,
            'cuentas' => $e->cuentas,
        ])->values();
    }

    /**
     * Cuentas genéricas activas sin CA-01 vigente.
     *
     * @param  int|null  $sedeId  Filtrar por sede (opcional).
     * @return Collection<int, CuentaGenerica>
     */
    public function verificarGenericasSinCA01(?int $sedeId = null): Collection
    {
        $query = CuentaGenerica::where('tipo', 'generica')
            ->where('estado', 'activa')
            ->whereDoesntHave('formatosCA01', fn ($q) => $q->where('sigua_ca01.estado', 'vigente'))
            ->with(['sistema', 'sede']);
        if ($sedeId !== null) {
            $query->where('sede_id', $sedeId);
        }

        return $query->get();
    }

    /**
     * Sistemas que no se han importado recientemente (mapeo slug -> tipos de importación).
     *
     * @return Collection<int, array{sistema: Sistema, ultima_importacion: Importacion|null, dias_desde: int}>
     */
    public function verificarSistemasSinImportacion(int $diasLimite = 30): Collection
    {
        $dias = $diasLimite > 0 ? $diasLimite : (int) Configuracion::getValor('bitacora_dias_tolerancia', 30);
        $desde = Carbon::today()->subDays($dias);
        $sistemas = Sistema::activos()->get();
        $out = new Collection;

        foreach ($sistemas as $sistema) {
            $tipos = self::SISTEMA_IMPORT_TIPOS[$sistema->slug] ?? null;
            if ($tipos === null) {
                continue;
            }
            $ultima = Importacion::whereIn('tipo', $tipos)->orderByDesc('created_at')->first();
            $diasDesde = $ultima ? Carbon::parse($ultima->created_at)->diffInDays(Carbon::today()) : 999;
            if ($diasDesde >= $dias) {
                $out->push([
                    'sistema' => $sistema,
                    'ultima_importacion' => $ultima,
                    'dias_desde' => $diasDesde,
                ]);
            }
        }

        return $out;
    }

    public function marcarAlertaLeida(int $alertaId, int $userId): Alerta
    {
        $alerta = Alerta::findOrFail($alertaId);
        $alerta->update(['leida' => true]);
        return $alerta->fresh();
    }

    public function resolverAlerta(int $alertaId, int $userId): Alerta
    {
        $alerta = Alerta::findOrFail($alertaId);
        $alerta->update([
            'resuelta' => true,
            'resuelta_por' => $userId,
            'resuelta_en' => now(),
        ]);
        return $alerta->fresh();
    }

    private function crearAlertaCA01PorVencer(FormatoCA01 $ca01): void
    {
        $this->crearAlertaSiNoExiste('ca01_por_vencer', [
            'titulo' => 'CA-01 por vencer',
            'descripcion' => "El CA-01 (sede/sistema/campaña) vence el {$ca01->fecha_vencimiento->format('d/m/Y')}. Renovar o dar de baja cuentas.",
            'severidad' => 'warning',
            'entidad_tipo' => 'ca01',
            'entidad_id' => $ca01->id,
            'sede_id' => $ca01->sede_id,
            'sistema_id' => $ca01->system_id,
            'dirigida_a' => $ca01->gerente_user_id,
        ]);
    }

    private function crearAlertaCA01Vencido(FormatoCA01 $ca01): void
    {
        $this->crearAlertaSiNoExiste('ca01_vencido', [
            'titulo' => 'CA-01 vencido',
            'descripcion' => "El CA-01 (sede/sistema/campaña) venció el {$ca01->fecha_vencimiento->format('d/m/Y')}. Renovar o cancelar.",
            'severidad' => 'critical',
            'entidad_tipo' => 'ca01',
            'entidad_id' => $ca01->id,
            'sede_id' => $ca01->sede_id,
            'sistema_id' => $ca01->system_id,
            'dirigida_a' => $ca01->gerente_user_id,
        ]);
    }

    private function crearAlertaBitacoraFaltante(array $item): void
    {
        $this->crearAlertaSiNoExiste('bitacora_faltante', [
            'titulo' => 'Bitácora faltante',
            'descripcion' => "Sede {$item['sede_nombre']} sin registros de bitácora en los últimos {$item['dias_sin_registro']} días.",
            'severidad' => 'warning',
            'entidad_tipo' => 'sede',
            'entidad_id' => $item['sede_id'],
            'sede_id' => $item['sede_id'],
        ]);
    }

    private function crearAlertaBajaPendiente(array $item): void
    {
        $e = $item['empleado'];
        $this->crearAlertaSiNoExiste('baja_pendiente', [
            'titulo' => 'Baja pendiente de reflejar',
            'descripcion' => "Empleado {$e->nombre_completo} ({$e->num_empleado}) dado de baja en RH tiene {$item['cuentas']->count()} cuenta(s) activa(s).",
            'severidad' => 'warning',
            'entidad_tipo' => 'empleado_rh',
            'entidad_id' => $e->id,
            'sede_id' => $e->sede_id,
        ]);
    }

    private function crearAlertaGenericaSinCA01(CuentaGenerica $cuenta): void
    {
        $this->crearAlertaSiNoExiste('cuenta_sin_responsable', [
            'titulo' => 'Cuenta genérica sin CA-01',
            'descripcion' => "La cuenta {$cuenta->usuario_cuenta} ({$cuenta->nombre_cuenta}) está activa sin CA-01 vigente.",
            'severidad' => 'warning',
            'entidad_tipo' => 'cuenta',
            'entidad_id' => $cuenta->id,
            'sede_id' => $cuenta->sede_id,
            'sistema_id' => $cuenta->system_id,
        ]);
    }

    private function crearAlertaSistemaSinImportacion(array $item): void
    {
        $s = $item['sistema'];
        $this->crearAlertaSiNoExiste('sistema_sin_importacion', [
            'titulo' => 'Sistema sin importación reciente',
            'descripcion' => "El sistema {$s->name} no tiene importación en los últimos {$item['dias_desde']} días.",
            'severidad' => 'info',
            'entidad_tipo' => 'sistema',
            'entidad_id' => $s->id,
            'sistema_id' => $s->id,
        ]);
    }

    private function crearAlertaSiNoExiste(string $tipo, array $attrs): void
    {
        $exists = Alerta::noResueltas()
            ->where('tipo', $tipo)
            ->when(isset($attrs['entidad_tipo'], $attrs['entidad_id']), fn ($q) => $q->where('entidad_tipo', $attrs['entidad_tipo'])->where('entidad_id', $attrs['entidad_id']))
            ->exists();

        if (! $exists) {
            Alerta::create(array_merge($attrs, ['tipo' => $tipo]));
        }
    }
}
