import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { loadCatalogs, clearCatalogCache } from "@/lib/catalogCache";
import { notify } from "@/lib/notify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerField } from "@/components/date-picker-field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
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
    LayoutDashboard,
    CheckCircle,
    XCircle,
    TrendingUp,
    UserCheck,
    Plus,
    MapPin,
    User,
    ListChecks,
    AlertCircle,
    Clock,
    Bell,
    BellOff
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

/** Formatea una fecha a YYYY-MM-DD para comparar días. */
function toDateKey(date) {
    const d = typeof date === "string" ? new Date(date) : date;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Texto relativo para "hace X min/h/días" */
function relativeTime(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "hace un momento";
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffH < 24) return `hace ${diffH} h`;
    if (diffD === 1) return "ayer";
    if (diffD < 7) return `hace ${diffD} días`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const CREATE_FORM_INITIAL = {
    subject: "",
    description: "",
    sede_id: "",
    area_origin_id: "",
    area_current_id: "",
    ticket_type_id: "",
    priority_id: "",
    ticket_state_id: "",
};

/** Dashboard para usuario solicitante: Hola + avatar + nombre + hora + resumen + Mis tickets (calendario único en /calendario). */
function DashboardSolicitante() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
    const [createSaving, setCreateSaving] = useState(false);
    const [createCatalogs, setCreateCatalogs] = useState({ areas: [], sedes: [], priorities: [], ticket_states: [], ticket_types: [] });
    const [createCatalogsLoading, setCreateCatalogsLoading] = useState(false);
    const [sortOrder, setSortOrder] = useState("recent");
    const [stateFilter, setStateFilter] = useState("all");
    const [createSuccessTicketId, setCreateSuccessTicketId] = useState(null);
    const [activityNotifications, setActivityNotifications] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const refMisTickets = useRef(null);

    const loadTickets = useCallback(() => {
        setLoading(true);
        axios.get("/api/tickets", { params: { per_page: 50 } })
            .then((res) => setTickets(res.data?.data ?? []))
            .catch(() => setTickets([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const loadActivity = useCallback(() => {
        setActivityLoading(true);
        axios.get("/api/notifications", { params: { limit: 5 } })
            .then((res) => {
                const list = res.data?.notifications ?? (Array.isArray(res.data) ? res.data : []);
                setActivityNotifications(Array.isArray(list) ? list : []);
            })
            .catch(() => setActivityNotifications([]))
            .finally(() => setActivityLoading(false));
    }, []);

    useEffect(() => {
        loadActivity();
    }, [loadActivity]);

    const activityNotificationTitle = (n) => {
        const d = n?.data || {};
        if (d.message) return d.message;
        if (d.ticket_id) return `Solicitud #${d.ticket_id}`;
        return "Notificación";
    };

    const activityNotificationTime = (n) => {
        if (!n?.created_at) return "";
        return relativeTime(n.created_at);
    };

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const openCreateModal = useCallback(() => {
        setCreateModalOpen(true);
        const applyDefaults = (data) => {
            const openState = (data.ticket_states || []).find((s) => (s.code || "").toLowerCase() === "abierto") || (data.ticket_states || [])[0];
            setCreateForm({
                ...CREATE_FORM_INITIAL,
                sede_id: String(user?.sede_id || user?.sede?.id || ""),
                area_origin_id: String(user?.area_id || ""),
                ticket_type_id: String((data.ticket_types || [])[0]?.id || ""),
                priority_id: String((data.priorities || [])[0]?.id || ""),
                ticket_state_id: String(openState?.id || ""),
            });
        };
        if (createCatalogs.ticket_states?.length > 0) {
            applyDefaults(createCatalogs);
            return;
        }
        setCreateCatalogsLoading(true);
        loadCatalogs()
            .then((data) => {
                setCreateCatalogs(data);
                applyDefaults(data);
            })
            .catch(() => notify.error("No se pudieron cargar los catálogos"))
            .finally(() => setCreateCatalogsLoading(false));
    }, [user?.sede_id, user?.sede?.id, user?.area_id, createCatalogs]);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!createForm.subject?.trim()) {
            notify.error("El asunto es obligatorio");
            return;
        }
        if (!createForm.sede_id || !createForm.area_origin_id || !createForm.area_current_id || !createForm.ticket_type_id || !createForm.priority_id || !createForm.ticket_state_id) {
            notify.error("Completa todos los campos obligatorios (sede, área responsable, área origen, tipo, prioridad).");
            return;
        }
        setCreateSaving(true);
        try {
            const payload = {
                subject: createForm.subject.trim(),
                description: createForm.description?.trim() || null,
                sede_id: Number(createForm.sede_id),
                area_origin_id: Number(createForm.area_origin_id),
                area_current_id: Number(createForm.area_current_id),
                priority_id: Number(createForm.priority_id),
                ticket_type_id: Number(createForm.ticket_type_id),
                ticket_state_id: Number(createForm.ticket_state_id),
                created_at: new Date().toISOString(),
            };
            const { data } = await axios.post("/api/tickets", payload);
            clearCatalogCache();
            loadTickets();
            loadActivity();
            setCreateSuccessTicketId(data?.id ?? null);
        } catch (err) {
            notify.error(err?.response?.data?.message || "Error al crear el ticket");
        } finally {
            setCreateSaving(false);
        }
    };

    const ticketsToShow = tickets;

    const ticketsFilteredByState = useMemo(() => {
        if (stateFilter === "all") return ticketsToShow;
        return ticketsToShow.filter((t) => {
            const code = (t.state?.code ?? "").toLowerCase();
            if (stateFilter === "open") return code === "abierto";
            if (stateFilter === "progress") return ["en_progreso", "en progreso", "en_espera"].includes(code);
            if (stateFilter === "resolved") return code === "cerrado" || code === "resuelto";
            return true;
        });
    }, [ticketsToShow, stateFilter]);

    const sortedTicketsToShow = useMemo(() => {
        const list = [...ticketsFilteredByState];
        list.sort((a, b) => {
            const da = new Date(a.created_at || 0).getTime();
            const db = new Date(b.created_at || 0).getTime();
            return sortOrder === "recent" ? db - da : da - db;
        });
        return list;
    }, [ticketsFilteredByState, sortOrder]);

    const isResolved = (t) => {
        const code = t.state?.code?.toLowerCase?.() ?? "";
        return code === "cerrado" || code === "resuelto";
    };
    const isCancelled = (t) => (t.state?.code?.toLowerCase?.() ?? "") === "cancelado";

    const stats = useMemo(() => {
        const total = tickets.length;
        const resolved = tickets.filter(isResolved).length;
        const cancelled = tickets.filter(isCancelled).length;
        return { total, resolved, cancelled };
    }, [tickets]);

    const openCount = useMemo(() => tickets.filter((t) => !isResolved(t) && !isCancelled(t)).length, [tickets]);

    const greeting = useMemo(() => {
        const h = currentTime.getHours();
        if (h >= 5 && h < 12) return "Buenos días";
        if (h >= 12 && h < 19) return "Buenas tardes";
        return "Buenas noches";
    }, [currentTime]);

    const scrollToMisTickets = useCallback(() => {
        refMisTickets.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const top5Types = useMemo(() => {
        const byType = {};
        tickets.forEach((t) => {
            const type = t.ticket_type || t.ticketType;
            const name = type?.name ?? "Sin tipo";
            const id = type?.id ?? name;
            byType[id] = (byType[id] || { label: name, value: 0 });
            byType[id].value += 1;
        });
        return Object.values(byType)
            .sort((a, b) => (b.value || 0) - (a.value || 0))
            .slice(0, 5);
    }, [tickets]);

    const topResolver = useMemo(() => {
        const resolvedTickets = tickets.filter(isResolved);
        const byUser = {};
        resolvedTickets.forEach((t) => {
            const u = t.assigned_user || t.assignedUser;
            const id = u?.id ?? "sin-asignar";
            const name = u?.name ?? "Sin asignar";
            if (!byUser[id]) byUser[id] = { label: name, value: 0 };
            byUser[id].value += 1;
        });
        const arr = Object.values(byUser).sort((a, b) => (b.value || 0) - (a.value || 0));
        return arr[0] || null;
    }, [tickets]);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            {/* Saludo según hora + avatar + nombre + hora + resumen + Ir a mis tickets */}
            <div className="flex flex-wrap items-center gap-4">
                <UserAvatar
                    name={user?.name}
                    avatarPath={user?.avatar_path}
                    size={48}
                    className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-foreground">{greeting}, {user?.name ?? "Usuario"}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        <span className="ml-2 text-foreground/90">
                            · Tienes <strong>{openCount}</strong> {openCount === 1 ? "solicitud abierta" : "solicitudes abiertas"}
                        </span>
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={scrollToMisTickets} className="shrink-0 inline-flex items-center gap-2">
                    <ListChecks className="h-4 w-4" /> Ir a mis tickets
                </Button>
            </div>

            {/* Acción principal: Crear ticket (modal sin salir del dashboard) */}
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Crear ticket
                </Button>
                <p className="text-sm text-muted-foreground">Crea una nueva solicitud o revisa las que ya enviaste.</p>
            </div>

            {/* Actividad reciente: últimas notificaciones (solicitante) */}
            <Card className="border-border/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" /> Actividad reciente
                    </CardTitle>
                    <CardDescription className="text-xs">Últimas notificaciones sobre tus solicitudes.</CardDescription>
                </CardHeader>
                <CardContent>
                    {activityLoading ? (
                        <div className="space-y-2 py-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
                        </div>
                    ) : activityNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <BellOff className="h-10 w-10 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">No hay actividad reciente.</p>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {activityNotifications.map((n) => {
                                const ticketId = n?.data?.ticket_id;
                                const title = activityNotificationTitle(n);
                                const time = activityNotificationTime(n);
                                const content = (
                                    <span className="block text-sm text-foreground/90 py-2 px-3 rounded-md hover:bg-muted/40 transition-colors">
                                        <span className="text-[11px] text-muted-foreground mr-2">{time}</span>
                                        {ticketId && <span className="font-mono text-[11px] text-muted-foreground">#{ticketId}</span>}
                                        <span className="ml-1">{title}</span>
                                    </span>
                                );
                                return ticketId ? (
                                    <li key={n.id}>
                                        <Link to={`/tickets/${ticketId}`} className="block">
                                            {content}
                                        </Link>
                                    </li>
                                ) : (
                                    <li key={n.id}>{content}</li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {/* Cards de métricas del solicitante */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-border/50 bg-card">
                    <CardContent className="p-5 flex items-start justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tickets realizados</p>
                            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
                            <p className="text-[11px] text-muted-foreground/80">Total que has creado</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary bg-primary/10">
                            <Ticket className="h-4.5 w-4.5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-900/50">
                    <CardContent className="p-5 flex items-start justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Resueltos</p>
                            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.resolved}</div>
                            <p className="text-[11px] text-muted-foreground/80">Cerrados o resueltos</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40">
                            <CheckCircle className="h-4.5 w-4.5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-amber-200 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-900/50">
                    <CardContent className="p-5 flex items-start justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Cancelados</p>
                            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.cancelled}</div>
                            <p className="text-[11px] text-muted-foreground/80">Tuyos o que te cancelaron</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40">
                            <XCircle className="h-4.5 w-4.5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-primary/30 bg-primary/5">
                    <CardContent className="p-5 flex items-start justify-between">
                        <div className="space-y-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Quien te resuelve más</p>
                            <div className="text-lg font-bold tracking-tight text-foreground truncate" title={topResolver?.label}>
                                {topResolver ? topResolver.label : "—"}
                            </div>
                            <p className="text-[11px] text-muted-foreground/80">
                                {topResolver ? `${topResolver.value} ticket${topResolver.value !== 1 ? "s" : ""} resueltos` : "Sin datos"}
                            </p>
                        </div>
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary bg-primary/10 shrink-0">
                            <UserCheck className="h-4.5 w-4.5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top 5 tipos de ticket que más manda */}
            {top5Types.length > 0 && (
                <Card className="shadow-sm border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" /> Tipos de ticket que más envías
                        </CardTitle>
                        <CardDescription className="text-xs">Tus 5 categorías más usadas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {top5Types.map((item, idx) => (
                                <li key={idx} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-muted/30">
                                    <span className="font-medium truncate pr-2">{item.label}</span>
                                    <Badge variant="secondary" className="text-xs font-mono">{item.value}</Badge>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Mis tickets: listado y filtros. Calendario único en /calendario (sidebar). */}
            <Card ref={refMisTickets}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Ticket className="h-4 w-4" /> Mis tickets
                        </CardTitle>
                        <CardDescription>
                            Listado de incidencias que has reportado. Para ver el historial por fechas, usa{" "}
                            <Link to="/calendario" className="text-primary underline underline-offset-2 hover:no-underline">
                                Calendario
                            </Link>{" "}
                            en el menú.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {ticketsToShow.length > 0 && (
                            <>
                                <Select value={sortOrder} onValueChange={setSortOrder}>
                                    <SelectTrigger className="w-[180px] h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">Más recientes primero</SelectItem>
                                        <SelectItem value="oldest">Más antiguos primero</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                    </div>
                </CardHeader>
                {ticketsToShow.length > 0 && (
                    <div className="px-6 pb-2 flex flex-wrap gap-1">
                        {[
                            { value: "all", label: "Todos" },
                            { value: "open", label: "Abiertos" },
                            { value: "progress", label: "En progreso" },
                            { value: "resolved", label: "Resueltos" },
                        ].map((tab) => (
                            <Button
                                key={tab.value}
                                type="button"
                                variant={stateFilter === tab.value ? "secondary" : "ghost"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setStateFilter(tab.value)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                )}
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Aún no has creado ninguna solicitud. Cuando lo hagas, aparecerán aquí y en el calendario.
                            </p>
                            <Button type="button" variant="default" size="sm" className="mt-3" onClick={openCreateModal}>
                                Crear mi primer ticket
                            </Button>
                        </div>
                    ) : sortedTicketsToShow.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            Ningún ticket coincide con el filtro.
                            {stateFilter !== "all" && (
                                <Button variant="link" className="ml-1 h-auto p-0" onClick={() => setStateFilter("all")}>
                                    Quitar filtro
                                </Button>
                            )}
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {sortedTicketsToShow.map((t) => {
                                const assigned = t.assigned_user || t.assignedUser;
                                const unassigned = !assigned;
                                const overdue = Boolean(t.is_overdue);
                                const lastAt = t.updated_at || t.created_at;
                                return (
                                    <li key={t.id} className={cn("py-3 first:pt-0", (unassigned || overdue) && "border-l-2 border-l-transparent", unassigned && "border-l-amber-500/50", overdue && "border-l-destructive/50")}>
                                        <Link to={`/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded transition-colors block">
                                            <span className="font-medium text-foreground">#{String(t.id).padStart(5, "0")} — {t.subject}</span>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {unassigned && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400" title="Sin asignar">
                                                        <AlertCircle className="h-3.5 w-3.5" /> Sin asignar
                                                    </span>
                                                )}
                                                {overdue && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-destructive" title="Vencido (SLA)">
                                                        <Clock className="h-3.5 w-3.5" /> Vencido
                                                    </span>
                                                )}
                                                <Badge variant="secondary" className="text-xs">{t.state?.name ?? "—"}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {assigned ? `Atendido por: ${assigned.name}` : ""}
                                                </span>
                                            </div>
                                        </Link>
                                        <p className="text-xs text-muted-foreground mt-1 pl-0">
                                            Creado {new Date(t.created_at).toLocaleDateString()}
                                            {lastAt && (
                                                <span className="ml-2">
                                                    · Última actualización: {relativeTime(lastAt)}
                                                </span>
                                            )}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {/* Modal crear ticket: sin salir del dashboard */}
            <Dialog
                open={createModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setCreateSuccessTicketId(null);
                        setCreateForm(CREATE_FORM_INITIAL);
                    }
                    setCreateModalOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                    {createSuccessTicketId ? (
                        <>
                            <DialogHeader className="p-5 pb-2 bg-emerald-500/10 border-b border-emerald-500/20">
                                <DialogTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="h-5 w-5" /> Solicitud registrada
                                </DialogTitle>
                                <DialogDescription>
                                    Tu solicitud <strong>#{String(createSuccessTicketId).padStart(5, "0")}</strong> fue registrada. Te avisaremos cuando haya novedades.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="p-5 flex flex-wrap items-center gap-2">
                                <Button asChild size="sm">
                                    <Link to={`/tickets/${createSuccessTicketId}`} onClick={() => { setCreateModalOpen(false); setCreateSuccessTicketId(null); setCreateForm(CREATE_FORM_INITIAL); }}>
                                        Ver solicitud
                                    </Link>
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => { setCreateModalOpen(false); setCreateSuccessTicketId(null); setCreateForm(CREATE_FORM_INITIAL); }}>
                                    Cerrar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader className="p-5 pb-2 bg-primary/10 border-b">
                                <DialogTitle className="text-lg flex items-center gap-2">
                                    <Plus className="h-5 w-5" /> Nuevo ticket
                                </DialogTitle>
                                <DialogDescription>Completa los datos para registrar tu solicitud. No sales del inicio.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateSubmit} className="flex flex-col">
                                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                                    <div className="space-y-2">
                                        <Label>Asunto <span className="text-destructive">*</span></Label>
                                        <Input
                                            required
                                            placeholder="Ej: Fallo en impresora de recepción"
                                            value={createForm.subject}
                                            onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                                            disabled={createCatalogsLoading}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo</Label>
                                            <Select value={createForm.ticket_type_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, ticket_type_id: v }))} disabled={createCatalogsLoading}>
                                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                                <SelectContent>
                                                    {(createCatalogs.ticket_types || []).map((t) => (
                                                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Prioridad</Label>
                                            <Select value={createForm.priority_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, priority_id: v }))} disabled={createCatalogsLoading}>
                                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                                <SelectContent>
                                                    {(createCatalogs.priorities || []).map((p) => (
                                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border/50">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3" /> Sede</Label>
                                            <Select value={createForm.sede_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, sede_id: v }))} disabled={createCatalogsLoading}>
                                                <SelectTrigger className="bg-background"><SelectValue placeholder="Sede" /></SelectTrigger>
                                                <SelectContent>
                                                    {(createCatalogs.sedes || []).map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[11px] text-muted-foreground">Elige tu sede o ubicación.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1 text-xs"><User className="w-3 h-3" /> Área responsable <span className="text-destructive">*</span></Label>
                                            <Select value={createForm.area_current_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, area_current_id: v }))} disabled={createCatalogsLoading}>
                                                <SelectTrigger className="bg-background"><SelectValue placeholder="Área que atenderá" /></SelectTrigger>
                                                <SelectContent>
                                                    {(createCatalogs.areas || []).map((a) => (
                                                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[11px] text-muted-foreground">Elige el área que debe atender tu solicitud.</p>
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label className="text-xs">Área de origen (tu área)</Label>
                                            <Select value={createForm.area_origin_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, area_origin_id: v }))} disabled={createCatalogsLoading}>
                                                <SelectTrigger className="bg-background"><SelectValue placeholder="Tu área" /></SelectTrigger>
                                                <SelectContent>
                                                    {(createCatalogs.areas || []).map((a) => (
                                                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[11px] text-muted-foreground">Tu área o departamento.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Descripción del problema</Label>
                                        <Textarea
                                            placeholder="Describe qué ocurrió, cuándo y si hay mensajes de error..."
                                            className="min-h-[100px] resize-y"
                                            value={createForm.description}
                                            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                                            disabled={createCatalogsLoading}
                                        />
                                        <p className="text-[11px] text-muted-foreground/90">No incluyas contraseñas ni datos sensibles en la descripción.</p>
                                    </div>
                                </div>
                                <DialogFooter className="p-4 border-t bg-muted/10 flex-shrink-0">
                                    <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={createSaving}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createSaving || createCatalogsLoading}>
                                        {createSaving ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creando…</span> : <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Crear ticket</span>}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Dashboard intermedio para roles operativos (view_area) sin manage_all.
 * Responde a: "¿Cómo va mi trabajo y qué patrones hay?"
 * Reutiliza métricas existentes (summary, analytics), enlaces a /tickets y /calendario.
 * No duplica calendario ni reemplaza al solicitante.
 */
function DashboardIntermedio() {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [summaryLast7, setSummaryLast7] = useState(null);
    const [summaryLast30, setSummaryLast30] = useState(null);
    const [summaryPrev7, setSummaryPrev7] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        const now = new Date();
        const last7End = new Date(now);
        const last7Start = new Date(now);
        last7Start.setDate(last7Start.getDate() - 7);
        const last30Start = new Date(now);
        last30Start.setDate(last30Start.getDate() - 30);
        const prev7End = new Date(last7Start);
        const prev7Start = new Date(prev7End);
        prev7Start.setDate(prev7Start.getDate() - 7);
        const fmt = (d) => d.toISOString().slice(0, 10);

        try {
            const [sumRes, anaRes, sum7Res, sum30Res, sumPrev7Res] = await Promise.all([
                axios.get("/api/tickets/summary", { params: { assigned_to: "me" } }),
                axios.get("/api/tickets/analytics", { params: { assigned_to: "me" } }),
                axios.get("/api/tickets/summary", { params: { assigned_to: "me", date_from: fmt(last7Start), date_to: fmt(last7End) } }),
                axios.get("/api/tickets/summary", { params: { assigned_to: "me", date_from: fmt(last30Start), date_to: fmt(now) } }),
                axios.get("/api/tickets/summary", { params: { assigned_to: "me", date_from: fmt(prev7Start), date_to: fmt(prev7End) } }),
            ]);
            setSummary(sumRes.data);
            setAnalytics(anaRes.data);
            setSummaryLast7(sum7Res.data);
            setSummaryLast30(sum30Res.data);
            setSummaryPrev7(sumPrev7Res.data);
        } catch (err) {
            setError(err?.response?.data?.message || "Error al cargar métricas");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totalAssigned = summary?.total ?? 0;
    const byState = summary?.by_state ?? [];
    const typesFrequent = analytics?.types_frequent ?? [];
    const topRequesters = analytics?.top_requesters ?? [];
    const avgResolutionHours = analytics?.avg_resolution_hours ?? null;
    const last7Count = summaryLast7?.total ?? 0;
    const last30Count = summaryLast30?.total ?? 0;
    const prev7Count = summaryPrev7?.total ?? 0;
    const trendPct = prev7Count > 0 ? Math.round(((last7Count - prev7Count) / prev7Count) * 100) : (last7Count > 0 ? 100 : 0);

    if (loading && !summary && !analytics) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi trabajo</h1>
                        <p className="text-sm text-muted-foreground">Tickets asignados a ti y patrones recientes.</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-9">
                    <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refrescar
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="flex-1 font-medium">{error}</span>
                    <Button variant="outline" size="sm" className="h-7" onClick={load}>Reintentar</Button>
                </div>
            )}

            {/* Mis tickets */}
            <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Ticket className="h-4 w-4" /> Mis tickets
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Total asignados a ti. Desglose por estado.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="secondary" size="sm" className="h-8 text-xs">
                                <Link to="/tickets?assignment=me">Ver listado</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                <Link to="/calendario">Calendario</Link>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <SummaryMetric label="Total asignados" value={totalAssigned} icon={Ticket} />
                        {byState.slice(0, 5).map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md">
                                <span className="text-xs font-medium text-foreground">{s.label}</span>
                                <Badge variant="secondary" className="text-[10px] font-mono">{s.value}</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Métricas generales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryMetric
                    label="Creados (últimos 7 días)"
                    value={last7Count}
                    icon={Activity}
                    helper="En tu carga asignada"
                />
                <SummaryMetric
                    label="Creados (últimos 30 días)"
                    value={last30Count}
                    icon={Activity}
                    helper="En tu carga asignada"
                />
                <SummaryMetric
                    label="Tiempo promedio resolución"
                    value={avgResolutionHours != null ? `${avgResolutionHours} h` : "—"}
                    icon={Clock}
                    helper="Promedio en tickets ya resueltos"
                />
                <SummaryMetric
                    label="Tendencia (7 días)"
                    value={trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`}
                    icon={TrendingUp}
                    variant={trendPct > 0 ? "default" : trendPct < 0 ? "success" : "default"}
                    helper={prev7Count > 0 ? "vs. 7 días anteriores" : "vs. periodo anterior"}
                />
            </div>

            {/* Tickets más frecuentes + Usuarios que más reportan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricList
                    title="Tickets más frecuentes (por tipo)"
                    icon={Ticket}
                    items={typesFrequent}
                    total={totalAssigned}
                />
                <MetricList
                    title="Usuarios que más tickets reportan"
                    icon={Users}
                    items={topRequesters}
                    total={totalAssigned}
                />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user, can } = useAuth();
    const canManageAll = can("tickets.manage_all");
    const canViewArea = can("tickets.view_area") || canManageAll;
    const canFilterSede = can("tickets.filter_by_sede") || canManageAll;

    const isSolicitanteOnly = !canManageAll && !canViewArea && (can("tickets.create") || can("tickets.view_own"));
    if (isSolicitanteOnly) {
        return <DashboardSolicitante />;
    }
    if (canViewArea && !canManageAll) {
        return <DashboardIntermedio />;
    }

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
