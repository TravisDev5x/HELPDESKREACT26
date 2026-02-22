import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { loadCatalogs } from "@/lib/catalogCache";
import { notify } from "@/lib/notify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerField } from "@/components/date-picker-field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    Activity,
    AlertTriangle,
    Download,
    Filter,
    Flame,
    Network,
    RefreshCw,
    Ticket,
    Users,
    BarChart3,
    CheckCircle2,
    X,
    LayoutDashboard
} from "lucide-react";

// --- CONSTANTES ---
const DEFAULT_FILTERS = {
    date_from: "",
    date_to: "",
    area: "all",
    sede: "all",
    type: "all",
    priority: "all",
    state: "all",
};

const STATE_COLORS = [
    "bg-sky-500 dark:bg-sky-600",
    "bg-emerald-500 dark:bg-emerald-600",
    "bg-amber-500 dark:bg-amber-600",
    "bg-rose-500 dark:bg-rose-600",
    "bg-indigo-500 dark:bg-indigo-600",
    "bg-teal-500 dark:bg-teal-600",
    "bg-orange-500 dark:bg-orange-600",
    "bg-violet-500 dark:bg-violet-600",
];

// --- COMPONENTES UI MEJORADOS ---

const SummaryMetric = ({ label, value, icon: Icon, helper, variant = "default" }) => {
    const variants = {
        default: "border-border/50 bg-card hover:bg-accent/5",
        destructive: "border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/50",
        success: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900/50"
    };

    const iconColors = {
        default: "text-primary bg-primary/10",
        destructive: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40",
        success: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40"
    };

    return (
        <Card className={cn("shadow-sm transition-all duration-200", variants[variant] || variants.default)}>
            <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
                    <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
                    {helper && <p className="text-[11px] text-muted-foreground/80">{helper}</p>}
                </div>
                {Icon && (
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", iconColors[variant] || iconColors.default)}>
                        <Icon className="h-4.5 w-4.5" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const MetricList = ({ title, icon: Icon, items, total, className }) => {
    const safeItems = items || [];
    const maxValue = safeItems.length
        ? Math.max(...safeItems.map((item) => Number(item.value || 0)))
        : 0;

    return (
        <Card className={cn("flex flex-col h-full shadow-sm border-border/60", className)}>
            <CardHeader className="pb-3 border-b bg-muted/10 px-4 py-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted">
                    {safeItems.length ? (
                        safeItems.map((item, idx) => {
                            const value = Number(item.value || 0);
                            const pct = maxValue ? Math.round((value / maxValue) * 100) : 0;
                            return (
                                <div key={idx} className="space-y-1.5 group">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-foreground/90 truncate pr-2" title={item.label}>
                                            {item.label}
                                        </span>
                                        <span className="font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                                            {value}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/70 group-hover:bg-primary transition-colors duration-300"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-50 space-y-2">
                            <BarChart3 className="w-8 h-8" />
                            <p className="text-xs">Sin datos registrados</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const StateDistribution = ({ states, total }) => {
    const safeStates = states || [];
    return (
        <Card className="xl:col-span-3 shadow-sm border-border/60">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Distribución de Estados
                        </CardTitle>
                        <CardDescription className="text-xs">Panorama general del flujo de trabajo</CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                        {total} Tickets
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Visualización de Barra Apilada */}
                <div className="h-6 w-full rounded-md flex overflow-hidden ring-1 ring-border/50 mb-6">
                    {safeStates.length ? (
                        safeStates.map((state, idx) => {
                            const value = Number(state.value || 0);
                            const pct = total ? (value / total) * 100 : 0;
                            if (pct < 1) return null; // Ocultar segmentos muy pequeños
                            return (
                                <div
                                    key={`${state.label}-${idx}`}
                                    className={cn("h-full border-r border-background/20 last:border-0 transition-all hover:brightness-110 cursor-help", STATE_COLORS[idx % STATE_COLORS.length])}
                                    style={{ width: `${pct}%` }}
                                    title={`${state.label}: ${value} (${pct.toFixed(1)}%)`}
                                />
                            );
                        })
                    ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">Sin datos</div>
                    )}
                </div>

                {/* Leyenda Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {safeStates.map((state, idx) => {
                        const value = Number(state.value || 0);
                        const pct = total ? Math.round((value / total) * 100) : 0;
                        return (
                            <div key={`legend-${idx}`} className="flex items-center gap-2 bg-muted/20 p-2 rounded border border-border/30">
                                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATE_COLORS[idx % STATE_COLORS.length])} />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-medium truncate leading-tight" title={state.label}>{state.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{value} ({pct}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

const DashboardSkeleton = () => (
    <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function Dashboard() {
    const { user, can } = useAuth();
    const canManageAll = can("tickets.manage_all");
    const canViewArea = can("tickets.view_area") || canManageAll;
    const canFilterSede = can("tickets.filter_by_sede") || canManageAll;

    const [catalogs, setCatalogs] = useState({
        areas: [], sedes: [], priorities: [], ticket_states: [], ticket_types: [],
    });

    const [filters, setFilters] = useState(() => {
        if (typeof window === "undefined") return DEFAULT_FILTERS;
        try {
            const saved = localStorage.getItem("dashboard.filters");
            return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
        } catch (_) {
            return DEFAULT_FILTERS;
        }
    });
    const [appliedFilters, setAppliedFilters] = useState(filters);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const isAreaLocked = !canManageAll && canViewArea && user?.area_id;

    // --- EFECTOS & LOGICA ---

    useEffect(() => {
        if (typeof window !== "undefined") localStorage.setItem("dashboard.filters", JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        let mounted = true;
        loadCatalogs()
            .then((res) => mounted && setCatalogs(res))
            .catch(() => notify.error({ title: "Error", description: "Falló la carga de catálogos." }));
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!isAreaLocked) return;
        const areaValue = String(user?.area_id);
        setFilters((prev) => (prev.area === areaValue ? prev : { ...prev, area: areaValue }));
        setAppliedFilters((prev) => (prev.area === areaValue ? prev : { ...prev, area: areaValue }));
    }, [isAreaLocked, user?.area_id]);

    const buildParams = useCallback((filtersToApply) => {
        const params = {};
        if (filtersToApply.date_from) params.date_from = filtersToApply.date_from;
        if (filtersToApply.date_to) params.date_to = filtersToApply.date_to;
        if (filtersToApply.state !== "all") params.ticket_state_id = filtersToApply.state;
        if (filtersToApply.priority !== "all") params.priority_id = filtersToApply.priority;
        if (filtersToApply.type !== "all") params.ticket_type_id = filtersToApply.type;
        if (filtersToApply.area !== "all") params.area_current_id = filtersToApply.area;
        if (filtersToApply.sede !== "all") params.sede_id = filtersToApply.sede;

        if (!canManageAll && canViewArea && user?.area_id) params.area_current_id = user.area_id;
        if (!canFilterSede) delete params.sede_id;
        return params;
    }, [canFilterSede, canManageAll, canViewArea, user?.area_id]);

    const loadAnalytics = useCallback(async (nextFilters = appliedFilters) => {
        setLoading(true);
        setError("");
        try {
            const params = buildParams(nextFilters);
            const response = await axios.get("/api/tickets/analytics", { params });
            setData(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err?.response?.data?.message || "Error cargando métricas");
            if (!data) setData(null);
        } finally {
            setLoading(false);
        }
    }, [appliedFilters, buildParams, data]);

    useEffect(() => { loadAnalytics(appliedFilters); }, [appliedFilters, loadAnalytics]);

    // --- UTILS ---
    const activeFilterCount = useMemo(() => {
        return Object.keys(appliedFilters).reduce((acc, key) => {
            const val = appliedFilters[key];
            return (val && val !== "all" && val !== "") ? acc + 1 : acc;
        }, 0);
    }, [appliedFilters]);

    const hasPendingChanges = useMemo(() => JSON.stringify(filters) !== JSON.stringify(appliedFilters), [filters, appliedFilters]);

    const applyFilters = () => {
        if (filters.date_from && filters.date_to && filters.date_to < filters.date_from) {
            notify.error({ title: "Error", description: "Fecha final inválida." });
            return;
        }
        setAppliedFilters(filters);
    };

    const clearFilters = () => {
        const next = { ...DEFAULT_FILTERS };
        if (isAreaLocked && user?.area_id) next.area = String(user.area_id);
        setFilters(next);
        setAppliedFilters(next);
    };

    const statesSorted = useMemo(() => data?.states ? [...data.states].sort((a, b) => Number(b.value || 0) - Number(a.value || 0)) : [], [data]);
    const totalTickets = useMemo(() => statesSorted.reduce((acc, item) => acc + Number(item.value || 0), 0), [statesSorted]);
    const topResolver = data?.top_resolvers?.[0];
    const topArea = data?.areas_receive?.[0];

    const exportUrl = useMemo(() => {
        const params = buildParams(appliedFilters);
        const query = new URLSearchParams(params).toString();
        return query ? `/api/tickets/export?${query}` : "/api/tickets/export";
    }, [appliedFilters, buildParams]);

    const isInitialLoading = loading && !data;

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Operativo</h1>
                        <p className="text-sm text-muted-foreground">Monitoreo de incidencias y rendimiento del equipo.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {lastUpdated && (
                        <span className="text-[10px] text-muted-foreground hidden lg:inline-block mr-2 bg-muted/30 px-2 py-1 rounded">
                            Actualizado: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <Button variant="outline" size="sm" onClick={() => loadAnalytics(appliedFilters)} disabled={loading} className="h-9">
                        <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refrescar
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
                    <Button asChild variant="secondary" size="sm" className="h-9 shadow-sm">
                        <a href={exportUrl}>
                            <Download className="h-3.5 w-3.5 mr-2" />
                            Exportar CSV
                        </a>
                    </Button>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <Card className="border border-border/60 shadow-sm bg-card/40 backdrop-blur-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            Filtros Globales
                        </CardTitle>
                        <div className="flex gap-2">
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="h-6 px-2 text-[10px]">
                                    {activeFilterCount} activos
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <Separator className="mx-5 opacity-50" />
                <CardContent className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Fecha Inicio</Label>
                            <DatePickerField
                                value={filters.date_from}
                                onChange={(v) => setFilters(p => ({ ...p, date_from: v }))}
                                placeholder="Seleccionar..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Fecha Fin</Label>
                            <DatePickerField
                                value={filters.date_to}
                                onChange={(v) => setFilters(p => ({ ...p, date_to: v }))}
                                placeholder="Seleccionar..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Estado</Label>
                            <Select value={filters.state} onValueChange={(v) => setFilters(p => ({ ...p, state: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Cualquier estado</SelectItem>
                                    {catalogs.ticket_states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Prioridad</Label>
                            <Select value={filters.priority} onValueChange={(v) => setFilters(p => ({ ...p, priority: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {catalogs.priorities.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 xl:block hidden">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Tipo</Label>
                            <Select value={filters.type} onValueChange={(v) => setFilters(p => ({ ...p, type: v }))}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {catalogs.ticket_types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filtros colapsables en móviles o extra filtros */}
                        {(canViewArea || canFilterSede) && (
                            <div className="contents xl:contents">
                                {canViewArea && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 flex justify-between">
                                            Area {isAreaLocked && <span className="text-[9px] text-orange-500">(Fijo)</span>}
                                        </Label>
                                        <Select value={filters.area} onValueChange={(v) => setFilters(p => ({ ...p, area: v }))} disabled={isAreaLocked}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Área" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las áreas</SelectItem>
                                                {catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {canFilterSede && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Sede</Label>
                                        <Select value={filters.sede} onValueChange={(v) => setFilters(p => ({ ...p, sede: v }))}>
                                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sede" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                {catalogs.sedes.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-5">
                        <Button variant="ghost" size="sm" onClick={clearFilters} disabled={loading} className="text-xs h-8">
                            <X className="mr-2 h-3 w-3" /> Limpiar
                        </Button>
                        <Button size="sm" onClick={applyFilters} disabled={!hasPendingChanges || loading} className="text-xs h-8 px-5">
                            <CheckCircle2 className="mr-2 h-3 w-3" /> Aplicar Filtros
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ERROR STATE */}
            {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2 animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="flex-1 font-medium">{error}</span>
                    <Button variant="outline" size="sm" className="h-7 bg-background" onClick={() => loadAnalytics(appliedFilters)}>
                        Reintentar
                    </Button>
                </div>
            )}

            {/* DASHBOARD CONTENT */}
            {isInitialLoading ? (
                <DashboardSkeleton />
            ) : !data ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-muted/10">
                    <BarChart3 className="w-10 h-10 text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold">Sin datos para mostrar</h3>
                    <p className="text-sm text-muted-foreground">Intenta ajustar los filtros o el rango de fechas.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* 1. KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryMetric
                            label="Total Tickets"
                            value={totalTickets}
                            icon={Ticket}
                            helper={`${data.states?.length || 0} estados activos`}
                        />
                        <SummaryMetric
                            label="Atención Crítica"
                            value={Number(data?.burned ?? 0)}
                            icon={Flame}
                            variant="destructive"
                            helper=">72h sin resolución"
                        />
                        <SummaryMetric
                            label="Top Resolutor"
                            value={topResolver?.label || "N/A"}
                            icon={CheckCircle2}
                            variant="success"
                            helper={topResolver ? `${topResolver.value} tickets cerrados` : "Sin actividad"}
                        />
                        <SummaryMetric
                            label="Área Más Demandada"
                            value={topArea?.label || "N/A"}
                            icon={Network}
                            helper={topArea ? `${topArea.value} tickets recibidos` : "Sin actividad"}
                        />
                    </div>

                    {/* 2. MAIN CHART */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <StateDistribution states={statesSorted} total={totalTickets} />
                    </div>

                    {/* 3. DETAILS GRIDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <MetricList
                            title="Top Usuarios (Cierres)"
                            icon={Users}
                            items={data.top_resolvers}
                            total={totalTickets}
                        />
                        <MetricList
                            title="Áreas con más carga"
                            icon={Network}
                            items={data.areas_receive}
                            total={totalTickets}
                        />
                        <MetricList
                            title="Áreas más eficientes"
                            icon={CheckCircle2}
                            items={data.areas_resolve}
                            total={totalTickets}
                        />
                        <MetricList
                            title="Tipos Recurrentes"
                            icon={Activity}
                            items={data.types_frequent}
                            total={totalTickets}
                        />
                        <MetricList
                            title="Tipos Resueltos"
                            icon={CheckCircle2}
                            items={data.types_resolved}
                            total={totalTickets}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
