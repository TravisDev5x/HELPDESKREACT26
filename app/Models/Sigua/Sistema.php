<?php

namespace App\Models\Sigua;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Catálogo de sistemas (Neotel, Ahevaa) en SIGUA.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property bool $es_externo
 * @property string|null $contacto_externo
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
    ];

    protected $casts = [
        'es_externo' => 'boolean',
    ];

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
}
