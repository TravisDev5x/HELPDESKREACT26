<?php

namespace App\Rules;

use App\Models\User;
use App\Services\OperatorCatalogScopeService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

final class ScopedCatalogExists implements ValidationRule
{
    public function __construct(
        private readonly string $table,
        private readonly ?User $user,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $this->user || ! is_numeric($value)) {
            $fail('El valor seleccionado no es válido.');

            return;
        }

        $query = DB::table($this->table)->where('id', (int) $value);
        $query = app(OperatorCatalogScopeService::class)->apply($query, $this->user, $this->table);

        if (! $query->exists()) {
            $fail('El valor seleccionado no pertenece al catálogo disponible para este tenant.');
        }
    }
}
