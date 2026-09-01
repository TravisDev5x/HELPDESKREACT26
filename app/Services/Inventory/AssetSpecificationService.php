<?php

namespace App\Services\Inventory;

use App\Models\InvAsset;
use App\Models\InvAssetSpec;
use App\Models\InvCategory;
use App\Support\Inventory\AssetSpecSchema;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/** Fuente única para normalizar y persistir la ficha técnica estructurada. */
class AssetSpecificationService
{
    /** @param array<int, array{key?: string, value?: mixed}>|null $specs */
    public function normalizedForCategory(?InvCategory $category, ?array $specs): Collection
    {
        $validKeys = AssetSpecSchema::validKeysForType($category?->type);

        return collect($specs ?? [])
            ->filter(fn ($row) => is_array($row)
                && in_array($row['key'] ?? null, $validKeys, true)
                && filled($row['value'] ?? null))
            ->map(fn ($row) => ['key' => $row['key'], 'value' => trim((string) $row['value'])])
            ->keyBy('key');
    }

    /** @param array<int, array{key?: string, value?: mixed}>|null $specs */
    public function hasRequiredSpecs(?InvCategory $category, ?array $specs): bool
    {
        return ! $category?->require_specs || $this->normalizedForCategory($category, $specs)->isNotEmpty();
    }

    /** @param array<int, array{key?: string, value?: mixed}>|null $specs */
    public function sync(InvAsset $asset, ?array $specs): void
    {
        $asset->loadMissing('category');
        $incoming = $this->normalizedForCategory($asset->category, $specs);

        $asset->specs()->whereNotIn('key', $incoming->keys())->delete();

        foreach ($incoming as $key => $row) {
            InvAssetSpec::updateOrCreate(
                ['asset_id' => $asset->id, 'key' => $key],
                ['client_id' => $asset->client_id, 'value' => $row['value']]
            );
        }
    }

    /**
     * Formato de importación: "clave: valor; clave: valor". Acepta también
     * JSON de la forma [{"key":"ram","value":"16 GB"}] para reimportar.
     * Texto sin claves se conserva en legacy y no se inventa como spec.
     *
     * @return array<int, array{key: string, value: string}>
     */
    public function parseImport(?string $value, ?InvCategory $category): array
    {
        $value = trim((string) $value);
        if ($value === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            if (array_is_list($decoded)) {
                return $this->normalizedForCategory($category, $decoded)->values()->all();
            }

            return $this->normalizedForCategory($category, collect($decoded)
                ->map(fn ($item, $key) => ['key' => $key, 'value' => $item])
                ->values()->all())->values()->all();
        }

        $rows = collect(preg_split('/[;|]+/', $value) ?: [])
            ->map(function ($part) {
                [$key, $specValue] = array_pad(preg_split('/\s*[:=]\s*/', trim($part), 2) ?: [], 2, null);

                return ['key' => Str::lower(trim((string) $key)), 'value' => $specValue];
            })->all();

        return $this->normalizedForCategory($category, $rows)->values()->all();
    }
}
