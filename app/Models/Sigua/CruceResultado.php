<?php

namespace App\Models\Sigua;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Detalle por empleado/cuenta de cada cruce (SIGUA v2).
 *
 * @property int $id
 * @property int $cruce_id
 * @property int|null $empleado_rh_id
 * @property string|null $num_empleado
 * @property string|null $nombre_empleado
 * @property string|null $sede
 * @property string|null $campana
 * @property array|null $resultados_por_sistema
 * @property string $categoria
 * @property bool $requiere_accion
 * @property string|null $accion_sugerida
 * @property string|null $accion_tomada
 * @property int|null $accion_por
 */
class CruceResultado extends Model
{
    protected $table = 'sigua_cruce_resultados';

    protected $fillable = [
        'cruce_id',
        'empleado_rh_id',
        'num_empleado',
        'nombre_empleado',
        'sede',
        'campana',
        'resultados_por_sistema',
        'categoria',
        'requiere_accion',
        'accion_sugerida',
        'accion_tomada',
        'accion_por',
    ];

    protected $casts = [
        'resultados_por_sistema' => 'array',
        'requiere_accion' => 'boolean',
    ];

    public function cruce(): BelongsTo
    {
        return $this->belongsTo(Cruce::class, 'cruce_id');
    }

    public function empleadoRh(): BelongsTo
    {
        return $this->belongsTo(EmpleadoRh::class, 'empleado_rh_id');
    }

    public function accionadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accion_por');
    }

    public function scopeRequierenAccion(Builder $query): Builder
    {
        return $query->where('requiere_accion', true);
    }

    public function scopePorCategoria(Builder $query, string $cat): Builder
    {
        return $query->where('categoria', $cat);
    }

    public function scopeSinAccion(Builder $query): Builder
    {
        return $query->whereNull('accion_tomada')->orWhere('accion_tomada', '');
    }

    public function scopeConAccion(Builder $query): Builder
    {
        return $query->whereNotNull('accion_tomada')->where('accion_tomada', '!=', '');
    }
}
