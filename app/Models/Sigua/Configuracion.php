<?php

namespace App\Models\Sigua;

use Illuminate\Database\Eloquent\Model;

/**
 * Parámetros editables SIGUA v2 (sigua_configuracion).
 *
 * @property int $id
 * @property string $clave
 * @property string|null $valor
 * @property string $tipo
 * @property string|null $descripcion
 */
class Configuracion extends Model
{
    protected $table = 'sigua_configuracion';

    protected $fillable = ['clave', 'valor', 'tipo', 'descripcion'];

    /**
     * Obtiene el valor con cast automático según tipo.
     *
     * @param  string  $clave
     * @param  mixed  $default
     * @return mixed
     */
    public static function getValor(string $clave, mixed $default = null): mixed
    {
        $row = static::where('clave', $clave)->first();
        if (! $row) {
            return $default;
        }
        $v = $row->valor;
        return match ($row->tipo) {
            'int' => (int) $v,
            'bool' => filter_var($v, FILTER_VALIDATE_BOOLEAN),
            'json' => is_string($v) ? json_decode($v, true) : $v,
            default => $v,
        };
    }

    /**
     * Guarda el valor (convierte según tipo; infiere tipo si es registro nuevo).
     *
     * @param  string  $clave
     * @param  mixed  $valor
     * @return bool
     */
    public static function setValor(string $clave, mixed $valor): bool
    {
        $row = static::firstOrNew(['clave' => $clave]);
        $tipo = $row->tipo ?? match (true) {
            is_bool($valor) => 'bool',
            is_int($valor) => 'int',
            is_array($valor) => 'json',
            default => 'string',
        };
        if (! $row->exists) {
            $row->tipo = $tipo;
        }
        $row->valor = match ($tipo) {
            'json' => is_string($valor) ? $valor : json_encode($valor),
            'bool' => $valor ? 'true' : 'false',
            'int' => (string) (int) $valor,
            default => (string) $valor,
        };
        return $row->save();
    }
}
