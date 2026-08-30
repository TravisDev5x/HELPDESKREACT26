<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketMacro extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'content',
        'category',
        'is_active',
        // Catálogo maestro (docs/CATALOG_TENANCY_MODEL.md): operator_user_id
        // NULL = macro de plataforma; con valor = macro del operador MSP dueño.
        // Los rellena OperatorCatalogScopeService::operatorAttributesForCreate().
        'operator_user_id',
        'client_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
