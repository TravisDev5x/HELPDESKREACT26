<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hallazgo C4: ticket_macros era el único catálogo de tickets que nunca entró
 * en el modelo de catálogos maestros (docs/CATALOG_TENANCY_MODEL.md). Los 17
 * catálogos de App\Services\OperatorCatalogScopeService::CATALOG_TABLES llevan
 * estas dos columnas -- ticket_macros no, así que no había ninguna forma de
 * expresar a quién pertenece una respuesta predefinida y el controlador servía
 * la tabla entera a cualquier agente de cualquier operador.
 *
 * Mismas columnas, mismo orden y mismo índice que
 * 2026_07_09_000012_add_operator_and_client_scope_to_early_catalogs, para que
 * OperatorCatalogScopeService funcione sobre esta tabla sin ningún caso especial.
 *
 * Filas existentes: se quedan con operator_user_id NULL, que en este modelo
 * significa "macro de plataforma, visible para todos" -- exactamente lo que son
 * hoy (las 2 plantillas genéricas de TicketMacroSeeder). Ninguna macro deja de
 * verse tras la migración; lo que cambia es que las macros creadas a partir de
 * ahora quedan marcadas con el operador que las creó.
 *
 * client_id se añade por paridad estructural con el resto de catálogos: con
 * TENANCY_CATALOG_PER_CLIENT=false (default) la aplicación lo ignora, y
 * OperatorCatalogScopeService::operatorAttributesForCreate() devuelve siempre
 * las dos claves.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_macros', function (Blueprint $table) {
            $table->foreignId('operator_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->index(['client_id', 'operator_user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ticket_macros', function (Blueprint $table) {
            $table->dropForeign(['operator_user_id']);
            $table->dropForeign(['client_id']);
            $table->dropColumn(['operator_user_id', 'client_id']);
        });
    }
};
