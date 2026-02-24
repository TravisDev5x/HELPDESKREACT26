import { useEffect, useState, useCallback, memo } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

// --- UI COMPONENTS (SHADCN) ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notify";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { loadCatalogs, clearCatalogCache } from "@/lib/catalogCache";
import { cn } from "@/lib/utils";

// --- ICONS ---
import {
    Loader2, Plus, Filter, Tag, MapPin,
    AlertCircle, CheckCircle2, Clock, Ticket, Flame, XCircle,
    ChevronLeft, ChevronRight, Search, X, User, Building2, BarChart3,
    ArrowRightCircle, MousePointerClick
} from "lucide-react";

// ------------------------------------------------------------------
// FILAS MEMOIZADAS (Con Botón de Gestión Mejorado)
// ------------------------------------------------------------------

const TicketRow = memo(function TicketRow({ ticket }) {
    // Detectar si el ticket requiere atención inmediata (sin asignar o alta prioridad)
    const needsAttention = !ticket.assigned_user && !ticket.assignedUser;
    const isOverdue = Boolean(ticket.is_overdue);

    return (
        <TableRow className={cn(
            "group hover:bg-muted/40 transition-colors border-b border-border/50",
            isOverdue && "bg-destructive/5 hover:bg-destructive/10 border-l-2 border-l-destructive"
        )}>
            <TableCell className="w-[80px]">
                <div className="font-mono text-xs font-bold text-primary/80 bg-primary/5 py-1 px-2 rounded text-center">
                    #{String(ticket.id).padStart(5, '0')}
                </div>
            </TableCell>
            <TableCell className="max-w-[300px]">
                <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-sm text-foreground truncate pr-4" title={ticket.subject}>
                        {ticket.subject}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal rounded-sm border-muted-foreground/30">
                            {ticket.ticket_type?.name}
                        </Badge>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <StateBadge state={ticket.state} />
            </TableCell>
            <TableCell className="text-center">
                <PriorityBadge priority={ticket.priority} />
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-xs gap-0.5">
                    {ticket.assigned_user || ticket.assignedUser ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                {(ticket.assigned_user?.name || ticket.assignedUser?.name || "?").charAt(0)}
                            </div>
                            <span className="font-medium text-foreground/90 truncate max-w-[120px]">
                                {ticket.assigned_user?.name || ticket.assignedUser?.name}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground italic pl-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-orange-400" /> Sin asignar
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-xs">
                {ticket.sla_status_text ? (
                    <span className={ticket.is_overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                        {ticket.sla_status_text}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-xs gap-1">
                    <span className="font-medium flex items-center gap-1.5 text-foreground/80">
                        <Building2 className="w-3 h-3 text-muted-foreground" /> {ticket.sede?.name}
                    </span>
                    <span className="text-muted-foreground pl-5 truncate max-w-[140px]" title={ticket.area_current?.name}>
                        {ticket.area_current?.name}
                    </span>
                </div>
            </TableCell>

            {/* --- ACCIÓN PRINCIPAL MEJORADA --- */}
            <TableCell className="text-right pr-4">
                <Button
                    asChild
                    variant={needsAttention ? "default" : "secondary"}
                    size="sm"
                    className={`
                        h-8 text-xs font-semibold shadow-sm transition-all
                        ${needsAttention
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-secondary/50 hover:bg-primary hover:text-primary-foreground border border-border/50"}
                    `}
                >
                    <Link to={`/tickets/${ticket.id}`} className="flex items-center gap-2">
                        <span>Gestionar</span>
                        <ArrowRightCircle className="w-3.5 h-3.5 opacity-70" />
                    </Link>
                </Button>
            </TableCell>
        </TableRow>
    );
});

const PriorityBadge = memo(({ priority }) => {
    const level = Number(priority?.level);
    let styles = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";

    if (level === 1) styles = "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20";
    if (level === 2) styles = "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20";
    if (level === 3) styles = "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20";

    return (
        <Badge variant="outline" className={`uppercase text-[10px] font-bold tracking-tight px-2 py-0.5 border ${styles}`}>
            {priority?.name}
        </Badge>
    );
});

const StateBadge = memo(({ state }) => {
    const code = (state?.code || "").toLowerCase();
    let config = {
        icon: <Clock className="w-3 h-3 mr-1.5" />,
        styles: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
    };

    if (["abierto", "en_progreso", "asignado"].includes(code)) {
        config = {
            icon: <Ticket className="w-3 h-3 mr-1.5" />,
            styles: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        };
    } else if (["resuelto", "cerrado"].includes(code)) {
        config = {
            icon: <CheckCircle2 className="w-3 h-3 mr-1.5" />,
            styles: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        };
    } else if (code.includes("cancel") || code.includes("rechaz")) {
        config = {
            icon: <AlertCircle className="w-3 h-3 mr-1.5" />,
            styles: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
        };
    }

    return (
        <Badge variant="outline" className={`font-medium py-0.5 pl-2 pr-2.5 border ${config.styles}`}>
            {config.icon} {state?.name}
        </Badge>
    );
});

const SummaryCard = ({ title, value, icon: Icon, variant = "default", hint, className }) => {
    // Definición de variantes de color (Compatible Light/Dark)
    const variants = {
        default: "bg-card border-border/50 text-foreground", // Estilo clásico blanco/negro
        blue: "bg-blue-50/50 border-blue-100 text-blue-900 dark:bg-blue-900/10 dark:border-blue-900/50 dark:text-blue-100",
        red: "bg-red-50/50 border-red-100 text-red-900 dark:bg-red-900/10 dark:border-red-900/50 dark:text-red-100",
        slate: "bg-slate-50/50 border-slate-100 text-slate-900 dark:bg-slate-800/10 dark:border-slate-800/50 dark:text-slate-100",
        violet: "bg-violet-50/50 border-violet-100 text-violet-900 dark:bg-violet-900/10 dark:border-violet-900/50 dark:text-violet-100",
    };

    // Colores para los iconos según la variante
    const iconStyles = {
        default: "bg-muted/20 text-muted-foreground",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
        red: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
        slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
        violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
    };

    const currentStyle = variants[variant] || variants.default;
    const currentIconStyle = iconStyles[variant] || iconStyles.default;

    return (
        <Card className={`shadow-sm transition-all hover:shadow-md border ${currentStyle} ${className}`}>
            <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                    <p className={`text-[10px] uppercase tracking-wider font-bold opacity-70`}>{title}</p>
                    <div className="text-2xl font-bold tracking-tight">{value}</div>
                    {hint && <p className="text-[10px] opacity-70">{hint}</p>}
                </div>
                {Icon && (
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${currentIconStyle}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const SummarySkeleton = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full rounded-xl" />
        ))}
    </div>
);

// ------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ------------------------------------------------------------------

export default function Tickets() {
    const { user, can } = useAuth();

    const [tickets, setTickets] = useState([]);
    const [catalogs, setCatalogs] = useState({
        areas: [], sedes: [], ubicaciones: [], priorities: [], ticket_states: [], ticket_types: [], area_users: []
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState("");

    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [perPage, setPerPage] = useState(() => Number(localStorage.getItem("tickets.perPage")) || 10);
    const [currentPage, setCurrentPage] = useState(1);

    const [searchParams] = useSearchParams();
    const defaultFilters = { area: "all", sede: "all", type: "all", priority: "all", state: "all", search: "", assignment: "all", assignee: "all", sla: "all" };
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem("tickets.filters");
        return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    });
    useEffect(() => {
        const assignmentFromUrl = searchParams.get("assignment");
        if (assignmentFromUrl === "me" || assignmentFromUrl === "unassigned" || assignmentFromUrl === "user") {
            setFilters((prev) => (prev.assignment === assignmentFromUrl ? prev : { ...prev, assignment: assignmentFromUrl }));
        }
    }, [searchParams]);

    const canManageAll = can("tickets.manage_all");
    const canCreate = can("tickets.create") || canManageAll;
    const canViewArea = can("tickets.view_area") || canManageAll;
    const needsAreaWarning = canViewArea && !canManageAll && !user?.area_id;
    const canFilterSede = can("tickets.filter_by_sede") || canManageAll;
    const canAssign = can("tickets.assign") || canManageAll;
    const isSolicitanteOnly = !canManageAll && !canViewArea && (can("tickets.create") || can("tickets.view_own"));

    const areaUsers = catalogs.area_users || [];
    const canUseAssignmentFilters = canViewArea || canAssign;

    const [form, setForm] = useState({
        subject: "", description: "", area_origin_id: "", area_current_id: "",
        sede_id: "", ubicacion_id: "none", ticket_type_id: "", priority_id: "", ticket_state_id: ""
    });

    // --- CARGA DE DATOS ---
    const loadData = useCallback(async () => {
        setLoading(true);
        setSummaryLoading(true);
        try {
            const params = {
                page: currentPage,
                per_page: perPage,
                search: filters.search,
                ...(filters.area !== "all" && { area_current_id: filters.area }),
                ...(filters.sede !== "all" && { sede_id: filters.sede }),
                ...(filters.type !== "all" && { ticket_type_id: filters.type }),
                ...(filters.priority !== "all" && { priority_id: filters.priority }),
                ...(filters.state !== "all" && { ticket_state_id: filters.state }),
                ...(filters.sla !== "all" && filters.sla && { sla: filters.sla }),
            };

            if (filters.assignment === "me") params.assigned_to = "me";
            if (filters.assignment === "unassigned") params.assigned_status = "unassigned";
            if (filters.assignment === "user" && filters.assignee !== "all") {
                params.assigned_user_id = filters.assignee;
            }

            if (canViewArea && !canManageAll && user?.area_id) params.area_current_id = user.area_id;
            if (!canViewArea && !canManageAll) params.requester = "me";

            const summaryParams = { ...params };
            delete summaryParams.page;
            delete summaryParams.per_page;

            const [catalogResult, ticketResult, summaryResult] = await Promise.allSettled([
                loadCatalogs(),
                axios.get("/api/tickets", { params }),
                axios.get("/api/tickets/summary", { params: summaryParams }),
            ]);

            if (catalogResult.status === "fulfilled") {
                setCatalogs(catalogResult.value);
            }

            if (ticketResult.status === "fulfilled") {
                setTickets(ticketResult.value.data.data);
                setPagination({
                    current_page: ticketResult.value.data.current_page,
                    last_page: ticketResult.value.data.last_page,
                    total: ticketResult.value.data.total
                });
            } else {
                notify.error({ title: "Error", description: "No se pudieron cargar los tickets." });
            }

            if (summaryResult.status === "fulfilled") {
                setSummary(summaryResult.value.data);
                setSummaryError("");
            } else {
                setSummaryError("Error de métricas");
                setSummary(null);
            }
        } catch (err) {
            console.error(err);
            notify.error({ title: "Error crítico", description: "Fallo de conexión." });
        } finally {
            setLoading(false);
            setSummaryLoading(false);
        }
    }, [currentPage, perPage, filters, user, canManageAll, canViewArea]);

    useEffect(() => {
        clearCatalogCache();
    }, []);
    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        localStorage.setItem("tickets.filters", JSON.stringify(filters));
        localStorage.setItem("tickets.perPage", String(perPage));
    }, [filters, perPage]);

    const handleCreateOpen = () => {
        setForm({
            ...form,
            subject: "", description: "",
            sede_id: String(user?.sede?.id || ""),
            area_origin_id: String(user?.area_id || ""),
            area_current_id: "",
            ticket_type_id: String(catalogs.ticket_types[0]?.id || ""),
            priority_id: String(catalogs.priorities[0]?.id || ""),
            ticket_state_id: "1",
        });
        setOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                sede_id: Number(form.sede_id),
                area_origin_id: Number(form.area_origin_id),
                area_current_id: Number(form.area_current_id),
                priority_id: Number(form.priority_id),
                ticket_type_id: Number(form.ticket_type_id),
                ubicacion_id: form.ubicacion_id === "none" ? null : Number(form.ubicacion_id)
            };

            await axios.post("/api/tickets", payload);
            clearCatalogCache();
            notify.success({ title: "Ticket Creado", description: "El ticket se ha registrado exitosamente." });
            setOpen(false);
            setCurrentPage(1);
            loadData();
        } catch (err) {
            notify.error({ title: "Error", description: err.response?.data?.message || "Error al crear ticket" });
        } finally {
            setSaving(false);
        }
    };

    const handleClearFilters = () => setFilters({ ...defaultFilters });

    // --- UTILIDADES ---
    const hasActiveFilters = filters.search !== "" || filters.area !== "all" || filters.sede !== "all" || filters.type !== "all" || filters.state !== "all" || filters.priority !== "all" || filters.assignment !== "all" || (filters.assignment === "user" && filters.assignee !== "all") || filters.sla !== "all";
    const activeFilterCount = [filters.search, filters.area !== "all", filters.sede !== "all", filters.type !== "all", filters.priority !== "all", filters.state !== "all", filters.assignment !== "all", filters.assignment === "user" && filters.assignee !== "all", filters.sla !== "all"].filter(Boolean).length;

    const [exporting, setExporting] = useState(false);
    const handleExport = useCallback(async () => {
        const params = {};
        if (filters.search) params.search = filters.search;
        if (filters.area !== "all") params.area_current_id = filters.area;
        if (filters.sede !== "all") params.sede_id = filters.sede;
        if (filters.type !== "all") params.ticket_type_id = filters.type;
        if (filters.priority !== "all") params.priority_id = filters.priority;
        if (filters.state !== "all") params.ticket_state_id = filters.state;
        if (filters.sla !== "all") params.sla = filters.sla;
        if (filters.assignment === "me") params.assigned_to = "me";
        if (filters.assignment === "unassigned") params.assigned_status = "unassigned";
        if (filters.assignment === "user" && filters.assignee !== "all") params.assigned_user_id = filters.assignee;
        setExporting(true);
        try {
            const { data } = await axios.get("/api/tickets/export", { params, responseType: "blob" });
            const url = URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download = "tickets.csv";
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            notify.error("No se pudo exportar");
        } finally {
            setExporting(false);
        }
    }, [filters]);

    const summaryStates = (summary?.by_state || []).slice().sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    const summaryMax = summaryStates.length ? Math.max(...summaryStates.map((s) => Number(s.value || 0))) : 0;
    const resolveStateBar = (state) => {
        const code = String(state?.code || "").toLowerCase();
        if (code.includes("cancel")) return "bg-red-500/70";
        if (state?.is_final) return "bg-emerald-500/70";
        return "bg-primary/80";
    };

    if (isSolicitanteOnly) return <Navigate to="/" replace />;

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">

            {needsAreaWarning && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Tienes permiso por área pero no tienes un área asignada. Asigna tu área para ver y gestionar tickets.</span>
                    <Link to="/profile">
                        <Button variant="outline" size="sm" className="border-amber-600/50 hover:bg-amber-500/20">Ir a mi perfil</Button>
                    </Link>
                </div>
            )}

            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <Ticket className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Tickets</h1>
                        <p className="text-sm text-muted-foreground">Sistema centralizado de incidencias.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || exporting} title="Exportar CSV con filtros actuales">
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Exportar CSV
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadData} disabled={loading} title="Actualizar">
                        <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {canCreate && (
                        <Button onClick={handleCreateOpen} className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Ticket
                        </Button>
                    )}
                </div>
            </div>
            {/* 2. METRICAS (SUMMARY CARDS) - ARRIBA */}
            <div className="w-full">
                {summaryLoading ? (
                    <SummarySkeleton />
                ) : summary ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Card 1: Total - Azul (Información) */}
                        <SummaryCard
                            title="Total Tickets"
                            value={summary.total ?? 0}
                            icon={Ticket}
                            variant="blue"
                        />

                        {/* Card 2: Críticos - Rojo (Alerta) */}
                        <SummaryCard
                            title="Críticos/Quemados"
                            value={summary.burned ?? 0}
                            icon={Flame}
                            variant="red"
                            hint="Sin atención > 72h"
                        />

                        {/* Card 3: Cancelados - Slate (Neutral) */}
                        <SummaryCard
                            title="Cancelados"
                            value={summary.canceled ?? 0}
                            icon={XCircle}
                            variant="slate"
                        />

                        {/* Card 4: Top Estados (Mini Chart) - Violeta (Analítica) */}
                        <Card className="border border-violet-100 bg-violet-50/30 dark:bg-violet-900/10 dark:border-violet-900/50 shadow-sm sm:col-span-2 lg:col-span-1 flex flex-col justify-center">
                            <CardContent className="p-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] uppercase font-bold text-violet-900 dark:text-violet-100 flex items-center gap-1">
                                        <BarChart3 className="w-3 h-3" /> Top Estados
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {summaryStates.slice(0, 3).map((state) => {
                                        const value = Number(state.value || 0);
                                        const pct = summaryMax ? Math.round((value / summaryMax) * 100) : 0;
                                        // Barra de progreso personalizada al tono violeta
                                        return (
                                            <div key={state.id} className="space-y-1">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="truncate max-w-[100px] text-foreground/80 font-medium">{state.label}</span>
                                                    <span className="font-mono text-muted-foreground">{value}</span>
                                                </div>
                                                <div className="h-1.5 bg-violet-200/50 dark:bg-violet-900/30 rounded-full overflow-hidden">
                                                    <div className="h-full bg-violet-500 dark:bg-violet-400" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {summaryStates.length === 0 && <span className="text-[10px] text-muted-foreground">Sin datos</span>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">No hay métricas disponibles</div>
                )}
            </div>

            {/* 3. FILTROS Y TABLA */}
            <div className="space-y-4">

                {/* FILTROS FULL WIDTH */}
                <Card className="border border-border/50 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4">
                            {/* Search bar row */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por ID, asunto, descripción..."
                                        className="pl-9 bg-background"
                                        value={filters.search}
                                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                    />
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {hasActiveFilters && (
                                        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9 text-xs text-destructive hover:bg-destructive/10 px-2">
                                            <X className="h-3.5 w-3.5 mr-1" /> Limpiar
                                        </Button>
                                    )}
                                    <Badge variant={activeFilterCount > 0 ? "secondary" : "outline"} className="h-9 px-3">
                                        <Filter className="w-3 h-3 mr-1" />
                                        {activeFilterCount > 0 ? `${activeFilterCount} filtros` : "Filtros"}
                                    </Badge>
                                </div>
                            </div>

                            <Separator className="bg-border/40" />

                            {/* Selects Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                <Select value={filters.state} onValueChange={(v) => setFilters(f => ({ ...f, state: v }))}>
                                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Estado" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        {catalogs.ticket_states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
                                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las prioridades</SelectItem>
                                        {catalogs.priorities.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
                                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        {catalogs.ticket_types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                {canViewArea && (
                                    <Select value={filters.area} onValueChange={(v) => setFilters(f => ({ ...f, area: v }))}>
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Área" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las áreas</SelectItem>
                                            {catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}

                                {canUseAssignmentFilters && (
                                    <Select
                                        value={filters.assignment}
                                        onValueChange={(v) => setFilters(f => ({ ...f, assignment: v, assignee: v === "user" ? f.assignee : "all" }))}
                                    >
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Asignación" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="me">Mis tickets</SelectItem>
                                            <SelectItem value="unassigned">Sin asignar</SelectItem>
                                            <SelectItem value="user">Por usuario...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}

                                <Select value={filters.sla} onValueChange={(v) => setFilters(f => ({ ...f, sla: v }))}>
                                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="SLA" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Cualquier SLA</SelectItem>
                                        <SelectItem value="within">Dentro de plazo</SelectItem>
                                        <SelectItem value="overdue">Vencidos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* TABLA */}
                <Card className="border border-border/50 shadow-sm overflow-hidden bg-card">
                    <div className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b border-border/50 hover:bg-transparent">
                                    <TableHead className="w-[80px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">Folio</TableHead>
                                    <TableHead className="min-w-[280px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Detalle del Ticket</TableHead>
                                    <TableHead className="w-[140px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                                    <TableHead className="w-[100px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">Prioridad</TableHead>
                                    <TableHead className="min-w-[150px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Asignado a</TableHead>
                                    <TableHead className="min-w-[120px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">SLA</TableHead>
                                    <TableHead className="min-w-[180px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Ubicación</TableHead>
                                    <TableHead className="w-[120px] text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={8} className="h-16 px-4">
                                                <div className="flex items-center gap-4">
                                                    <Skeleton className="h-8 w-12" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-3/4" />
                                                        <Skeleton className="h-3 w-1/4" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-72 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                <div className="p-5 bg-muted/30 rounded-2xl">
                                                    <Ticket className="w-12 h-12 opacity-50" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground/90">No hay tickets</p>
                                                    <p className="text-sm mt-1 max-w-sm text-center">
                                                        {hasActiveFilters
                                                            ? "Ningún ticket coincide con los filtros. Prueba a limpiar filtros o ampliar la búsqueda."
                                                            : "Aún no hay tickets registrados. Crea el primero para comenzar."}
                                                    </p>
                                                </div>
                                                {canCreate && !hasActiveFilters && (
                                                    <Button onClick={handleCreateOpen} size="sm" className="mt-2">
                                                        <Plus className="w-4 h-4 mr-2" /> Crear ticket
                                                    </Button>
                                                )}
                                                {hasActiveFilters && (
                                                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                                                        <X className="w-4 h-4 mr-2" /> Limpiar filtros
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets.map((t) => <TicketRow key={t.id} ticket={t} />)
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* FOOTER TABLA (PAGINACION) */}
                    <div className="border-t border-border/50 px-4 py-3 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-muted-foreground">
                            {pagination.total === 0 ? (
                                "Sin resultados"
                            ) : (
                                <>
                                    Mostrando <span className="font-medium text-foreground">
                                        {(pagination.current_page - 1) * perPage + 1}–{Math.min(pagination.current_page * perPage, pagination.total)}
                                    </span> de <span className="font-medium text-foreground">{pagination.total}</span> tickets
                                </>
                            )}
                        </p>

                        <div className="flex items-center gap-2">
                            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-16 h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <div className="flex items-center border rounded-md bg-background shadow-sm">
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8 rounded-r-none border-r"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-medium w-24 text-center">
                                    {currentPage} / {pagination.last_page}
                                </span>
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l"
                                    onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))}
                                    disabled={currentPage === pagination.last_page || loading}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* MODAL CREAR TICKET */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 border-0 shadow-2xl">
                    <DialogHeader className="p-6 bg-primary text-primary-foreground">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5 bg-primary-foreground/20 rounded p-0.5" />
                            Nuevo Ticket
                        </DialogTitle>
                        <DialogDescription className="text-primary-foreground/70">
                            Completa la información requerida para registrar el incidente.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Asunto <span className="text-destructive">*</span></Label>
                                    <Input
                                        required
                                        className="font-medium"
                                        placeholder="Ej: Fallo en impresora de recepción"
                                        value={form.subject}
                                        onChange={e => setForm({ ...form, subject: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo</Label>
                                    <Select value={form.ticket_type_id} onValueChange={v => setForm({ ...form, ticket_type_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.ticket_types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Prioridad</Label>
                                    <Select value={form.priority_id} onValueChange={v => setForm({ ...form, priority_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.priorities.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-muted/20 p-4 rounded-lg border border-border/50">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Sede
                                    </Label>
                                    <Select value={form.sede_id} onValueChange={v => setForm({ ...form, sede_id: v })}>
                                        <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.sedes.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-primary flex items-center gap-1">
                                        <User className="w-3 h-3" /> Asignar a Área <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={form.area_current_id} onValueChange={v => setForm({ ...form, area_current_id: v })}>
                                        <SelectTrigger className="bg-background border-primary/30 ring-offset-primary/10"><SelectValue placeholder="Área responsable" /></SelectTrigger>
                                        <SelectContent>{catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Área Solicitante (Origen)</Label>
                                    <Select value={form.area_origin_id} onValueChange={v => setForm({ ...form, area_origin_id: v })}>
                                        <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                                        <SelectContent>{catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Detalle del incidente</Label>
                                <Textarea
                                    className="min-h-[120px] resize-none bg-muted/10 focus:bg-background transition-colors"
                                    placeholder="Describe qué pasó, cuándo y si hay mensajes de error..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter className="p-4 border-t bg-muted/10">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Crear Ticket
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
