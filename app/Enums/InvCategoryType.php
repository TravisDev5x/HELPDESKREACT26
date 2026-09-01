<?php

namespace App\Enums;

enum InvCategoryType: string
{
    case HARDWARE = 'HARDWARE';
    case SOFTWARE = 'SOFTWARE';
    case CONSUMABLE = 'CONSUMIBLE';

    public function label(): string
    {
        return match ($this) { self::HARDWARE => 'Hardware', self::SOFTWARE => 'Software', self::CONSUMABLE => 'Consumible' };
    }

    public static function options(): array
    {
        return array_map(fn (self $type) => ['value' => $type->value, 'label' => $type->label()], self::cases());
    }
}
