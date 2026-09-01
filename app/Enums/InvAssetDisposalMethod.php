<?php

namespace App\Enums;

enum InvAssetDisposalMethod: string
{
    case SALE = 'VENTA'; case RECYCLING = 'RECICLAJE'; case DONATION = 'DONACION';
    case THEFT = 'ROBO'; case LOSS = 'PERDIDA'; case OBSOLESCENCE = 'OBSOLESCENCIA'; case IRREPARABLE_DAMAGE = 'DANO_IRREPARABLE';

    public function label(): string
    {
        return match ($this) {
            self::SALE => 'Venta', self::RECYCLING => 'Reciclaje', self::DONATION => 'Donación', self::THEFT => 'Robo',
            self::LOSS => 'Pérdida', self::OBSOLESCENCE => 'Obsolescencia', self::IRREPARABLE_DAMAGE => 'Daño irreparable',
        };
    }

    public function operationalState(): InvAssetOperationalState
    {
        return match ($this) { self::LOSS => InvAssetOperationalState::LOST, self::THEFT => InvAssetOperationalState::STOLEN, default => InvAssetOperationalState::RETIRED };
    }

    public static function options(): array
    {
        return array_map(fn (self $method) => ['value' => $method->value, 'label' => $method->label()], self::cases());
    }
}
