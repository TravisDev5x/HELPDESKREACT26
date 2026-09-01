<?php

namespace App\Enums;

enum InvAssetRelationshipType: string
{
    case COMPONENT_OF = 'component_of'; case NETWORK_OF = 'network_of'; case OTHER = 'other';

    public function label(): string
    {
        return match ($this) { self::COMPONENT_OF => 'Componente de', self::NETWORK_OF => 'En red con', self::OTHER => 'Otro' };
    }

    public static function options(): array
    {
        return array_map(fn (self $type) => ['value' => $type->value, 'label' => $type->label()], self::cases());
    }
}
