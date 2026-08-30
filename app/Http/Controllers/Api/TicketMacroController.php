<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ManagesOperatorCatalog;
use App\Http\Controllers\Controller;
use App\Models\TicketMacro;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Respuestas predefinidas. Catálogo maestro igual que estados/tipos/prioridades:
 * plataforma (operator_user_id NULL) + operador MSP dueño de la fila --
 * docs/CATALOG_TENANCY_MODEL.md. El alcance es del OPERADOR, no del client: un
 * operador que atiende varias empresas usa las mismas plantillas en todas.
 *
 * Hallazgo C4: antes ninguna acción filtraba ni autorizaba nada, así que
 * cualquier agente leía, editaba y borraba las macros de todos los operadores
 * de la instalación. Mismo patrón que TicketStateController -- no se inventa
 * tenancy nueva aquí, se reusa ManagesOperatorCatalog/OperatorCatalogScopeService.
 */
class TicketMacroController extends Controller
{
    use ManagesOperatorCatalog;

    protected function catalogModelClass(): string
    {
        return TicketMacro::class;
    }

    /**
     * Listado: con ?active_only=1 solo activas (para el dropdown de tickets);
     * sin parámetro devuelve todas (para catálogo admin).
     */
    public function index(Request $request)
    {
        $query = $this->scopedCatalogQuery()->orderBy('category')->orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);

            return $query->get(['id', 'name', 'content', 'category']);
        }

        return $query->get();
    }

    public function show(TicketMacro $ticket_macro)
    {
        $this->catalogScope()->authorizeRow(Auth::user(), $ticket_macro);

        return $ticket_macro;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);
        $data['is_active'] = $data['is_active'] ?? true;

        $macro = TicketMacro::create(array_merge(
            $data,
            $this->catalogScope()->operatorAttributesForCreate(Auth::user())
        ));

        return response()->json($macro, 201);
    }

    public function update(Request $request, TicketMacro $ticket_macro)
    {
        $this->catalogScope()->authorizeRow(Auth::user(), $ticket_macro);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);
        $ticket_macro->update($data);

        return response()->json($ticket_macro);
    }

    public function destroy(TicketMacro $ticket_macro)
    {
        $this->catalogScope()->authorizeRow(Auth::user(), $ticket_macro);
        $ticket_macro->delete();

        return response()->noContent();
    }
}
