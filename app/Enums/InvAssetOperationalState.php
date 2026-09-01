<?php

namespace App\Enums;

enum InvAssetOperationalState: string
{
    case AVAILABLE = 'AVAILABLE';
    case ASSIGNED = 'ASSIGNED';
    case MAINTENANCE = 'MAINTENANCE';
    case RETIRED = 'RETIRED';
    case LOST = 'LOST';
    case STOLEN = 'STOLEN';

    public function canBeAssigned(): bool
    {
        return $this === self::AVAILABLE;
    }

    public function canBeTransferred(): bool
    {
        return in_array($this, [self::AVAILABLE, self::ASSIGNED], true);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::RETIRED, self::LOST, self::STOLEN], true);
    }

    public static function forDisposalMethod(string $method): self
    {
        return match ($method) {
            'PERDIDA' => self::LOST,
            'ROBO' => self::STOLEN,
            default => self::RETIRED,
        };
    }

    public function disposalMovementType(): InvMovementType
    {
        return match ($this) {
            self::LOST => InvMovementType::MARK_LOST,
            self::STOLEN => InvMovementType::MARK_STOLEN,
            default => InvMovementType::RETIRE,
        };
    }
}
