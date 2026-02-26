<?php

namespace App\Models\Sigua;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Resultado de cruce RH vs AD vs Neotel en SIGUA.
 *
 * @property int $id
 * @property int|null $import_id
 * @property string $tipo_cruce
 * @property string|null $nombre
 * @property array|null $sistemas_incluidos
 * @property \Carbon\Carbon $fecha_ejecucion
 * @property int $total_analizados
 * @property int $coincidencias
 * @property int $sin_match
 * @property array|null $resultado_json
 * @property int $ejecutado_por
 */
class Cruce extends Model
{
    protected $table = 'sigua_cross_matches';

    protected $fillable = [
        'import_id',
        'tipo_cruce',
        'nombre',
        'sistemas_incluidos',
        'fecha_ejecucion',
        'total_analizados',
        'coincidencias',
        'sin_match',
        'resultado_json',
        'ejecutado_por',
    ];

    protected $casts = [
        'tipo_cruce' => 'string',
        'fecha_ejecucion' => 'datetime',
        'total_analizados' => 'integer',
        'coincidencias' => 'integer',
        'sin_match' => 'integer',
        'resultado_json' => 'array',
        'sistemas_incluidos' => 'array',
    ];

    public function importacion(): BelongsTo
    {
        return $this->belongsTo(Importacion::class, 'import_id');
    }

    public function ejecutadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ejecutado_por');
    }

    /**
     * Detalle por empleado/cuenta de este cruce (SIGUA v2).
     *
     * @return HasMany<CruceResultado>
     */
    public function resultados(): HasMany
    {
        return $this->hasMany(CruceResultado::class, 'cruce_id');
    }
}
