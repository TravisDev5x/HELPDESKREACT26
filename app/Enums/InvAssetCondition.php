<?php

namespace App\Enums;

enum InvAssetCondition: string
{
    case NEW = 'NUEVO';
    case GOOD = 'BUENO';
    case FAIR = 'REGULAR';
    case POOR = 'MALO';
    case FOR_PARTS = 'PARA_PIEZAS';

    public function label(): string
    {
        return match ($this) {
            self::NEW => 'Nuevo', self::GOOD => 'Bueno', self::FAIR => 'Regular',
            self::POOR => 'Malo', self::FOR_PARTS => 'Para piezas',
        };
    }

    public static function options(): array
    {
        return array_map(fn (self $condition) => ['value' => $condition->value, 'label' => $condition->label()], self::cases());
    }
}
