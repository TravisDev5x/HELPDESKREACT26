import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useCA01 } from "@/hooks/sigua";
import { getSistemas } from "@/services/siguaApi";
import { loadCatalogs } from "@/lib/catalogCache";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SiguaCA01Form } from "./SiguaCA01Form";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { FormatoCA01, SiguaFilters, Sistema } from "@/types/sigua";
import type { CreateCA01Payload } from "@/services/siguaApi";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  CalendarClock,
  Eye,
} from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  vigente: "Vigente",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const ESTADO_VARIANTS: Record<string, string> = {
  vigente: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  vencido: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  cancelado: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

const DIAS_ALERTA_VENCIMIENTO = 15;

function diasHastaVencimiento(fechaVencimiento: string): number {
  const v = new Date(fechaVencimiento);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  v.setHours(0, 0, 0, 0);
  return Math.ceil((v.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SiguaCA01() {
  const { can } = useAuth();
  const canView = can("sigua.ca01.view");
  const canManage = can("sigua.ca01.manage");

  const [filters, setFilters] = useState<SiguaFilters>({
    sede_id: null,
    sistema_id: null,
    estado: null,
    gerente_user_id: null,
  });
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [catalogs, setCatalogs] = useState<{ sedes: Array<{ id: number; name: string }>; campaigns: Array<{ id: number; name: string }> }>({ sedes: [], campaigns: [] });
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [renovandoId, setRenovandoId] = useState<number | null>(null);

  const { data, meta, loading, error, refetch, create, renovar, mutating } = useCA01(filters);

  useEffect(() => {
    if (searchParams.get("openForm") === "1") {
      setFormOpen(true);
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("openForm");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    getSistemas().then((r) => r.data && setSistemas(r.data));
  }, []);
  useEffect(() => {
    loadCatalogs().then((c: { sedes?: Array<{ id: number; name: string }>; campaigns?: Array<{ id: number; name: string }> }) =>
      setCatalogs({ sedes: c?.sedes ?? [], campaigns: c?.campaigns ?? [] })
    );
  }, []);
  useEffect(() => {
    axios.get("/api/users", { params: { per_page: 500, user_status: "active" } }).then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setUsers(Array.isArray(list) ? list.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name })) : []);
    }).catch(() => setUsers([]));
  }, []);

  const handleCreateSubmit = useCallback(
    async (payload: CreateCA01Payload) => {
      const res = await create(payload);
      if (res.error) {
        notify.error(res.error);
        throw new Error(res.error);
      }
      notify.success("CA-01 creado correctamente");
      setFormOpen(false);
      refetch(1);
    },
    [create, refetch]
  );

  const handleRenovar = useCallback(
    async (id: number) => {
      setRenovandoId(id);
      const res = await renovar(id);
      setRenovandoId(null);
      if (res.error) notify.error(res.error);
      else {
        notify.success("CA-01 renovado");
        refetch(meta?.current_page ?? 1);
      }
    },
    [renovar, refetch, meta?.current_page]
  );

  const proximosVencer = useMemo(() => data.filter((c) => {
    const estado = (c as FormatoCA01).estado ?? (c as unknown as { estado?: string }).estado;
    if (estado !== "vigente") return false;
    const venc = (c as FormatoCA01).fecha_vencimiento ?? (c as unknown as { fecha_vencimiento?: string }).fecha_vencimiento;
    if (!venc) return false;
    const dias = diasHastaVencimiento(venc);
    return dias >= 0 && dias <= DIAS_ALERTA_VENCIMIENTO;
  }), [data]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver CA-01.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Formatos CA-01" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Formatos CA-01</h1>
            <p className="text-sm text-muted-foreground">Autorización de cuentas genéricas</p>
          </div>
          {canManage && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo CA-01
            </Button>
          )}
        </div>
      </div>

      {proximosVencer.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 flex items-start gap-3">
          <CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {proximosVencer.length} CA-01 próximo(s) a vencer (menos de {DIAS_ALERTA_VENCIMIENTO} días)
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              Considera renovar para mantener la cobertura.
            </p>
          </div>
        </div>
      )}

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-2 items-center border-b bg-muted/20">
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
            value={filters.estado ?? "all"}
            onValueChange={(v) => setFilters((p) => ({ ...p, estado: v === "all" ? null : v }))}
          >
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="vigente">Vigente</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.gerente_user_id != null ? String(filters.gerente_user_id) : "all"}
            onValueChange={(v) => setFilters((p) => ({ ...p, gerente_user_id: v === "all" ? null : Number(v) }))}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Gerente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Gerente</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Cuentas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No hay formatos CA-01 con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => {
                    const r = row as FormatoCA01 & { cuentas?: unknown[] };
                    const estado = r.estado ?? "vigente";
                    const count = Array.isArray(r.cuentas) ? r.cuentas.length : 0;
                    const dias = r.fecha_vencimiento ? diasHastaVencimiento(r.fecha_vencimiento) : null;
                    const alerta = estado === "vigente" && dias != null && dias >= 0 && dias <= DIAS_ALERTA_VENCIMIENTO;
                    return (
                      <TableRow key={r.id} className={cn(alerta && "bg-amber-50/30 dark:bg-amber-900/5")}>
                        <TableCell className="font-medium">{r.gerente?.name ?? `#${r.gerente_user_id}`}</TableCell>
                        <TableCell>{r.campaign?.name ?? "—"}</TableCell>
                        <TableCell>{r.sede?.name ?? "—"}</TableCell>
                        <TableCell>{r.sistema?.name ?? "—"}</TableCell>
                        <TableCell>{r.fecha_firma ? new Date(r.fecha_firma).toLocaleDateString("es-ES") : "—"}</TableCell>
                        <TableCell>
                          <span className={cn(alerta && "text-amber-700 dark:text-amber-400 font-medium")}>
                            {r.fecha_vencimiento ? new Date(r.fecha_vencimiento).toLocaleDateString("es-ES") : "—"}
                          </span>
                          {alerta && dias != null && (
                            <span className="text-[10px] text-amber-600 block">({dias} días)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", ESTADO_VARIANTS[estado] ?? ESTADO_VARIANTS.cancelado)}>
                            {ESTADO_LABELS[estado] ?? estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{count}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8" asChild title="Ver detalle">
                            <Link to={`/sigua/ca01/${r.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          {estado === "vencido" && canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={renovandoId === r.id}
                              onClick={() => handleRenovar(r.id)}
                            >
                              {renovandoId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                              Renovar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {meta && meta.last_page > 1 && (
              <div className="border-t px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pág. {meta.current_page} de {meta.last_page} · Total {meta.total}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={meta.current_page <= 1 || loading} onClick={() => refetch(meta.current_page - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page || loading} onClick={() => refetch(meta.current_page + 1)}>
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <SiguaCA01Form
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateSubmit}
        onCancel={() => setFormOpen(false)}
        sistemas={sistemas}
        sedes={catalogs.sedes}
        campaigns={catalogs.campaigns}
        users={users}
        isSubmitting={mutating}
      />
    </div>
  );
}
