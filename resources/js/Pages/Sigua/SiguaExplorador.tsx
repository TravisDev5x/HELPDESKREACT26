/**
 * Explorador Maestro: tabla consolidada de inventario global (todas las cuentas de todos los sistemas).
 * Ruta: /sigua/explorador
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getSistemas, getInventarioGlobal, exportInventarioVista, clasificarCuenta } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { HistorialAuditoria } from "@/components/Sigua/HistorialAuditoria";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type {
  InventarioRow,
  EstadoAuditoriaInventario,
  Ca01StatusInventario,
  TipoCuenta,
} from "@/types/sigua";
import type { InventarioFilters } from "@/types/sigua";
import type { Sistema } from "@/types/sigua";
import {
  Search,
  Loader2,
  AlertTriangle,
  History,
  Tag,
  Download,
  FileCheck,
  FileX,
  FileWarning,
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

const ESTADO_AUDITORIA_LABELS: Record<EstadoAuditoriaInventario, string> = {
  match: "Match",
  fantasma: "Fantasma",
  por_clasificar: "Por clasificar",
  externo_ok: "Externo OK",
  externo: "Externo",
};

const ESTADO_AUDITORIA_VARIANTS: Record<EstadoAuditoriaInventario, string> = {
  match: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  fantasma: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  por_clasificar: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  externo_ok: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  externo: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
};

const CA01_LABELS: Record<Ca01StatusInventario, string> = {
  vigente: "Vigente",
  vencido: "Vencido",
  faltante: "Faltante",
};

const CA01_VARIANTS: Record<Ca01StatusInventario, string> = {
  vigente: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  vencido: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  faltante: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
};

const TIPO_LABELS: Record<TipoCuenta, string> = {
  nominal: "Nominal",
  generica: "Genérica",
  servicio: "Servicio",
  prueba: "Prueba",
  desconocida: "Por clasificar",
  externo: "Externo",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function useExploradorColumns({
  onVerTrazabilidad,
  onClasificar,
  canManage,
}: {
  onVerTrazabilidad: (row: InventarioRow) => void;
  onClasificar: (row: InventarioRow) => void;
  canManage: boolean;
}) {
  return useMemo(
    () => [
      {
        id: "sistema",
        header: "Sistema",
        cell: ({ row }: { row: { original: InventarioRow } }) => {
          const r = row.original;
          const name = r.sistema?.name ?? `Sistema ${r.sistema?.id ?? "—"}`;
          return (
            <Badge variant="outline" className="text-xs border-primary/40 text-primary font-normal">
              {name}
            </Badge>
          );
        },
        meta: { className: "w-[120px]" },
      },
      {
        id: "usuario",
        header: "Usuario",
        cell: ({ row }: { row: { original: InventarioRow } }) => (
          <span className="font-mono text-sm">{row.original.cuenta_usuario}</span>
        ),
        meta: { className: "w-[140px]" },
      },
      {
        id: "match_rh",
        header: "Match RH",
        cell: ({ row }: { row: { original: InventarioRow } }) => {
          const nombre = row.original.nombre_rh;
          if (nombre && nombre.trim() !== "") {
            return <span className="text-sm">{nombre}</span>;
          }
          return (
            <span className="text-sm text-red-600 dark:text-red-400 font-medium">No encontrado</span>
          );
        },
        meta: { className: "max-w-[200px]" },
      },
      {
        id: "estado_auditoria",
        header: "Estado de auditoría",
        cell: ({ row }: { row: { original: InventarioRow } }) => {
          const est = row.original.estado_auditoria;
          const label = ESTADO_AUDITORIA_LABELS[est] ?? est;
          const variant = ESTADO_AUDITORIA_VARIANTS[est] ?? "";
          return (
            <Badge variant="outline" className={cn("text-xs font-normal", variant)}>
              {label}
            </Badge>
          );
        },
        meta: { className: "w-[130px]" },
      },
      {
        id: "ca01",
        header: "CA-01",
        cell: ({ row }: { row: { original: InventarioRow } }) => {
          const st = row.original.ca01_status;
          const label = CA01_LABELS[st];
          const variant = CA01_VARIANTS[st];
          const Icon = st === "vigente" ? FileCheck : st === "vencido" ? FileWarning : FileX;
          return (
            <span className={cn("inline-flex items-center gap-1.5 text-xs rounded-md border px-2 py-0.5", variant)}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          );
        },
        meta: { className: "w-[100px]" },
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }: { row: { original: InventarioRow } }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onVerTrazabilidad(r)}
                title="Ver trazabilidad"
              >
                <History className="h-4 w-4" />
              </Button>
              {r.estado_auditoria === "por_clasificar" && canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onClasificar(r)}
                  title="Clasificar"
                >
                  <Tag className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
        meta: { className: "w-[90px]", headerClassName: "w-[90px]" },
      },
    ],
    [onVerTrazabilidad, onClasificar, canManage]
  );
}

export default function SiguaExplorador() {
  const { can } = useAuth();
  const canView = can("sigua.cuentas.view");
  const canManage = can("sigua.cuentas.manage");

  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [filters, setFilters] = useState<InventarioFilters>({
    search: "",
    sistema_id: null,
    estado_auditoria: null,
    per_page: 25,
    page: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState<InventarioRow[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trazabilidadRow, setTrazabilidadRow] = useState<InventarioRow | null>(null);
  const [clasificarRow, setClasificarRow] = useState<InventarioRow | null>(null);
  const [clasificarTipo, setClasificarTipo] = useState<TipoCuenta>("nominal");
  const [clasificarSubmitting, setClasificarSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const refetch = useCallback(
    (page?: number) => {
      setLoading(true);
      setError(null);
      getInventarioGlobal({
        ...filters,
        page: page ?? filters.page,
        search: filters.search || undefined,
        sistema_id: filters.sistema_id ?? undefined,
        estado_auditoria: filters.estado_auditoria ?? undefined,
        per_page: filters.per_page,
      }).then((res) => {
        setLoading(false);
        if (res.error) setError(res.error);
        else {
          setData(res.data ?? []);
          setMeta(res.meta ?? null);
        }
      });
    },
    [filters]
  );

  useEffect(() => {
    if (!canView) return;
    getSistemas().then((r) => {
      if (r.data) setSistemas(r.data);
    });
  }, [canView]);

  const applySearch = useCallback(() => {
    setFilters((p) => ({ ...p, search: searchInput.trim() || null, page: 1 }));
  }, [searchInput]);

  useEffect(() => {
    if (!canView) return;
    refetch(filters.page);
  }, [canView, filters.page, filters.search, filters.sistema_id, filters.estado_auditoria, filters.per_page, refetch]);

  const onPageChange = useCallback(
    (page: number) => {
      setFilters((p) => ({ ...p, page }));
      refetch(page);
    },
    [refetch]
  );

  const columns = useExploradorColumns({
    onVerTrazabilidad: (row) => setTrazabilidadRow(row),
    onClasificar: (row) => {
      setClasificarRow(row);
      setClasificarTipo("nominal");
    },
    canManage,
  });

  const handleClasificarSubmit = useCallback(async () => {
    if (!clasificarRow) return;
    setClasificarSubmitting(true);
    const res = await clasificarCuenta(clasificarRow.id, clasificarTipo);
    setClasificarSubmitting(false);
    setClasificarRow(null);
    if (res.error) notify.error(res.error);
    else {
      notify.success("Tipo actualizado.");
      refetch(meta?.current_page ?? 1);
    }
  }, [clasificarRow, clasificarTipo, refetch, meta?.current_page]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    const res = await exportInventarioVista({
      search: filters.search || undefined,
      sistema_id: filters.sistema_id ?? undefined,
      estado_auditoria: filters.estado_auditoria ?? undefined,
    });
    setExporting(false);
    if (res.error) {
      notify.error(res.error);
      return;
    }
    if (res.data) {
      downloadBlob(res.data, `sigua_inventario_${new Date().toISOString().slice(0, 10)}.csv`);
      notify.success("Exportación descargada.");
    }
  }, [filters.search, filters.sistema_id, filters.estado_auditoria]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">
            No tienes permiso para ver el inventario (sigua.cuentas.view).
          </p>
          <Button asChild variant="outline">
            <Link to="/sigua">Volver a SIGUA</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Explorador Maestro" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Explorador Maestro</h1>
            <p className="text-sm text-muted-foreground">
              Inventario global de cuentas (todos los sistemas) tras análisis SIGUA
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar vista actual
          </Button>
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-b bg-muted/20 flex-wrap">
          <div className="flex flex-1 flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario o nombre..."
                className="pl-9 h-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
              />
            </div>
            <Button variant="secondary" size="sm" className="h-9" onClick={applySearch}>
              Buscar
            </Button>
            <Select
              value={filters.sistema_id != null ? String(filters.sistema_id) : "all"}
              onValueChange={(v) =>
                setFilters((p) => ({ ...p, sistema_id: v === "all" ? null : Number(v), page: 1 }))
              }
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los sistemas</SelectItem>
                {sistemas.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.estado_auditoria ?? "all"}
              onValueChange={(v) =>
                setFilters((p) => ({
                  ...p,
                  estado_auditoria: v === "all" ? null : (v as EstadoAuditoriaInventario),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Estado auditoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(Object.keys(ESTADO_AUDITORIA_LABELS) as EstadoAuditoriaInventario[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_AUDITORIA_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          getRowId={(row) => String(row.id)}
          emptyMessage="No hay registros con los filtros aplicados"
          emptyColSpan={6}
        />

        {meta && (
          <TablePagination
            total={meta.total}
            from={meta.total === 0 ? 0 : (meta.current_page - 1) * (meta.per_page ?? 15) + 1}
            to={meta.total === 0 ? 0 : Math.min(meta.current_page * (meta.per_page ?? 15), meta.total)}
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            perPage={String(meta.per_page ?? 15)}
            perPageOptions={["10", "15", "25", "50", "100"]}
            onPerPageChange={() => {}}
            onPageChange={(p) => onPageChange(p)}
            showPerPage={false}
            loading={loading}
          />
        )}
      </Card>

      <Dialog open={!!trazabilidadRow} onOpenChange={(o) => !o && setTrazabilidadRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trazabilidad</DialogTitle>
            <DialogDescription>
              {trazabilidadRow && (
                <>
                  {trazabilidadRow.cuenta_usuario} — {trazabilidadRow.sistema?.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {trazabilidadRow && (
            <HistorialAuditoria modelo="cuenta" id={trazabilidadRow.id} title="Historial de cambios" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!clasificarRow}
        onOpenChange={(o) => !o && setClasificarRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clasificar cuenta</DialogTitle>
            <DialogDescription>
              {clasificarRow && (
                <>
                  {clasificarRow.cuenta_usuario} — {clasificarRow.nombre_en_sistema}
                </>
              )}
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
                  <SelectItem key={t} value={t}>
                    {TIPO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClasificarRow(null)}>
              Cancelar
            </Button>
            <Button onClick={handleClasificarSubmit} disabled={clasificarSubmitting}>
              {clasificarSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
