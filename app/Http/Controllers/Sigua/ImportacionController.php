<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sigua\ImportarArchivoRequest;
use App\Models\Sigua\Importacion;
use App\Services\Sigua\ImportacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImportacionController extends Controller
{
    public function __construct(
        protected ImportacionService $importacionService
    ) {}

    /**
     * POST: Subir y procesar importación. Acepta tipo='sistema' + sistema_id para importación dinámica.
     * Permiso: sigua.importar
     */
    public function importar(ImportarArchivoRequest $request): JsonResponse
    {
        try {
            $file = $request->file('archivo');
            $tipo = $request->input('tipo');
            $userId = $request->user()->id;
            $path = $file->store('sigua/imports/temp', ['disk' => 'local', 'visibility' => 'private']);
            $fullPath = Storage::disk('local')->path($path);

            $import = match ($tipo) {
                'rh_activos' => $this->importacionService->importarRH($fullPath, $userId),
                'bajas_rh' => $this->importacionService->importarBajasRH($fullPath, $userId),
                'sistema' => $this->importacionService->importarSistema(
                    $fullPath,
                    (int) $request->input('sistema_id'),
                    $userId,
                    $request->input('sede_id_default') ? (int) $request->input('sede_id_default') : null
                ),
                'ad_usuarios' => $this->importacionService->importarAdUsuarios($fullPath, $userId),
                'neotel_isla2', 'neotel_isla3', 'neotel_isla4' => $this->importacionService->importarNeotel($fullPath, $tipo, $userId),
                default => throw new \InvalidArgumentException("Tipo de importación no soportado: {$tipo}"),
            };

            @unlink($fullPath);

            return response()->json([
                'data' => $import->load('importadoPor'),
                'message' => 'Importación completada.',
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al importar: ' . $e->getMessage()], 422);
        }
    }

    /**
     * POST: Vista previa de archivo para un sistema (primeras filas mapeadas, sin guardar).
     * Body: archivo (file), sistema_id (int).
     */
    public function preview(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.importar')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'archivo' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
            'sistema_id' => ['required', 'integer', 'exists:sigua_systems,id'],
        ]);

        try {
            $path = $request->file('archivo')->store('sigua/imports/temp', ['disk' => 'local']);
            $fullPath = Storage::disk('local')->path($path);
            $result = $this->importacionService->preview($fullPath, (int) $request->input('sistema_id'));
            @unlink($fullPath);
            return response()->json(['data' => $result, 'message' => 'OK']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error en preview: ' . $e->getMessage()], 422);
        }
    }

    /**
     * GET: Historial de importaciones.
     * Permiso: sigua.importar
     */
    public function historial(Request $request): JsonResponse
    {
        if (! $request->user()?->can('sigua.importar')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        try {
            $query = Importacion::with('importadoPor:id,name,email')->orderByDesc('created_at');
            if ($request->filled('tipo')) {
                $query->where('tipo', $request->input('tipo'));
            }
            $paginator = $query->paginate($request->input('per_page', 25));

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
                'message' => 'OK',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al obtener historial: ' . $e->getMessage()], 500);
        }
    }
}
