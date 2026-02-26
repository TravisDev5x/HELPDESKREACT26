import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loadCatalogs } from "@/lib/catalogCache";
import { useSiguaDashboard, useSiguaFilters } from "@/hooks/sigua";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerField } from "@/components/date-picker-field";
import { ChartErrorBoundary } from "@/components/dashboard/ChartErrorBoundary";
import { stateDistributionColors, primaryBarColor } from "@/lib/chartColors";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  BookOpen,
  AlertTriangle,
  Bell,
  Filter,
  RefreshCw,
  X,
  CheckCircle2,
  Maximize2,
  Info,
} from "lucide-react";
import type { SiguaDashboardData, SiguaFilters } from "@/types/sigua";

// --- SKELETON ---
function SiguaDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// --- KPI CARD (con semáforo y opcional expand) ---
type KpiVariant = "default" | "success" | "warning" | "destructive";

const KPI_VARIANTS: Record<KpiVariant, string> = {
  default: "border-border/50 bg-card hover:bg-accent/5",
  success: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900/50",
  warning: "border-amber-200 bg-amber-50/50 dark:border-amber-900/10 dark:border-amber-900/50",
  destructive: "border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/50",
};

const KPI_ICON_VARIANTS: Record<KpiVariant, string> = {
  default: "text-primary bg-primary/10",
  success: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40",
  warning: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40",
  destructive: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40",
};

function KpiCard({
  label,
  value,
  icon: Icon,
  helper,
  variant = "default",
  trend,
  id,
  isExpanded,
  onExpand,
  onCollapse,
  detailTitle,
  detailContent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  helper?: string;
  variant?: KpiVariant;
  trend?: string;
  id?: string;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  detailTitle?: string;
  detailContent?: React.ReactNode;
}) {
  const canExpand = Boolean(id && onExpand && (detailContent || detailTitle));
  return (
    <>
      <Card className={cn("shadow-sm transition-all duration-200", KPI_VARIANTS[variant] || KPI_VARIANTS.default)}>
        <CardContent className="p-5 flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
            {helper && <p className="text-[11px] text-muted-foreground/80">{helper}</p>}
            {trend && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">{trend}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {Icon && (
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", KPI_ICON_VARIANTS[variant] || KPI_ICON_VARIANTS.default)}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            )}
            {canExpand && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onExpand}
                aria-label="Ver detalle"
              >
                <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {canExpand && (
        <Dialog open={!!id && isExpanded} onOpenChange={(open) => !open && onCollapse?.()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-primary" />}
                {detailTitle ?? label}
              </DialogTitle>
            </DialogHeader>
            {detailContent && <div className="py-2">{detailContent}</div>}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onCollapse}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// --- MAIN PAGE ---
export default function SiguaDashboard() {
  const { user, can } = useAuth();
  const canDashboard = can("sigua.dashboard");
  const canCuentas = can("sigua.cuentas.view");
  const canCA01 = can("sigua.ca01.view");
  const canBitacora = can("sigua.bitacora.view") || can("sigua.bitacora.registrar") || can("sigua.bitacora.sede");
  const canIncidentes = can("sigua.incidentes.view");
  const canImportar = can("sigua.importar");
  const canCruces = can("sigua.cruces.view") || can("sigua.cruces.ejecutar");
  const canReportes = can("sigua.reportes");

  const { filters, setFilter, setFilters, resetFilters, hasActiveFilters } = useSiguaFilters(null, { syncUrl: true });
  const { data, loading, error, refetch } = useSiguaDashboard(filters);

  const [catalogs, setCatalogs] = useState<{ sedes: Array<{ id: number; name: string }> }>({ sedes: [] });
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadCatalogs()
      .then((res: { sedes?: Array<{ id: number; name: string }> }) => mounted && setCatalogs({ sedes: res?.sedes ?? [] }))
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Sistemas derivados del dashboard (total_cuentas_por_sistema)
  const sistemaOptions = useMemo(() => {
    const list = data?.total_cuentas_por_sistema ?? [];
    const seen = new Set<number>();
    return list.filter((r) => {
      const id = Number(r?.sistema_id);
      if (Number.isNaN(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [data?.total_cuentas_por_sistema]);

  const totalCuentas = useMemo(() => {
    const list = data?.total_cuentas_por_sistema ?? [];
    return list.reduce((acc, r) => acc + (Number(r?.total) || 0), 0);
  }, [data?.total_cuentas_por_sistema]);

  const ca01Vigentes = Number(data?.ca01_vigentes ?? data?.kpis?.ca01_vigentes ?? 0);
  const ca01Vencidos = Number(data?.ca01_vencidos ?? data?.kpis?.ca01_vencidos ?? 0);
  const bitacorasHoy = Number(data?.bitacoras_hoy ?? data?.kpis?.bitacoras_hoy ?? 0);
  const incidentesAbiertos = Number(data?.incidentes_abiertos ?? data?.kpis?.incidentes_abiertos ?? 0);
  const alertas = data?.alertas ?? [];
  const alertasCount = alertas.length;

  // Datos para gráficas
  const barData = useMemo(() => (data?.total_cuentas_por_sistema ?? []).map((r) => ({
    name: (r?.sistema ?? "Sin nombre").slice(0, 20),
    total: Number(r?.total) || 0,
    fullName: r?.sistema ?? "",
  })), [data?.total_cuentas_por_sistema]);

  const pieData = useMemo(() => {
    const arr = [
      { name: "Vigentes", value: ca01Vigentes, color: stateDistributionColors[1] },
      { name: "Vencidos", value: ca01Vencidos, color: stateDistributionColors[2] },
      { name: "Cancelados", value: 0, color: "hsl(var(--muted-foreground))" },
    ];
    return arr.filter((d) => d.value > 0);
  }, [ca01Vigentes, ca01Vencidos]);

  // Bitácoras últimos 30 días: el backend no expone serie temporal; mostramos vacío
  const bitacoras30Dias = useMemo(() => [], []);

  if (!canDashboard) {
    return (
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-10 flex flex-col items-center justify-center gap-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold">Sin acceso</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No tienes permiso para ver el dashboard de SIGUA (sigua.dashboard). Contacta al administrador.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumb + título */}
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Dashboard" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              SIGUA — Gestión de Cuentas Genéricas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Resumen de cuentas, CA-01, bitácoras e incidentes
            </p>
          </div>
          <div className="flex gap-2">
            {canCuentas && (
              <Button variant="secondary" size="sm" asChild className="h-9">
                <Link to="/sigua/cuentas">Cuentas</Link>
              </Button>
            )}
            {canCA01 && (
              <Button variant="secondary" size="sm" asChild className="h-9">
                <Link to="/sigua/ca01">CA-01</Link>
              </Button>
            )}
            {canBitacora && (
              <Button variant="secondary" size="sm" asChild className="h-9">
                <Link to="/sigua/bitacora">Bitácora</Link>
              </Button>
            )}
            {canIncidentes && (
              <Button variant="secondary" size="sm" asChild className="h-9">
                <Link to="/sigua/incidentes">Incidentes</Link>
              </Button>
            )}
            {canImportar && (
              <Button variant="secondary" size="sm" asChild className="h-9">
                <Link to="/sigua/importar">Importar</Link>
              </Button>
            )}
            {canCruces && (
              <Button variant="secondary" size="sm" asChild className="h-9">
                <Link to="/sigua/cruces">Cruces</Link>
              </Button>
            )}
            {canReportes && (
              <Button variant="secondary" size="sm" asChild className="h-9">
                <Link to="/sigua/reportes">Reportes</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading} className="h-9">
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} />
              Refrescar
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border border-border/60 shadow-sm bg-card/40 backdrop-blur-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <Badge variant="secondary" className="mt-2 w-fit">Activos</Badge>
          )}
        </CardHeader>
        <Separator className="mx-5 opacity-50" />
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Sede</Label>
              <Select
                value={filters.sede_id != null && filters.sede_id !== "" ? String(filters.sede_id) : "all"}
                onValueChange={(v) => setFilter("sede_id", v === "all" ? null : v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sedes</SelectItem>
                  {catalogs.sedes.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Sistema</Label>
              <Select
                value={filters.sistema_id != null && filters.sistema_id !== "" ? String(filters.sistema_id) : "all"}
                onValueChange={(v) => setFilter("sistema_id", v === "all" ? null : v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sistemaOptions.map((r) => (
                    <SelectItem key={r.sistema_id} value={String(r.sistema_id)}>
                      {r.sistema ?? `Sistema ${r.sistema_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Fecha desde</Label>
              <DatePickerField
                value={filters.fecha_desde ?? ""}
                onChange={(v) => setFilter("fecha_desde", v ?? null)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Fecha hasta</Label>
              <DatePickerField
                value={filters.fecha_hasta ?? ""}
                onChange={(v) => setFilter("fecha_hasta", v ?? null)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={loading} className="text-xs h-8">
              <X className="mr-2 h-3 w-3" /> Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {loading && !data ? (
        <SiguaDashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <KpiCard
              label="Total cuentas"
              value={totalCuentas}
              icon={Users}
              helper={`${barData.length} sistemas`}
              variant="default"
              id="kpi-cuentas"
              isExpanded={expandedKpiId === "kpi-cuentas"}
              onExpand={() => setExpandedKpiId("kpi-cuentas")}
              onCollapse={() => setExpandedKpiId(null)}
              detailTitle="Cuentas por sistema"
              detailContent={
                barData.length ? (
                  <ul className="text-sm space-y-1">
                    {barData.map((r, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <span className="truncate" title={r.fullName}>{r.name}</span>
                        <span className="font-mono tabular-nums">{r.total}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                )
              }
            />
            <KpiCard
              label="CA-01 vigentes"
              value={ca01Vigentes}
              icon={FileCheck}
              helper="Formatos vigentes"
              variant="success"
              id="kpi-ca01"
              isExpanded={expandedKpiId === "kpi-ca01"}
              onExpand={() => setExpandedKpiId("kpi-ca01")}
              onCollapse={() => setExpandedKpiId(null)}
              detailTitle="CA-01"
              detailContent={
                <p className="text-sm text-muted-foreground">
                  Vigentes: {ca01Vigentes} · Vencidos: {ca01Vencidos}
                </p>
              }
            />
            <KpiCard
              label="Bitácoras hoy"
              value={bitacorasHoy}
              icon={BookOpen}
              helper="Registros del día"
              variant={bitacorasHoy === 0 ? "warning" : "default"}
            />
            <KpiCard
              label="Incidentes abiertos"
              value={incidentesAbiertos}
              icon={AlertTriangle}
              helper="Pendientes de atención"
              variant={incidentesAbiertos > 0 ? "destructive" : "success"}
            />
            <KpiCard
              label="Alertas"
              value={alertasCount}
              icon={Bell}
              helper={alertasCount ? "Requieren atención" : "Sin alertas"}
              variant={alertasCount > 0 ? "warning" : "default"}
              id="kpi-alertas"
              isExpanded={expandedKpiId === "kpi-alertas"}
              onExpand={() => setExpandedKpiId("kpi-alertas")}
              onCollapse={() => setExpandedKpiId(null)}
              detailTitle="Panel de alertas"
              detailContent={
                alertas.length ? (
                  <ul className="text-sm space-y-2">
                    {alertas.map((a, i) => (
                      <li key={i} className="flex flex-col gap-0.5 p-2 rounded border bg-muted/30">
                        <span className="font-medium text-xs text-muted-foreground">{a.tipo}</span>
                        <span>{a.mensaje}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay alertas.</p>
                )
              }
            />
          </div>

          {/* Gráfica 1: Cuentas por sistema (BarChart) */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                Cuentas por sistema
              </CardTitle>
              <CardDescription className="text-xs">Distribución por sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartErrorBoundary>
                {barData.length > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const p = payload[0].payload;
                            return (
                              <div className="rounded-md border bg-card px-3 py-2 shadow-md text-sm">
                                <p className="font-medium">{p.fullName || p.name}</p>
                                <p className="text-muted-foreground tabular-nums">{p.total} cuentas</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="total" fill={primaryBarColor} radius={[4, 4, 0, 0]} name="Cuentas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <LayoutDashboard className="w-10 h-10 opacity-30 mb-2" />
                    <p className="text-sm">Sin datos para mostrar</p>
                  </div>
                )}
              </ChartErrorBoundary>
            </CardContent>
          </Card>

          {/* Gráfica 2: Estado CA-01 (PieChart) */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Estado CA-01</CardTitle>
                <CardDescription className="text-xs">Vigente / vencido / cancelado</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartErrorBoundary>
                  {pieData.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [value, ""]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileCheck className="w-10 h-10 opacity-30 mb-2" />
                      <p className="text-sm">Sin datos CA-01</p>
                    </div>
                  )}
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            {/* Gráfica 3: Bitácoras últimos 30 días (AreaChart) */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Bitácoras últimos 30 días</CardTitle>
                <CardDescription className="text-xs">Registros por día</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartErrorBoundary>
                  {bitacoras30Dias.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bitacoras30Dias}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="total" stroke={primaryBarColor} fill={primaryBarColor} fillOpacity={0.3} name="Registros" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <BookOpen className="w-10 h-10 opacity-30 mb-2" />
                      <p className="text-sm">Sin datos de serie temporal</p>
                      <p className="text-xs mt-1">El backend puede exponer bitácoras por día en futuras versiones.</p>
                    </div>
                  )}
                </ChartErrorBoundary>
              </CardContent>
            </Card>
          </div>

          {/* Panel de alertas (lista) */}
          {canDashboard && (
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Alertas
                </CardTitle>
                <CardDescription className="text-xs">
                  CA-01 por vencer, bitácoras faltantes, bajas pendientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertas.length > 0 ? (
                  <ul className="space-y-2">
                    {alertas.map((a, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase">{a.tipo}</span>
                          <p className="text-sm mt-0.5">{a.mensaje}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm">No hay alertas en este momento.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
