<?php

namespace App\Models\Sigua;

use App\Models\Campaign;
use App\Models\Sede;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Snapshot de empleado activo en RH (SIGUA v2).
 *
 * @property int $id
 * @property string $num_empleado
 * @property string $nombre_completo
 * @property int|null $sede_id
 * @property int|null $campaign_id
 * @property int|null $importacion_id
 */
class EmpleadoRh extends Model
{
    protected $table = 'sigua_empleados_rh';

    protected $fillable = [
        'num_empleado',
        'nombre_completo',
        'sede_id',
        'campaign_id',
        'area',
        'puesto',
        'jefe_inmediato',
        'horario',
        'tipo_ingreso',
        'fecha_ingreso',
        'estatus',
        'importacion_id',
    ];

    protected $casts = [
        'fecha_ingreso' => 'date',
    ];

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    /**
     * Cuentas (sigua_accounts) vinculadas a este empleado RH.
     *
     * @return HasMany<CuentaGenerica>
     */
    public function cuentas(): HasMany
    {
        return $this->hasMany(CuentaGenerica::class, 'empleado_rh_id');
    }

    public function importacion(): BelongsTo
    {
        return $this->belongsTo(Importacion::class, 'importacion_id');
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('estatus', 'Activo');
    }

    public function scopePorSede(Builder $query, int $id): Builder
    {
        return $query->where('sede_id', $id);
    }

    public function scopePorCampana(Builder $query, int $id): Builder
    {
        return $query->where('campaign_id', $id);
    }

    public function scopeConCuentaEn(Builder $query, int $sistemaId): Builder
    {
        return $query->whereHas('cuentas', fn (Builder $q) => $q->where('system_id', $sistemaId));
    }

    public function scopeSinCuentaEn(Builder $query, int $sistemaId): Builder
    {
        return $query->whereDoesntHave('cuentas', fn (Builder $q) => $q->where('system_id', $sistemaId));
    }
}
