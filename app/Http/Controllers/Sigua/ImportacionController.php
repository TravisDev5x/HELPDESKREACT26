<?php

namespace App\Http\Controllers\Sigua;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sigua\ImportarArchivoRequest;
use App\Models\Sigua\Importacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImportacionController extends Controller
{
    /**
     * POST: Subir y registrar importación. El procesamiento pesado puede ir a cola.
     * Permiso: sigua.importar
     */
    public function importar(ImportarArchivoRequest $request): JsonResponse
    {
        try {
            $file = $request->file('archivo');
            $tipo = $request->input('tipo');
            $path = $file->store('sigua/imports/' . date('Y-m-d'), ['disk' => 'local', 'visibility' => 'private']);

            $import = Importacion::create([
                'tipo' => $tipo,
                'archivo' => $path,
                'registros_procesados' => 0,
                'registros_nuevos' => 0,
                'registros_actualizados' => 0,
                'errores' => 0,
                'importado_por' => $request->user()->id,
            ]);

            // Opcional: despachar job para procesar el archivo y actualizar registros_* y detalle_errores
            // dispatch(new ProcesarImportacionSiguaJob($import));

            return response()->json([
                'data' => $import->load('importadoPor'),
                'message' => 'Archivo recibido. La importación ha sido registrada.',
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Error al importar: ' . $e->getMessage()], 422);
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
