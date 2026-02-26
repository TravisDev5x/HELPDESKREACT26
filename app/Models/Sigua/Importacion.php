<?php

namespace App\Models\Sigua;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Log de importación Excel (RH, AD, Neotel) en SIGUA.
 *
 * @property int $id
 * @property string $tipo
 * @property string $archivo
 * @property int $registros_procesados
 * @property int $registros_nuevos
 * @property int $registros_actualizados
 * @property int $errores
 * @property array|null $detalle_errores
 * @property array|null $datos_importados
 * @property int $importado_por
 * @property int $registros_sin_cambio
 * @property array|null $mapeo_usado
 */
class Importacion extends Model
{
    protected $table = 'sigua_imports';

    protected $fillable = [
        'tipo',
        'archivo',
        'registros_procesados',
        'registros_nuevos',
        'registros_actualizados',
        'registros_sin_cambio',
        'errores',
        'detalle_errores',
        'datos_importados',
        'mapeo_usado',
        'importado_por',
    ];

    protected $casts = [
        'tipo' => 'string',
        'registros_procesados' => 'integer',
        'registros_nuevos' => 'integer',
        'registros_actualizados' => 'integer',
        'registros_sin_cambio' => 'integer',
        'errores' => 'integer',
        'detalle_errores' => 'array',
        'datos_importados' => 'array',
        'mapeo_usado' => 'array',
    ];

    public function importadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'importado_por');
    }

    /**
     * Cruces asociados a esta importación (opcional).
     *
     * @return HasMany<Cruce>
     */
    public function cruces(): HasMany
    {
        return $this->hasMany(Cruce::class, 'import_id');
    }
}
