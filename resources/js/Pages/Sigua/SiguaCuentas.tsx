import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCuentasGenericas } from "@/hooks/sigua";
import { getSistemas, bulkUpdateEstadoCuentas, clasificarCuenta } from "@/services/siguaApi";
import { loadCatalogs } from "@/lib/catalogCache";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SiguaCuentaForm } from "./SiguaCuentaForm";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { CuentaGenerica, SiguaFilters, Sistema, TipoCuenta } from "@/types/sigua";
import type { CreateCuentaPayload } from "@/services/siguaApi";
import {
  Plus,
  Upload,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FileCheck,
} from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  activa: "Activa",
  suspendida: "Suspendida",
  baja: "Baja",
};

const ESTADO_VARIANTS: Record<string, string> = {
  activa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  suspendida: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  baja: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

const TIPO_LABELS: Record<TipoCuenta, string> = {
  nominal: "Nominal",
  generica: "Genérica",
  servicio: "Servicio",
  prueba: "Prueba",
  desconocida: "Desconocida",
};

const TIPO_VARIANTS: Record<TipoCuenta, string> = {
  nominal: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  generica: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  servicio: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  prueba: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  desconocida: "bg-muted text-muted-foreground",
};

function useSiguaCuentasColumns({
  selectedIds,
  setSelectedIds,
  data,
  onEdit,
  onDelete,
  onClasificar,
  canManage,
}: {
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  data: CuentaGenerica[];
  onEdit: (c: CuentaGenerica) => void;
  onDelete: (c: CuentaGenerica) => void;
  onClasificar: (c: CuentaGenerica) => void;
  canManage: boolean;
}) {
  return useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={data.length > 0 && selectedIds.length === data.length}
            onCheckedChange={(c) =>
              setSelectedIds(c ? data.map((u) => u.id) : [])
            }
          />
        ),
        cell: ({ row }: { row: { original: CuentaGenerica } }) => (
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={() =>
              setSelectedIds((prev) =>
                prev.includes(row.original.id)
                  ? prev.filter((i) => i !== row.original.id)
                  : [...prev, row.original.id]
              )
            }
          />
        ),
        meta: { headerClassName: "w-[40px]", className: "w-[40px]" },
      },
      {
        id: "usuario",
        header: "Usuario",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => (
          <span className="font-mono text-sm">{row.original.usuario_cuenta}</span>
        ),
      },
      {
        id: "nombre",
        header: "Nombre",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => (
          <span className="text-sm truncate max-w-[180px] block" title={row.original.nombre_cuenta}>
            {row.original.nombre_cuenta}
          </span>
        ),
      },
      {
        id: "sistema",
        header: "Sistema",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => {
          const s = row.original.sistema;
          const name = s?.name ?? `Sistema ${row.original.system_id}`;
          const isExt = s?.es_externo;
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isExt ? "border-amber-500/50 text-amber-700 dark:text-amber-400" : "border-primary/40 text-primary"
              )}
            >
              {name}
            </Badge>
          );
        },
      },
      {
        id: "sede",
        header: "Sede",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => (
          <span className="text-sm text-muted-foreground">{row.original.sede?.name ?? "—"}</span>
        ),
      },
      {
        id: "isla",
        header: "Isla",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => (
          <span className="text-xs text-muted-foreground">{row.original.isla ?? "—"}</span>
        ),
        meta: { className: "hidden md:table-cell" },
      },
      {
        id: "perfil",
        header: "Perfil",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => (
          <span className="text-xs text-muted-foreground">{row.original.perfil ?? "—"}</span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "campaign",
        header: "Campaña",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => (
          <span className="text-xs">{row.original.campaign?.name ?? "—"}</span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => {
          const e = row.original.estado ?? "activa";
          return (
            <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", ESTADO_VARIANTS[e] ?? ESTADO_VARIANTS.activa)}>
              {ESTADO_LABELS[e] ?? e}
            </Badge>
          );
        },
      },
      {
        id: "tipo",
        header: "Tipo",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => {
          const t = (row.original.tipo ?? "desconocida") as TipoCuenta;
          return (
            <Badge variant="outline" className={cn("text-[10px]", TIPO_VARIANTS[t] ?? TIPO_VARIANTS.desconocida)}>
              {TIPO_LABELS[t] ?? t}
            </Badge>
          );
        },
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "ca01",
        header: "CA-01",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => {
          const vigente = row.original.ca01_vigente ?? (row.original as unknown as { ca01Vigente?: unknown }).ca01Vigente;
          if (vigente) {
            return (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <FileCheck className="h-3 w-3 mr-1" /> Vigente
              </Badge>
            );
          }
          return (
            <span className="text-[10px] text-muted-foreground">Sin formato</span>
          );
        },
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }: { row: { original: CuentaGenerica } }) => {
          const c = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" asChild className="h-8">
                <Link to={`/sigua/cuentas/${c.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              {canManage && (
                <>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => onClasificar(c)} title="Clasificar">
                    Clasificar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => onEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(c)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          );
        },
        meta: { headerClassName: "text-right", className: "text-right" },
      },
    ],
    [selectedIds, setSelectedIds, data, onEdit, onDelete, onClasificar, canManage]
  );
}

export default function SiguaCuentas() {
  const { can } = useAuth();
  const canView = can("sigua.cuentas.view");
  const canManage = can("sigua.cuentas.manage");
  const canImport = can("sigua.importar");

  const [filters, setFilters] = useState<SiguaFilters>({
    sistema_id: null,
    sede_id: null,
    estado: null,
    campaign_id: null,
    search: null,
    tipo: null,
  });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [catalogs, setCatalogs] = useState<{ sedes: Array<{ id: number; name: string }>; campaigns: Array<{ id: number; name: string }> }>({ sedes: [], campaigns: [] });
  const [formOpen, setFormOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaGenerica | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkEstadoOpen, setBulkEstadoOpen] = useState(false);
  const [bulkEstado, setBulkEstado] = useState<"activa" | "suspendida" | "baja">("activa");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CuentaGenerica | null>(null);
  const [clasificarCuentaOpen, setClasificarCuentaOpen] = useState(false);
  const [clasificarTarget, setClasificarTarget] = useState<CuentaGenerica | null>(null);
  const [clasificarTipo, setClasificarTipo] = useState<TipoCuenta>("nominal");
  const [clasificarSubmitting, setClasificarSubmitting] = useState(false);

  const appliedFilters = useMemo(() => ({
    ...filters,
    search: searchInput.trim() || undefined,
  }), [filters, searchInput]);

  const { data, meta, loading, error, refetch, create, update, remove, creating, updating } = useCuentasGenericas(appliedFilters);

  useEffect(() => {
    getSistemas().then((r) => {
      if (r.data) setSistemas(r.data);
    });
  }, []);
  useEffect(() => {
    loadCatalogs().then((c: { sedes?: Array<{ id: number; name: string }>; campaigns?: Array<{ id: number; name: string }> }) => {
      setCatalogs({
        sedes: c?.sedes ?? [],
        campaigns: c?.campaigns ?? [],
      });
    });
  }, []);

  const onEdit = useCallback((c: CuentaGenerica) => {
    setEditingCuenta(c);
    setFormOpen(true);
  }, []);
  const onDelete = useCallback((c: CuentaGenerica) => setDeleteConfirm(c), []);
  const onClasificar = useCallback((c: CuentaGenerica) => {
    setClasificarTarget(c);
    setClasificarTipo((c.tipo as TipoCuenta) ?? "desconocida");
    setClasificarCuentaOpen(true);
  }, []);

  const handleClasificarSubmit = useCallback(async () => {
    if (!clasificarTarget) return;
    setClasificarSubmitting(true);
    const res = await clasificarCuenta(clasificarTarget.id, clasificarTipo);
    setClasificarSubmitting(false);
    setClasificarCuentaOpen(false);
    setClasificarTarget(null);
    if (res.error) notify.error(res.error);
    else {
      notify.success("Tipo actualizado.");
      refetch(meta?.current_page ?? 1);
    }
  }, [clasificarTarget, clasificarTipo, refetch, meta?.current_page]);

  const columns = useSiguaCuentasColumns({
    selectedIds,
    setSelectedIds,
    data,
    onEdit,
    onDelete,
    onClasificar,
    canManage,
  });

  const handleFormSubmit = useCallback(
    async (payload: CreateCuentaPayload) => {
      if (editingCuenta) {
        const res = await update(editingCuenta.id, payload);
        if (res.error) {
          notify.error(res.error);
          throw new Error(res.error);
        }
        notify.success("Cuenta actualizada");
        setEditingCuenta(null);
      } else {
        const res = await create(payload);
        if (res.error) {
          notify.error(res.error);
          throw new Error(res.error);
        }
        notify.success("Cuenta creada");
      }
      setFormOpen(false);
      refetch(1);
    },
    [editingCuenta, create, update, refetch]
  );

  const handleBulkEstado = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    const res = await bulkUpdateEstadoCuentas(selectedIds, bulkEstado);
    setBulkSubmitting(false);
    setBulkEstadoOpen(false);
    if (res.error) {
      notify.error(res.error);
      return;
    }
    notify.success(res.message ?? "Estados actualizados");
    setSelectedIds([]);
    refetch(meta?.current_page ?? 1);
  }, [selectedIds, bulkEstado, refetch, meta?.current_page]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    const res = await remove(deleteConfirm.id);
    setDeleteConfirm(null);
    if (res.error) notify.error(res.error);
    else {
      notify.success("Cuenta eliminada");
      refetch(meta?.current_page ?? 1);
    }
  }, [deleteConfirm, remove, refetch, meta?.current_page]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver cuentas genéricas (sigua.cuentas.view).</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Cuentas genéricas" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cuentas genéricas</h1>
            <p className="text-sm text-muted-foreground">Listado y gestión de cuentas (Neotel, Ahevaa)</p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button onClick={() => { setEditingCuenta(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nueva cuenta
              </Button>
            )}
            {canImport && (
              <Button variant="outline" asChild>
                <Link to="/sigua/importar">
                  <Upload className="h-4 w-4 mr-2" /> Importar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-b bg-muted/20">
          <div className="flex flex-1 flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario o nombre..."
                className="pl-9 h-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={filters.sistema_id != null ? String(filters.sistema_id) : "all"}
              onValueChange={(v) => setFilters((p) => ({ ...p, sistema_id: v === "all" ? null : Number(v) }))}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sistemas.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={filters.sede_id != null ? String(filters.sede_id) : "all"}
              onValueChange={(v) => setFilters((p) => ({ ...p, sede_id: v === "all" ? null : Number(v) }))}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {catalogs.sedes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={filters.estado ?? "all"}
              onValueChange={(v) => setFilters((p) => ({ ...p, estado: v === "all" ? null : v }))}
            >
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="suspendida">Suspendida</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.campaign_id != null ? String(filters.campaign_id) : "all"}
              onValueChange={(v) => setFilters((p) => ({ ...p, campaign_id: v === "all" ? null : Number(v) }))}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Campaña" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {catalogs.campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={filters.tipo ?? "all"}
              onValueChange={(v) => setFilters((p) => ({ ...p, tipo: v === "all" ? null : (v as TipoCuenta) }))}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(Object.keys(TIPO_LABELS) as TipoCuenta[]).map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedIds.length > 0 && canManage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.length} seleccionadas</span>
              <Button size="sm" variant="outline" onClick={() => setBulkEstadoOpen(true)}>
                Cambiar estado
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          getRowId={(row) => row.id}
          selectedIds={selectedIds}
          emptyMessage="No hay cuentas con los filtros aplicados"
          emptyColSpan={11}
        />

        {meta && (
          <div className="border-t px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-muted/10">
            <span className="text-xs text-muted-foreground">
              Página {meta.current_page} de {meta.last_page} · Total {meta.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.current_page <= 1 || loading}
                onClick={() => refetch(meta.current_page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.current_page >= meta.last_page || loading}
                onClick={() => refetch(meta.current_page + 1)}
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <SiguaCuentaForm
        key={editingCuenta?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        onCancel={() => { setFormOpen(false); setEditingCuenta(null); }}
        cuenta={editingCuenta ?? undefined}
        sistemas={sistemas}
        sedes={catalogs.sedes}
        campaigns={catalogs.campaigns}
        isSubmitting={creating || updating}
      />

      <Dialog open={bulkEstadoOpen} onOpenChange={setBulkEstadoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado en lote</DialogTitle>
            <DialogDescription>
              Se actualizará el estado de {selectedIds.length} cuenta(s) seleccionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Nuevo estado</label>
            <Select value={bulkEstado} onValueChange={(v) => setBulkEstado(v as "activa" | "suspendida" | "baja")}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="suspendida">Suspendida</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEstadoOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkEstado} disabled={bulkSubmitting}>
              {bulkSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clasificarCuentaOpen} onOpenChange={(o) => !o && (setClasificarCuentaOpen(false), setClasificarTarget(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clasificar cuenta</DialogTitle>
            <DialogDescription>
              Cuenta: {clasificarTarget?.usuario_cuenta} — {clasificarTarget?.nombre_cuenta}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select value={clasificarTipo} onValueChange={(v) => setClasificarTipo(v as TipoCuenta)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABELS) as TipoCuenta[]).map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setClasificarCuentaOpen(false); setClasificarTarget(null); }}>Cancelar</Button>
            <Button onClick={handleClasificarSubmit} disabled={clasificarSubmitting}>
              {clasificarSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cuenta</DialogTitle>
            <DialogDescription>
              ¿Eliminar la cuenta &quot;{deleteConfirm?.nombre_cuenta}&quot; ({deleteConfirm?.usuario_cuenta})? Esta acción se puede deshacer desde la base de datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
