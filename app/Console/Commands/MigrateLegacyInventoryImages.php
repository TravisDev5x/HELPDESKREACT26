<?php

namespace App\Console\Commands;

use App\Models\InvAssetImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateLegacyInventoryImages extends Command
{
    protected $signature = 'inventory:migrate-legacy-images {--execute : Move files and update records; without it the command is a dry run}';

    protected $description = 'Moves legacy public inventory images to private storage safely and idempotently.';

    public function handle(): int
    {
        $execute = (bool) $this->option('execute');
        $migrated = 0;
        $skipped = 0;
        $errors = 0;

        InvAssetImage::query()
            ->where(function ($query) {
                $query->where('disk', 'public')->orWhereNull('disk');
            })
            ->orderBy('id')
            ->eachById(function (InvAssetImage $image) use ($execute, &$migrated, &$skipped, &$errors) {
                $path = (string) $image->path;
                if (! $this->isLegacyInventoryPath($path)) {
                    $this->warn("Imagen {$image->id}: ruta omitida por seguridad.");
                    $skipped++;

                    return;
                }

                $public = Storage::disk('public');
                $local = Storage::disk('local');
                $sourceExists = $public->exists($path);
                $targetExists = $local->exists($path);

                if (! $execute) {
                    $this->line("[dry-run] Imagen {$image->id}: ".($sourceExists ? 'migrable' : 'origen no encontrado').($targetExists ? ', destino ya existe' : ''));

                    return;
                }

                // Una ejecución anterior pudo copiar y borrar el origen antes
                // de actualizar la fila. En ese caso solo terminamos el cambio
                // de metadatos; es seguro repetir el comando.
                if (! $sourceExists && $targetExists) {
                    $image->update(['disk' => 'local']);
                    $migrated++;

                    return;
                }

                if (! $sourceExists) {
                    $this->warn("Imagen {$image->id}: no se encontró el archivo público.");
                    $skipped++;

                    return;
                }

                if ($targetExists) {
                    $this->error("Imagen {$image->id}: existe un destino privado; no se sobrescribió.");
                    $errors++;

                    return;
                }

                $stream = $public->readStream($path);
                if ($stream === false || ! $local->writeStream($path, $stream)) {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                    $this->error("Imagen {$image->id}: no se pudo copiar al almacenamiento privado.");
                    $errors++;

                    return;
                }
                fclose($stream);

                if (! $public->delete($path)) {
                    $local->delete($path);
                    $this->error("Imagen {$image->id}: no se pudo retirar el archivo público; se revirtió la copia privada.");
                    $errors++;

                    return;
                }

                $image->update(['disk' => 'local']);
                $migrated++;
            });

        $this->info("Migradas: {$migrated}; omitidas: {$skipped}; errores: {$errors}.");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function isLegacyInventoryPath(string $path): bool
    {
        return str_starts_with($path, 'inv-assets/')
            && ! str_contains($path, '..')
            && ! str_starts_with($path, '/');
    }
}
