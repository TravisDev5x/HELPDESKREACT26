<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MigrateUsersNameToParts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:migrate-name-to-parts
                            {--dry-run : Solo mostrar qué se haría, sin guardar}
                            {--force : Incluir usuarios que ya tienen first_name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migra la columna name de users a first_name, paternal_last_name y maternal_last_name (formato español).';

    /**
     * Ejecuta el comando.
     * Asume formato español: "Nombre(s) ApellidoPaterno ApellidoMaterno".
     */
    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $query = User::query();
        if (! $force) {
            $query->where(function ($q) {
                $q->whereNull('first_name')
                    ->orWhere('first_name', '');
            });
        }

        $users = $query->get();
        $updated = 0;
        $errors = [];

        foreach ($users as $user) {
            $name = trim((string) ($user->getRawOriginal('name') ?? ''));
            if ($name === '') {
                $this->warn("Usuario id={$user->id} (employee_number={$user->employee_number}): name vacío, omitido.");
                continue;
            }

            $parts = $this->splitFullName($name);
            if ($parts === null) {
                $errors[] = "Usuario id={$user->id}: no se pudo dividir \"{$name}\"";
                continue;
            }

            if ($dryRun) {
                $this->line(sprintf(
                    '  [dry-run] id=%d: first_name="%s", paternal_last_name="%s", maternal_last_name="%s"',
                    $user->id,
                    $parts['first_name'],
                    $parts['paternal_last_name'],
                    $parts['maternal_last_name'] ?? ''
                ));
                $updated++;
                continue;
            }

            try {
                $user->first_name = $parts['first_name'];
                $user->paternal_last_name = $parts['paternal_last_name'];
                $user->maternal_last_name = $parts['maternal_last_name'] ?? null;
                $user->saveQuietly();
                $updated++;
            } catch (\Throwable $e) {
                $errors[] = "Usuario id={$user->id}: " . $e->getMessage();
            }
        }

        if (count($errors) > 0) {
            foreach ($errors as $err) {
                $this->error($err);
            }
        }

        $this->info($dryRun
            ? "Dry-run: se habrían actualizado {$updated} usuario(s)."
            : "Actualizados {$updated} usuario(s)."
        );

        return count($errors) > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Divide una cadena "Nombre ApellidoPaterno ApellidoMaterno" en partes.
     * Formato español: 1 token -> solo nombre; 2 -> nombre + paternal; 3 -> nombre + paternal + maternal;
     * 4+ -> todos los primeros menos los dos últimos = nombre, penúltimo = paternal, último = maternal.
     *
     * @return array{first_name: string, paternal_last_name: string, maternal_last_name: string|null}|null
     */
    private function splitFullName(string $fullName): ?array
    {
        $fullName = trim(preg_replace('/\s+/', ' ', $fullName));
        if ($fullName === '') {
            return null;
        }

        $tokens = explode(' ', $fullName);
        $count = count($tokens);

        if ($count === 1) {
            return [
                'first_name' => $tokens[0],
                'paternal_last_name' => $tokens[0],
                'maternal_last_name' => null,
            ];
        }

        if ($count === 2) {
            return [
                'first_name' => $tokens[0],
                'paternal_last_name' => $tokens[1],
                'maternal_last_name' => null,
            ];
        }

        if ($count === 3) {
            return [
                'first_name' => $tokens[0],
                'paternal_last_name' => $tokens[1],
                'maternal_last_name' => $tokens[2],
            ];
        }

        $first = implode(' ', array_slice($tokens, 0, $count - 2));
        $paternal = $tokens[$count - 2];
        $maternal = $tokens[$count - 1];

        return [
            'first_name' => $first,
            'paternal_last_name' => $paternal,
            'maternal_last_name' => $maternal,
        ];
    }
}
