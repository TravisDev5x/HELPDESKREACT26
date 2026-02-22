import { useEffect, useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/date-picker-field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notify";
import { loadCatalogs } from "@/lib/catalogCache";
import { cn } from "@/lib/utils";

import {
    Loader2, Plus, Filter,
    AlertTriangle, CheckCircle2, Clock, ShieldAlert,
    ChevronLeft, ChevronRight, Search, X, Building2, ArrowRightCircle
} from "lucide-react";

const IncidentRow = memo(function IncidentRow({ incident }) {
    const status = incident.incident_status || incident.incidentStatus;
    const severity = incident.incident_severity || incident.incidentSeverity;
    const type = incident.incident_type || incident.incidentType;
    const assignedUser = incident.assigned_user || incident.assignedUser;
    const needsAttention = !assignedUser;

    return (
        <TableRow className="group hover:bg-muted/40 transition-colors border-b border-border/50">
            <TableCell className="w-[80px]">
                <div className="font-mono text-xs font-bold text-primary/80 bg-primary/5 py-1 px-2 rounded text-center">
                    #{String(incident.id).padStart(5, "0")}
                </div>
            </TableCell>
            <TableCell className="max-w-[300px]">
                <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-sm text-foreground truncate pr-4" title={incident.subject}>
                        {incident.subject}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal rounded-sm border-muted-foreground/30">
                            {type?.name}
                        </Badge>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(incident.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <StatusBadge status={status} />
            </TableCell>
            <TableCell className="text-center">
                <SeverityBadge severity={severity} />
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-xs gap-0.5">
                    {assignedUser ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                {(assignedUser?.name || "?").charAt(0)}
                            </div>
                            <span className="font-medium text-foreground/90 truncate max-w-[120px]">
                                {assignedUser?.name}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground italic pl-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-orange-400" /> Sin asignar
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-xs gap-1">
                    <span className="font-medium flex items-center gap-1.5 text-foreground/80">
                        <Building2 className="w-3 h-3 text-muted-foreground" /> {incident.sede?.name}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-right pr-4">
                <Button
                    asChild
                    variant={needsAttention ? "default" : "secondary"}
                    size="sm"
                    className={cn(
                        "h-8 text-xs font-semibold shadow-sm transition-all",
                        needsAttention
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                            : "bg-secondary/50 hover:bg-primary hover:text-primary-foreground border border-border/50"
                    )}
                >
                    <Link to={`/incidents/${incident.id}`} className="flex items-center gap-2">
                        <span>Gestionar</span>
                        <ArrowRightCircle className="w-3.5 h-3.5 opacity-70" />
                    </Link>
                </Button>
            </TableCell>
        </TableRow>
    );
});

const SeverityBadge = memo(({ severity }) => {
    const level = Number(severity?.level);
    let styles = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    if (Number.isFinite(level)) {
        if (level >= 4) styles = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
        else if (level >= 3) styles = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
        else if (level >= 2) styles = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }

    return (
        <Badge variant="outline" className={`uppercase text-[10px] font-bold tracking-tight px-2 py-0.5 border ${styles}`}>
            {severity?.name}
        </Badge>
    );
});

const StatusBadge = memo(({ status }) => {
    const code = (status?.code || "").toLowerCase();
    let config = {
        icon: <Clock className="w-3 h-3 mr-1.5" />,
        styles: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
    };

    if (status?.is_final) {
        config = {
            icon: <CheckCircle2 className="w-3 h-3 mr-1.5" />,
            styles: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        };
    } else if (code.includes("cancel") || code.includes("rechaz")) {
        config = {
            icon: <AlertTriangle className="w-3 h-3 mr-1.5" />,
            styles: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
        };
    } else {
        config = {
            icon: <ShieldAlert className="w-3 h-3 mr-1.5" />,
            styles: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        };
    }

    return (
        <Badge variant="outline" className={`font-medium py-0.5 pl-2 pr-2.5 border ${config.styles}`}>
            {config.icon} {status?.name}
        </Badge>
    );
});

export default function Incidents() {
    const { user, can } = useAuth();

    const [incidents, setIncidents] = useState([]);
    const [catalogs, setCatalogs] = useState({
        areas: [], sedes: [], incident_types: [], incident_severities: [], incident_statuses: [], area_users: []
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);

    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [perPage, setPerPage] = useState(() => Number(localStorage.getItem("incidents.perPage")) || 10);
    const [currentPage, setCurrentPage] = useState(1);

    const defaultFilters = { area: "all", sede: "all", type: "all", severity: "all", status: "all", search: "", assignment: "all", assignee: "all" };
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem("incidents.filters");
        return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    });

    const canManageAll = can("incidents.manage_all");
    const canCreate = can("incidents.create") || canManageAll;
    const canViewArea = can("incidents.view_area") || canManageAll;
    const canFilterSede = can("incidents.filter_by_sede") || canManageAll;
    const canAssign = can("incidents.assign") || canManageAll;

    const areaUsers = catalogs.area_users || [];
    const canUseAssignmentFilters = canViewArea || canAssign;

    const [form, setForm] = useState({
        subject: "",
        description: "",
        occurred_at: "",
        enabled_at: "",
        area_id: "",
        sede_id: "",
        incident_type_id: "",
        incident_severity_id: "",
        incident_status_id: "",
        involved_user_id: "none",
        assigned_user_id: "none",
    });
    const [attachments, setAttachments] = useState([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                per_page: perPage,
                search: filters.search,
                ...(filters.area !== "all" && { area_id: filters.area }),
                ...(filters.sede !== "all" && { sede_id: filters.sede }),
                ...(filters.type !== "all" && { incident_type_id: filters.type }),
                ...(filters.severity !== "all" && { incident_severity_id: filters.severity }),
                ...(filters.status !== "all" && { incident_status_id: filters.status }),
            };

            if (filters.assignment === "me") params.assigned_to = "me";
            if (filters.assignment === "unassigned") params.assigned_status = "unassigned";
            if (filters.assignment === "user" && filters.assignee !== "all") {
                params.assigned_user_id = filters.assignee;
            }

            const [catalogResult, incidentResult] = await Promise.allSettled([
                loadCatalogs(),
                axios.get("/api/incidents", { params }),
            ]);

            if (catalogResult.status === "fulfilled") {
                setCatalogs(catalogResult.value);
            } else {
                notify.error({ title: "Catalogos no disponibles", description: "No se pudieron cargar los catalogos." });
            }

            if (incidentResult.status === "fulfilled") {
                setIncidents(incidentResult.value.data.data);
                setPagination({
                    current_page: incidentResult.value.data.current_page,
                    last_page: incidentResult.value.data.last_page,
                    total: incidentResult.value.data.total
                });
            } else {
                notify.error({ title: "Error de conexion", description: "No se pudieron cargar las incidencias." });
            }
        } catch (err) {
            console.error(err);
            notify.error({ title: "Error de conexion", description: "No se pudieron cargar las incidencias." });
        } finally {
            setLoading(false);
        }
    }, [currentPage, perPage, filters]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        localStorage.setItem("incidents.filters", JSON.stringify(filters));
        localStorage.setItem("incidents.perPage", String(perPage));
    }, [filters, perPage]);

    const handleCreateOpen = () => {
        setForm({
            subject: "",
            description: "",
            occurred_at: "",
            enabled_at: "",
            area_id: String(user?.area_id || catalogs.areas[0]?.id || ""),
            sede_id: String(user?.sede?.id || catalogs.sedes[0]?.id || ""),
            incident_type_id: String(catalogs.incident_types[0]?.id || ""),
            incident_severity_id: String(catalogs.incident_severities[0]?.id || ""),
            incident_status_id: String(catalogs.incident_statuses[0]?.id || ""),
            involved_user_id: "none",
            assigned_user_id: "none",
        });
        setAttachments([]);
        setOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.enabled_at) {
            notify.error({ title: "Dato requerido", description: "Selecciona la fecha de habilitacion." });
            return;
        }
        setSaving(true);
        try {
            const payload = new FormData();
            payload.append("subject", form.subject);
            payload.append("description", form.description || "");
            if (form.occurred_at) payload.append("occurred_at", form.occurred_at);
            payload.append("enabled_at", form.enabled_at);
            payload.append("area_id", form.area_id);
            payload.append("sede_id", form.sede_id);
            payload.append("incident_type_id", form.incident_type_id);
            payload.append("incident_severity_id", form.incident_severity_id);
            payload.append("incident_status_id", form.incident_status_id);
            if (form.involved_user_id !== "none") payload.append("involved_user_id", form.involved_user_id);
            if (form.assigned_user_id !== "none") payload.append("assigned_user_id", form.assigned_user_id);
            attachments.forEach((file) => payload.append("attachments[]", file));

            await axios.post("/api/incidents", payload, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            notify.success({ title: "Incidencia creada", description: "La incidencia se registro correctamente." });
            setOpen(false);
            setCurrentPage(1);
            loadData();
        } catch (err) {
            notify.error({ title: "Error", description: err.response?.data?.message || "Error al crear incidencia" });
        } finally {
            setSaving(false);
        }
    };

    const handleClearFilters = () => {
        setFilters({ ...defaultFilters });
    };

    const hasActiveFilters = filters.search !== ""
        || filters.area !== "all"
        || filters.sede !== "all"
        || filters.type !== "all"
        || filters.severity !== "all"
        || filters.status !== "all"
        || filters.assignment !== "all"
        || (filters.assignment === "user" && filters.assignee !== "all");

    const activeFilterCount = [
        filters.search,
        filters.area !== "all",
        filters.sede !== "all",
        filters.type !== "all",
        filters.severity !== "all",
        filters.status !== "all",
        filters.assignment !== "all",
        filters.assignment === "user" && filters.assignee !== "all",
    ].filter(Boolean).length;

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Incidencias</h1>
                        <p className="text-sm text-muted-foreground">Reportes operativos y recursos humanos.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadData} disabled={loading} title="Actualizar">
                        <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    {canCreate && (
                        <Button onClick={handleCreateOpen} className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Nueva Incidencia
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
            <Card className="border border-border/50 shadow-sm bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por asunto, descripción o ID..."
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

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Estado" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    {catalogs.incident_statuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={filters.severity} onValueChange={(v) => setFilters(f => ({ ...f, severity: v }))}>
                                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Severidad" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las severidades</SelectItem>
                                    {catalogs.incident_severities.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
                                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    {catalogs.incident_types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
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

                            {canFilterSede && (
                                <Select value={filters.sede} onValueChange={(v) => setFilters(f => ({ ...f, sede: v }))}>
                                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Sede" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las sedes</SelectItem>
                                        {catalogs.sedes.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
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
                                        <SelectItem value="me">Mis incidencias</SelectItem>
                                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                                        <SelectItem value="user">Por usuario...</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {canUseAssignmentFilters && filters.assignment === "user" && (
                                <Select value={filters.assignee} onValueChange={(v) => setFilters(f => ({ ...f, assignee: v }))}>
                                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Responsable" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {areaUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm overflow-hidden bg-card">
                <div className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-b border-border/50 hover:bg-transparent">
                                <TableHead className="w-[80px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">Folio</TableHead>
                                <TableHead className="min-w-[280px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Detalle</TableHead>
                                <TableHead className="w-[140px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                                <TableHead className="w-[110px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center">Severidad</TableHead>
                                <TableHead className="min-w-[150px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Responsable</TableHead>
                                <TableHead className="min-w-[160px] font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Sede</TableHead>
                                <TableHead className="w-[120px] text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7} className="h-16 px-4">
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
                            ) : incidents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                            <div className="p-4 bg-muted/20 rounded-full">
                                                <AlertTriangle className="w-8 h-8 opacity-40" />
                                            </div>
                                            <p className="font-medium">No se encontraron incidencias</p>
                                            <p className="text-xs max-w-xs text-center">
                                                Intenta cambiar los filtros o realiza una nueva búsqueda.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                incidents.map((i) => (
                                    <IncidentRow key={i.id} incident={i} />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <CardFooter className="border-t border-border/50 px-4 py-3 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        Mostrando <span className="font-medium text-foreground">{incidents.length}</span> de <span className="font-medium text-foreground">{pagination.total}</span> incidencias
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
                </CardFooter>
            </Card>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 shadow-xl border border-border/60">
                    <DialogHeader className="p-6 pb-4 border-b border-border/50">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" /> Nueva Incidencia
                        </DialogTitle>
                        <DialogDescription>
                            Registra un evento operativo o de recursos humanos.
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
                                        placeholder="Ej: Incidencia en area de almacenes"
                                        value={form.subject}
                                        onChange={e => setForm({ ...form, subject: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo</Label>
                                    <Select value={form.incident_type_id} onValueChange={v => setForm({ ...form, incident_type_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.incident_types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Severidad</Label>
                                    <Select value={form.incident_severity_id} onValueChange={v => setForm({ ...form, incident_severity_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.incident_severities.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Estado</Label>
                                    <Select value={form.incident_status_id} onValueChange={v => setForm({ ...form, incident_status_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.incident_statuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-muted/20 p-4 rounded-lg border border-border/50">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Sede</Label>
                                    <Select value={form.sede_id} onValueChange={v => setForm({ ...form, sede_id: v })}>
                                        <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar Sede" /></SelectTrigger>
                                        <SelectContent>{catalogs.sedes.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Area</Label>
                                    <Select value={form.area_id} onValueChange={v => setForm({ ...form, area_id: v })}>
                                        <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar Area" /></SelectTrigger>
                                        <SelectContent>{catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha del incidente</Label>
                                    <DatePickerField
                                        value={form.occurred_at}
                                        onChange={(v) => setForm({ ...form, occurred_at: v })}
                                        placeholder="Seleccionar fecha"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha de habilitacion <span className="text-destructive">*</span></Label>
                                    <DatePickerField
                                        value={form.enabled_at}
                                        onChange={(v) => setForm({ ...form, enabled_at: v })}
                                        placeholder="Seleccionar fecha"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Involucrado (opcional)</Label>
                                    <Select value={form.involved_user_id} onValueChange={v => setForm({ ...form, involved_user_id: v })}>
                                        <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin involucrado</SelectItem>
                                            {areaUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {canAssign && (
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Responsable (opcional)</Label>
                                        <Select value={form.assigned_user_id} onValueChange={v => setForm({ ...form, assigned_user_id: v })}>
                                            <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin responsable</SelectItem>
                                                {areaUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Descripción</Label>
                                <Textarea
                                    className="min-h-[120px] resize-none bg-muted/10 focus:bg-background transition-colors"
                                    placeholder="Describe la incidencia y el contexto..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Evidencias (opcional)</Label>
                                <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                                />
                                {attachments.length > 0 && (
                                    <p className="text-xs text-muted-foreground">{attachments.length} archivo(s) seleccionado(s)</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="p-4 border-t border-border/50 bg-muted/10">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Crear incidencia
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
