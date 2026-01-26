
import { useEffect, useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

// --- UI COMPONENTS (SHADCN) ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { loadCatalogs } from "@/lib/catalogCache";

// --- ICONS ---
import {
    Loader2, Plus, Filter, Tag, MapPin,
    AlertCircle, CheckCircle2, Clock, Ticket, Flame,
    ChevronLeft, ChevronRight, Search, X
} from "lucide-react";
// ------------------------------------------------------------------
// FILAS MEMOIZADAS
// ------------------------------------------------------------------

const TicketRow = memo(function TicketRow({ ticket }) {
    return (
        <TableRow className="group hover:bg-muted/30 transition-colors">
            <TableCell className="font-mono text-xs font-bold text-primary">
                #{String(ticket.id).padStart(5, '0')}
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-sm text-foreground/90">{ticket.subject}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{ticket.ticket_type?.name}</Badge>
                        <span>•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <StateBadge name={ticket.state?.name} />
            </TableCell>
            <TableCell className="text-center">
                <PriorityBadge name={ticket.priority?.name} />
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-xs">
                    <span className="font-medium">{ticket.assigned_user?.name || ticket.assignedUser?.name || "Sin asignar"}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col text-xs">
                    <span className="font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary/60" /> {ticket.sede?.name}
                    </span>
                    <span className="text-muted-foreground pl-4">{ticket.area_current?.name}</span>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button asChild variant="outline" size="sm" className="h-8 shadow-sm">
                                <Link to={`/tickets/${ticket.id}`}>Gestionar</Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalles y respuestas</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
        </TableRow>
    );
});

const PriorityBadge = memo(({ name }) => {
    const n = name?.toLowerCase() || "";
    const variant = n.includes("urgente") || n.includes("alta") ? "destructive"
        : n.includes("media") ? "default"
            : "secondary";

    return (
        <Badge variant={variant} className="uppercase text-[10px] font-bold tracking-tighter px-2">
            {name}
        </Badge>
    );
});

const StateBadge = memo(({ name }) => {
    const n = name?.toLowerCase() || "";
    let config = { icon: <Clock className="w-3 h-3 mr-1" />, styles: "bg-slate-100 text-slate-600 border-slate-200" };

    if (n.includes("abierto") || n.includes("asignado")) {
        config = { icon: <Ticket className="w-3 h-3 mr-1" />, styles: "bg-blue-100 text-blue-700 border-blue-200" };
    } else if (n.includes("resuelto") || n.includes("cerrado")) {
        config = { icon: <CheckCircle2 className="w-3 h-3 mr-1" />, styles: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    } else if (n.includes("cancel") || n.includes("rechaza")) {
        config = { icon: <AlertCircle className="w-3 h-3 mr-1" />, styles: "bg-red-100 text-red-700 border-red-200" };
    }

    return (
        <Badge variant="outline" className={`font-medium py-0.5 ${config.styles}`}>
            {config.icon} {name}
        </Badge>
    );
});
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

    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [perPage, setPerPage] = useState(() => Number(localStorage.getItem("tickets.perPage")) || 10);
    const [currentPage, setCurrentPage] = useState(1);

    const defaultFilters = { area: "all", sede: "all", type: "all", priority: "all", state: "all", search: "", assignment: "all", assignee: "all" };
    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem("tickets.filters");
        return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    });

    const canManageAll = can("tickets.manage_all");
    const canCreate = can("tickets.create") || canManageAll;
    const canViewArea = can("tickets.view_area") || canManageAll;
    const canFilterSede = can("tickets.filter_by_sede") || canManageAll;
    const canAssign = can("tickets.assign") || canManageAll;

    const areaUsers = catalogs.area_users || [];
    const canUseAssignmentFilters = canViewArea || canAssign;

    const [form, setForm] = useState({
        subject: "", description: "", area_origin_id: "", area_current_id: "",
        sede_id: "", ubicacion_id: "none", ticket_type_id: "", priority_id: "", ticket_state_id: ""
    });

    const loadData = useCallback(async () => {
        setLoading(true);
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
            };

            if (filters.assignment === "me") params.assigned_to = "me";
            if (filters.assignment === "unassigned") params.assigned_status = "unassigned";
            if (filters.assignment === "user" && filters.assignee !== "all") {
                params.assigned_user_id = filters.assignee;
            }

            if (canViewArea && !canManageAll && user?.area_id) params.area_current_id = user.area_id;
            if (!canViewArea && !canManageAll) params.requester = "me";

            const [catalogData, ticketRes] = await Promise.all([
                loadCatalogs(),
                axios.get("/api/tickets", { params }),
            ]);

            setCatalogs(catalogData);
            setTickets(ticketRes.data.data);
            setPagination({
                current_page: ticketRes.data.current_page,
                last_page: ticketRes.data.last_page,
                total: ticketRes.data.total
            });
        } catch (err) {
            console.error(err);
            toast({ title: "Error de conexión", description: "No se pudieron cargar los tickets.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [currentPage, perPage, filters, user, canManageAll, canViewArea]);

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
            toast({ title: "Ticket Creado", description: "El ticket se ha registrado exitosamente." });
            setOpen(false);
            setCurrentPage(1);
            loadData();
        } catch (err) {
            toast({ title: "Error", description: err.response?.data?.message || "Error al crear ticket", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleClearFilters = () => {
        setFilters({ ...defaultFilters });
    };

    const hasActiveFilters = filters.search !== "" || filters.area !== "all" || filters.sede !== "all" || filters.state !== "all" || filters.priority !== "all" || filters.assignment !== "all";

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1800px] mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Tickets</h1>
                    <p className="text-muted-foreground mt-1">Administración y seguimiento de incidencias.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={loadData} disabled={loading} title="Recargar">
                        <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {canCreate && (
                        <Button onClick={handleCreateOpen} className="bg-primary shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Ticket
                        </Button>
                    )}
                </div>
            </div>

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm sticky top-0 z-10 border-b">
                <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                            <Filter className="w-4 h-4" /> Filtros Activos
                        </CardTitle>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs text-destructive hover:bg-destructive/10">
                                <X className="h-3 w-3 mr-1" /> Limpiar filtros
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pb-6">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por asunto, descripción o ID..."
                            className="pl-9 bg-background w-full"
                            value={filters.search}
                            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Estado</Label>
                            <Select value={filters.state} onValueChange={(v) => setFilters(f => ({ ...f, state: v }))}>
                                <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {catalogs.ticket_states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Prioridad</Label>
                            <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
                                <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {catalogs.priorities.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {canViewArea && (
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Área</Label>
                                <Select value={filters.area} onValueChange={(v) => setFilters(f => ({ ...f, area: v }))}>
                                    <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Área" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {canFilterSede && (
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Sede</Label>
                                <Select value={filters.sede} onValueChange={(v) => setFilters(f => ({ ...f, sede: v }))}>
                                    <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Sede" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {catalogs.sedes.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {canUseAssignmentFilters && (
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Asignación</Label>
                                <Select
                                    value={filters.assignment}
                                    onValueChange={(v) => setFilters(f => ({
                                        ...f,
                                        assignment: v,
                                        assignee: v === "user" ? f.assignee : "all",
                                    }))}
                                >
                                    <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Asignación" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="me">Asignado a mí</SelectItem>
                                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                                        <SelectItem value="user">Asignado a...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {canUseAssignmentFilters && filters.assignment === "user" && (
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Responsable</Label>
                                <Select value={filters.assignee} onValueChange={(v) => setFilters(f => ({ ...f, assignee: v }))}>
                                    <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Seleccionar</SelectItem>
                                        {areaUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Tipo</Label>
                            <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
                                <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {catalogs.ticket_types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="shadow-md border-none overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[80px] font-bold">Folio</TableHead>
                            <TableHead className="min-w-[250px] font-bold">Detalle del Ticket</TableHead>
                            <TableHead className="font-bold">Estado</TableHead>
                            <TableHead className="font-bold text-center">Prioridad</TableHead>
                            <TableHead className="font-bold">Responsable</TableHead>
                            <TableHead className="font-bold">Ubicación</TableHead>
                            <TableHead className="text-right font-bold">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Ticket className="w-10 h-10 opacity-20" />
                                        <p className="font-medium">No se encontraron tickets</p>
                                        <p className="text-sm">Prueba ajustando los filtros de búsqueda.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map((t) => (
                                <TicketRow key={t.id} ticket={t} />
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="flex items-center justify-between p-4 border-t bg-muted/10">
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-medium">{tickets.length}</span> de <span className="font-medium">{pagination.total}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs hidden sm:inline">Filas por pág.</span>
                            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-medium w-20 text-center">
                                Pág {currentPage} de {pagination.last_page}
                            </span>
                            <Button
                                variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))}
                                disabled={currentPage === pagination.last_page || loading}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                    <DialogHeader className="p-6 bg-primary text-primary-foreground">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Nuevo Ticket de Soporte
                        </DialogTitle>
                        <DialogDescription className="text-primary-foreground/80">
                            Describe el incidente para que podamos asignarlo al área correcta.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Asunto del Problema <span className="text-red-500">*</span></Label>
                                    <Input
                                        required
                                        placeholder="Ej: Error al imprimir facturas"
                                        value={form.subject}
                                        onChange={e => setForm({ ...form, subject: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Solicitud</Label>
                                    <Select value={form.ticket_type_id} onValueChange={v => setForm({ ...form, ticket_type_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.ticket_types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Prioridad Estimada</Label>
                                    <Select value={form.priority_id} onValueChange={v => setForm({ ...form, priority_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{catalogs.priorities.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Sede Afectada</Label>
                                    <Select value={form.sede_id} onValueChange={v => setForm({ ...form, sede_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar Sede" /></SelectTrigger>
                                        <SelectContent>{catalogs.sedes.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Área Destino (Asignar a) <span className="text-red-500">*</span></Label>
                                    <Select value={form.area_current_id} onValueChange={v => setForm({ ...form, area_current_id: v })}>
                                        <SelectTrigger className="border-primary/40 bg-primary/5 text-primary font-medium"><SelectValue placeholder="Seleccionar Área" /></SelectTrigger>
                                        <SelectContent>{catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Área Solicitante (Origen)</Label>
                                    <Select value={form.area_origin_id} onValueChange={v => setForm({ ...form, area_origin_id: v })}>
                                        <SelectTrigger><SelectValue placeholder="Origen" /></SelectTrigger>
                                        <SelectContent>{catalogs.areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Descripción Detallada</Label>
                                <Textarea
                                    className="min-h-[100px] resize-none focus-visible:ring-primary"
                                    placeholder="Proporciona todos los detalles posibles para agilizar la solución..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saving} className="px-6">
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

