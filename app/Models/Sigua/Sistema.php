<?php

namespace App\Models\Sigua;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Catálogo de sistemas (AD, Neotel, Ahevaa) en SIGUA.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property array|null $campos_mapeo
 * @property string|null $regex_id_empleado
 * @property bool $activo
 * @property string|null $icono
 * @property string|null $color
 * @property int $orden
 */
class Sistema extends Model
{
    protected $table = 'sigua_systems';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'es_externo',
        'contacto_externo',
        'campos_mapeo',
        'campo_id_empleado',
        'regex_id_empleado',
        'activo',
        'icono',
        'color',
        'orden',
    ];

    protected $casts = [
        'es_externo' => 'boolean',
        'campos_mapeo' => 'array',
        'activo' => 'boolean',
    ];

    /**
     * Cuentas asociadas a este sistema (alias v2).
     *
     * @return HasMany<CuentaGenerica>
     */
    public function cuentas(): HasMany
    {
        return $this->hasMany(CuentaGenerica::class, 'system_id');
    }

    /**
     * Cuentas genéricas asociadas a este sistema.
     *
     * @return HasMany<CuentaGenerica>
     */
    public function cuentasGenericas(): HasMany
    {
        return $this->hasMany(CuentaGenerica::class, 'system_id');
    }

    /**
     * Formatos CA-01 que aplican a este sistema.
     *
     * @return HasMany<FormatoCA01>
     */
    public function formatosCA01(): HasMany
    {
        return $this->hasMany(FormatoCA01::class, 'system_id');
    }

    /**
     * Registros de bitácora de este sistema.
     *
     * @return HasMany<Bitacora>
     */
    public function bitacoras(): HasMany
    {
        return $this->hasMany(Bitacora::class, 'system_id');
    }

    /**
     * Incidentes SIGUA asociados a este sistema.
     *
     * @return HasMany<Incidente>
     */
    public function incidentes(): HasMany
    {
        return $this->hasMany(Incidente::class, 'system_id');
    }

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    public function scopeExternos(Builder $query): Builder
    {
        return $query->where('es_externo', true);
    }

    public function scopeInternos(Builder $query): Builder
    {
        return $query->where('es_externo', false);
    }
}
