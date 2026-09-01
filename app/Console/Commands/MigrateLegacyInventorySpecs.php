<?php

namespace App\Console\Commands;

use App\Models\InvAsset;
use App\Services\Inventory\AssetSpecificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateLegacyInventorySpecs extends Command
{
    protected $signature = 'inventory:migrate-legacy-specs {--execute : Persist structured legacy specs; without it the command is a dry run}';

    protected $description = 'Copies compatible legacy inv_assets.specs values into inv_asset_specs without deleting legacy data.';

    public function handle(AssetSpecificationService $specifications): int
    {
        $execute = (bool) $this->option('execute');
        $migrable = 0;
        $skipped = 0;

        InvAsset::query()->whereNotNull('specs')->with('category')->orderBy('id')
            ->eachById(function (InvAsset $asset) use ($execute, $specifications, &$migrable, &$skipped) {
                $legacy = $asset->getRawOriginal('specs');
                $decoded = is_string($legacy) ? json_decode($legacy, true) : $legacy;
                $source = is_array($decoded) && array_key_exists('notes', $decoded)
                    ? (string) $decoded['notes']
                    : json_encode($decoded);
                $specs = $specifications->parseImport($source, $asset->category);

                if (empty($specs)) {
                    $skipped++;
                    $this->line("Activo {$asset->id}: sin especificaciones estructuradas compatibles.");

                    return;
                }

                $migrable++;
                if (! $execute) {
                    $this->line("[dry-run] Activo {$asset->id}: ".count($specs).' especificación(es) migrable(s).');

                    return;
                }

                DB::transaction(fn () => $specifications->sync($asset, $specs));
            });

        $this->info(($execute ? 'Migrados' : 'Migrables').": {$migrable}; omitidos: {$skipped}. Los datos legacy no se eliminaron.");

        return self::SUCCESS;
    }
}
