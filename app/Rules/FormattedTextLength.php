<?php

namespace App\Rules;

use App\Support\Tickets\TicketDescriptionFormatter;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class FormattedTextLength implements ValidationRule
{
    public function __construct(private readonly int $maximum) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && TicketDescriptionFormatter::visibleLength($value) > $this->maximum) {
            $fail("La descripción no puede superar {$this->maximum} caracteres.");
        }
    }
}
