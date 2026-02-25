import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { strongPasswordSchema } from "@/lib/passwordSchema";

// --- IMPORTACIONES ---
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { notify } from "@/lib/notify";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { loadCatalogs as fetchCatalogs, clearCatalogCache } from "@/lib/catalogCache";

// --- ICONOS ---
import {
    UserPlus, ShieldCheck, Trash2, Mail, Search,
    SlidersHorizontal, RotateCcw, AlertOctagon,
    Phone, Briefcase, Building2, UserCircle,
    ShieldAlert, AlertTriangle, Filter, X, Loader2, CheckCircle2
} from "lucide-react";

// --- SCHEMAS ---
const emailOptionalSchema = z
    .preprocess((val) => (val === "" ? undefined : val), z.string().email("Formato incorrecto"))
    .optional();

const createFormSchema = z.object({
    employee_number: z.string().min(1, "El número de empleado es requerido"),
    name: z.string().min(3, "Nombre muy corto (mínimo 3 letras)"),
    email: z.string().email("Correo inválido"),
    phone: z.string().regex(/^\d{10}$/, "El teléfono debe tener 10 dígitos exactos"),
    campaign: z.string().min(1, "Selecciona una campaña"),
    area: z.string().min(1, "Selecciona un área"),
    position: z.string().min(1, "Seleccione un puesto"),
    role_id: z.string().min(1, "Asigna un rol al usuario"),
    password: strongPasswordSchema.optional().or(z.literal("")),
});

const editFormSchema = createFormSchema.extend({
    email: emailOptionalSchema,
    password: z.string().optional(),
});

// --- COMPONENTE AUXILIAR: STATUS BADGE ---
const StatusBadge = ({ status, isBlacklisted }) => {
    if (isBlacklisted) return <Badge variant="destructive" className="gap-1"><AlertOctagon className="h-3 w-3"/> VETADO</Badge>;

    const styles = {
        active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/25",
        pending_admin: "bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/25",
        pending_email: "bg-blue-500/15 text-blue-600 border-blue-500/20 hover:bg-blue-500/25",
        blocked: "bg-slate-500/15 text-slate-600 border-slate-500/20 hover:bg-slate-500/25",
    };

    const labels = {
        active: "Activo",
        pending_admin: "Pendiente Aprobación",
        pending_email: "Verificando Email",
        blocked: "Bloqueado",
    };

    return (
        <Badge variant="outline" className={`${styles[status] || styles.blocked} uppercase text-[10px] font-bold tracking-wider`}>
            {labels[status] || status}
        </Badge>
    );
};

const resolveRoleId = (userRoles, availableRoles) => {
    const role = userRoles?.[0];
    if (!role) return "";
    const byId = availableRoles.find((r) => String(r.id) === String(role.id));
    if (byId) return String(byId.id);
    const byName = availableRoles.find((r) => r.name === role.name);
    return byName ? String(byName.id) : "";
};

// --- FORMULARIO DE USUARIO ---
function UserForm({ defaultValues, onSubmit, onCancel, catalogs, isEdit = false }) {
    const form = useForm({
        resolver: zodResolver(isEdit ? editFormSchema : createFormSchema),
        defaultValues: defaultValues || {
            employee_number: "", name: "", email: "", phone: "",
            campaign: "", area: "", position: "", role_id: "", password: ""
        },
    });

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((vals) => onSubmit(vals, form))} className="space-y-6">

                {/* Sección: Datos Personales */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <UserCircle className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Información Personal</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="employee_number" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">No. Empleado</FormLabel>
                                <FormControl><Input {...field} placeholder="Ej: 19690" className="h-9" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Nombre Completo</FormLabel>
                                <FormControl><Input {...field} placeholder="Nombre Apellido" className="h-9" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Correo Electrónico</FormLabel>
                                <FormControl><Input {...field} type="email" placeholder="usuario@empresa.com" className="h-9" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Teléfono</FormLabel>
                                <FormControl><Input {...field} placeholder="10 dígitos" className="h-9" maxLength={10} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* Sección: Datos Organizacionales */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Organización y Acceso</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="campaign" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Campaña</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>{catalogs.campaigns.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="area" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Área</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>{catalogs.areas.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="position" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Puesto</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>{catalogs.positions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="sede" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Sede</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>{catalogs.sedes.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="ubicacion" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Ubicación</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="(Opcional)" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {(() => {
                                            const sede = form.getValues("sede");
                                            const filtradas = catalogs.ubicaciones.filter(u => !sede || u.sede_name === sede);
                                            const list = filtradas.length > 0 ? filtradas : catalogs.ubicaciones;
                                            return list.map(u => (
                                                <SelectItem key={u.id} value={u.name}>{u.name} {u.sede_name ? `(${u.sede_name})` : ""}</SelectItem>
                                            ));
                                        })()}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="role_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Rol de Sistema</FormLabel>
                                <Select onValueChange={field.onChange} value={String(field.value)}>
                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>{catalogs.roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3" />
                                {isEdit ? "Cambiar Contraseña" : "Contraseña Inicial"}
                            </FormLabel>
                            <FormControl>
                                <Input type="password" {...field} placeholder={isEdit ? "Dejar vacío para mantener la actual" : "Mínimo 12 caracteres"} className="bg-background h-9" />
                            </FormControl>
                            <FormDescription className="text-[10px]">
                                {isEdit ? "Solo llena este campo si deseas resetear la clave del usuario." : "Debe contener mayúsculas, minúsculas, números y símbolos."}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEdit ? "Actualizar" : "Registrar"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function Users() {
    const [users, setUsers] = useState([]);
    const [catalogs, setCatalogs] = useState({ campaigns: [], areas: [], positions: [], roles: [], sedes: [], ubicaciones: [] });

    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
    const [perPage, setPerPage] = useState(() => localStorage.getItem('users.perPage') || "10");
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [showTrashed, setShowTrashed] = useState(false);
    const [showPendingOnly, setShowPendingOnly] = useState(false);
    const [filters, setFilters] = useState({
        campaign: localStorage.getItem('users.filterCampaign') || "all",
        area: localStorage.getItem('users.filterArea') || "all",
        role: localStorage.getItem('users.filterRole') || "all",
        status: localStorage.getItem('users.filterStatus') || "all",
        sede: localStorage.getItem('users.filterSede') || "all",
        ubicacion: localStorage.getItem('users.filterUbicacion') || "all",
    });
    const [sort, setSort] = useState({ field: "id", dir: "desc" });

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [actionConfig, setActionConfig] = useState({ type: null, ids: [] });
    const [actionReason, setActionReason] = useState("");
    const [processing, setProcessing] = useState(false);
    const [approveMode, setApproveMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const filteredUsers = useMemo(() => (showPendingOnly ? users.filter((u) => u.status === "pending_admin") : users), [showPendingOnly, users]);

    useEffect(() => {
        const loadCatalogsFromCache = async () => {
            try {
                let data = await fetchCatalogs();
                // Si roles o ubicaciones vienen vacíos: limpiar caché y/o cargar desde endpoints específicos
                if (!data.roles?.length) {
                    clearCatalogCache();
                    data = await fetchCatalogs();
                }
                const roles = Array.isArray(data.roles) ? data.roles : [];
                let rolesToSet = roles;
                if (roles.length === 0) {
                    try {
                        const { data: rolesData } = await axios.get("/api/roles");
                        rolesToSet = Array.isArray(rolesData) ? rolesData.map((r) => ({ id: r.id, name: r.name })) : [];
                    } catch (_) {}
                }
                // Ubicaciones: cargar siempre desde GET /api/ubicaciones (accesible con users.manage) para que el dropdown tenga datos
                let ubicacionesToSet = Array.isArray(data.ubicaciones) ? data.ubicaciones : [];
                try {
                    const { data: ubiData } = await axios.get("/api/ubicaciones");
                    const fromApi = Array.isArray(ubiData)
                        ? ubiData.map((u) => ({ id: u.id, name: u.name, sede_id: u.sede_id, sede_name: u.sede?.name ?? "" }))
                        : [];
                    if (fromApi.length > 0) ubicacionesToSet = fromApi;
                } catch (_) {}
                setCatalogs({
                    ...data,
                    roles: rolesToSet,
                    ubicaciones: ubicacionesToSet,
                });
                if (data.sedes?.length) {
                    setFilters((prev) => ({ ...prev, sede: prev.sede === 'all' ? 'all' : data.sedes[0].name }));
                }
            } catch (error) {
                console.error(error);
            }
        };
        loadCatalogsFromCache();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const { data: uRes } = await axios.get("/api/users", {
                params: {
                    page,
                    per_page: perPage,
                    status: showTrashed ? "only" : "",
                    sort: sort.field,
                    direction: sort.dir,
                    search: debouncedSearch || undefined,
                    campaign: filters.campaign === 'all' ? undefined : filters.campaign,
                    area: filters.area === 'all' ? undefined : filters.area,
                    role_id: filters.role === 'all' ? undefined : filters.role,
                    user_status: filters.status === 'all' ? undefined : filters.status,
                    sede: filters.sede === 'all' ? undefined : filters.sede,
                    ubicacion: filters.ubicacion === 'all' ? undefined : filters.ubicacion,
                }
            });
            setUsers(uRes.data || []);
            setPagination({ current: uRes.current_page, last: uRes.last_page, total: uRes.total });
        } catch (err) {
            notify.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, perPage, showTrashed, sort, filters]);

    useEffect(() => { fetchData(1); }, [fetchData]);

    useEffect(() => localStorage.setItem('users.perPage', perPage), [perPage]);
    useEffect(() => {
        localStorage.setItem('users.filterCampaign', filters.campaign);
        localStorage.setItem('users.filterArea', filters.area);
        localStorage.setItem('users.filterRole', filters.role);
        localStorage.setItem('users.filterStatus', filters.status);
        localStorage.setItem('users.filterSede', filters.sede);
        localStorage.setItem('users.filterUbicacion', filters.ubicacion);
    }, [filters]);

    const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
    const clearFilters = () => setFilters({ campaign: "all", area: "all", role: "all", status: "all", sede: "all", ubicacion: "all" });

    const initiateAction = (type, ids = null) => {
        const targetIds = ids ? [ids] : selectedIds;
        if (targetIds.length === 0) return;
        setActionConfig({ type, ids: targetIds });
        setActionReason("");
        setConfirmOpen(true);
    };

    const executeAction = async () => {
        if (actionReason.length < 5) return;
        setProcessing(true);
        try {
            const isDelete = actionConfig.type === 'DELETE';
            const url = isDelete ? '/api/users/mass-delete' : '/api/users/blacklist';
            await axios.post(url, { ids: actionConfig.ids, reason: actionReason, action: 'add' });
            fetchData(pagination.current);
            setSelectedIds([]);
            setConfirmOpen(false);
            notify.success("Acción realizada correctamente");
        } catch (e) {
            notify.error("Error en la operación");
        } finally { setProcessing(false); }
    };

    const mapValidationErrors = (form, error) => {
        const errors = error?.response?.data?.errors || error?.data?.errors;
        if (errors) {
            Object.entries(errors).forEach(([field, messages]) => {
                form.setError(field, { type: 'server', message: messages?.[0] });
            });
        }
    };

    const handleCreateSubmit = async (values, form) => {
        try {
            const { data } = await axios.post("/api/users", values);
            if (values.role_id) {
                await axios.post(`/api/users/${data.id || data.user.id}/roles`, { roles: [Number(values.role_id)] });
            }
            setCreateOpen(false);
            fetchData(1);
            notify.success("Usuario creado correctamente");
        } catch (error) {
            mapValidationErrors(form, error);
            notify.error(error.response?.data?.message || "Error al crear");
        }
    };

    const handleEditSubmit = async (values, form) => {
        if (!values.password) delete values.password;
        if (approveMode) values.status = "active";
        if (!selectedUser) return;
        try {
            await axios.put(`/api/users/${selectedUser.id}`, values);
            if (values.role_id) {
                await axios.post(`/api/users/${selectedUser.id}/roles`, { roles: [Number(values.role_id)] });
            }
            setEditOpen(false);
            setApproveMode(false);
            fetchData(pagination.current);
            notify.success("Usuario actualizado");
        } catch (error) {
            mapValidationErrors(form, error);
            notify.error(error.response?.data?.message || "Error al actualizar");
        }
    };

    const renderRowActions = (user) => (
        // CORREGIDO: Eliminadas clases de opacidad para que sean siempre visibles
        <div className="flex justify-end items-center gap-1">
            {showTrashed ? (
                <>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => axios.post(`/api/users/${user.id}/restore`).then(() => { fetchData(); notify.success("Restaurado"); })}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => { if (confirm("¿Borrar permanentemente?")) axios.delete(`/api/users/${user.id}/force`).then(() => fetchData()); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <TooltipProvider delayDuration={0}>
                    <div className="flex gap-1">
                        {user.status === "pending_admin" && (
                            <Tooltip><TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                        onClick={() => { setSelectedUser(user); setApproveMode(true); setEditOpen(true); }}>
                                    <CheckCircle2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger><TooltipContent>Aprobar</TooltipContent></Tooltip>
                        )}
                        <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-foreground"
                                    onClick={() => { setSelectedUser(user); setApproveMode(false); setEditOpen(true); }}>
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>

                        <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                    onClick={() => initiateAction('BLACKLIST', user.id)}>
                                <ShieldAlert className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger><TooltipContent>Vetar</TooltipContent></Tooltip>

                        <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50"
                                    onClick={() => initiateAction('DELETE', user.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger><TooltipContent>Baja</TooltipContent></Tooltip>
                    </div>
                </TooltipProvider>
            )}
        </div>
    );

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                        {showTrashed ? <Trash2 className="h-8 w-8 text-destructive" /> : <UserCircle className="h-8 w-8 text-primary" />}
                        {showTrashed ? "Papelera" : "Gestión de Personal"}
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        {showTrashed ? "Registros eliminados." : "Administración de usuarios y accesos."}
                    </p>
                </div>

                <div className="flex gap-2">
                    {!showTrashed && (
                        <Button onClick={() => setCreateOpen(true)} className="shadow-lg shadow-primary/20 font-bold">
                            <UserPlus className="h-4 w-4 mr-2" /> Nuevo Colaborador
                        </Button>
                    )}
                </div>
            </div>

            {/* TOOLBAR */}
            <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-1 w-full gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar..."
                                className="pl-9 h-10 bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-muted" : ""}>
                            <Filter className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={showTrashed ? "destructive" : "outline"}
                            onClick={() => { setShowTrashed(!showTrashed); setShowPendingOnly(false); }}
                            className="h-10 w-10 p-0 lg:w-auto lg:px-4"
                        >
                            {showTrashed ? <RotateCcw className="h-4 w-4 lg:mr-2" /> : <Trash2 className="h-4 w-4 lg:mr-2" />}
                            <span className="hidden lg:inline">{showTrashed ? "Activos" : "Papelera"}</span>
                        </Button>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in">
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">{selectedIds.length} sel.</span>
                            <Separator orientation="vertical" className="h-6" />
                            <Button size="sm" variant="destructive" onClick={() => initiateAction('DELETE')} className="h-9">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                            </Button>
                            {!showTrashed && (
                                <Button size="sm" variant="outline" onClick={() => initiateAction('BLACKLIST')} className="h-9 text-amber-600 border-amber-200 hover:bg-amber-50">
                                    <ShieldAlert className="h-3.5 w-3.5 mr-2" /> Vetar
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {showFilters && (
                    <div className="px-4 pb-4 pt-0 grid grid-cols-2 md:grid-cols-7 gap-3 animate-in slide-in-from-top-2">
                        <Select value={filters.campaign} onValueChange={(v) => updateFilter('campaign', v)}>
                            <SelectTrigger className="bg-background h-9 text-xs"><SelectValue placeholder="Campaña" /></SelectTrigger>
                            <SelectContent>{catalogs.campaigns.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filters.area} onValueChange={(v) => updateFilter('area', v)}>
                            <SelectTrigger className="bg-background h-9 text-xs"><SelectValue placeholder="Área" /></SelectTrigger>
                            <SelectContent>{catalogs.areas.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filters.role} onValueChange={(v) => updateFilter('role', v)}>
                            <SelectTrigger className="bg-background h-9 text-xs"><SelectValue placeholder="Rol" /></SelectTrigger>
                            <SelectContent>{catalogs.roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filters.sede} onValueChange={(v) => updateFilter('sede', v)}>
                            <SelectTrigger className="bg-background h-9 text-xs"><SelectValue placeholder="Sede" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {catalogs.sedes.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filters.ubicacion} onValueChange={(v) => updateFilter('ubicacion', v)}>
                            <SelectTrigger className="bg-background h-9 text-xs"><SelectValue placeholder="Ubicación" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {catalogs.ubicaciones
                                    .filter(u => filters.sede === 'all' || u.sede_name === filters.sede)
                                    .map(u => <SelectItem key={u.id} value={u.name}>{u.name} ({u.sede_name})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
                            <SelectTrigger className="bg-background h-9 text-xs"><SelectValue placeholder="Estatus" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Activos</SelectItem>
                                <SelectItem value="pending_admin">Pendientes</SelectItem>
                                <SelectItem value="blocked">Bloqueados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground h-9">
                            <X className="h-3 w-3 mr-1" /> Limpiar
                        </Button>
                    </div>
                )}
            </Card>

            {/* TABLA */}
            <Card className="overflow-hidden border-border/60 shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-[40px] text-center">
                                <Checkbox
                                    checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                                    onCheckedChange={(c) => setSelectedIds(c ? filteredUsers.map(u => u.id) : [])}
                                />
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">Identidad</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">Ubicación</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">Rol / Estado</TableHead>
                            <TableHead className="text-right font-bold text-xs uppercase tracking-wider px-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <div className="bg-muted p-3 rounded-full mb-2">
                                            <Search className="h-6 w-6 opacity-50" />
                                        </div>
                                        <p className="text-sm font-medium">No se encontraron resultados</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className={`group ${selectedIds.includes(user.id) ? "bg-muted/40" : ""}`}>
                                    <TableCell className="text-center">
                                        <Checkbox
                                            checked={selectedIds.includes(user.id)}
                                            onCheckedChange={() => setSelectedIds(prev => prev.includes(user.id) ? prev.filter(i => i !== user.id) : [...prev, user.id])}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground">{user.name}</span>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-mono bg-muted px-1 rounded text-[10px]">#{user.employee_number}</span>
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {user.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <div className="flex items-center gap-1 font-semibold text-foreground/80">
                                                <Briefcase className="h-3 w-3 opacity-70" /> {user.campaign}
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Building2 className="h-3 w-3 opacity-70" /> {user.area}
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Building2 className="h-3 w-3 opacity-70" /> {user.sede}
                                            </div>
                                            {user.ubicacion && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Building2 className="h-3 w-3 opacity-70" /> {user.ubicacion}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col items-start gap-1.5">
                                            <StatusBadge status={user.status} isBlacklisted={user.is_blacklisted} />
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                                                <ShieldCheck className="h-3 w-3"/> {user.position}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        {renderRowActions(user)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* PAGINACIÓN CORREGIDA: Incluye selector de registros */}
                <div className="border-t border-border/50 bg-muted/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Mostrar</span>
                        <Select value={perPage} onValueChange={(v) => { setPerPage(v); fetchData(1); }}>
                            <SelectTrigger className="h-8 w-[70px] text-xs bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {["10", "20", "50", "100"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">de {pagination.total}</span>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button variant="outline" size="sm" disabled={pagination.current <= 1 || loading} onClick={() => fetchData(pagination.current - 1)} className="h-8 text-xs">
                            Anterior
                        </Button>
                        <Button variant="outline" size="sm" disabled={pagination.current >= pagination.last || loading} onClick={() => fetchData(pagination.current + 1)} className="h-8 text-xs">
                            Siguiente
                        </Button>
                    </div>
                </div>
            </Card>

            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!processing) setConfirmOpen(open); }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            {actionConfig.type === 'DELETE' ? 'Confirmar Baja' : 'Confirmar Veto'}
                        </DialogTitle>
                        <DialogDescription>
                            Acción irreversible para {actionConfig.ids.length} usuarios.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Motivo (Min. 5 caracteres)</label>
                        <Textarea
                            placeholder="Motivo..."
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={processing}>Cancelar</Button>
                        <Button
                            variant={actionConfig.type === 'DELETE' ? "destructive" : "default"}
                            onClick={executeAction}
                            disabled={processing || actionReason.length < 5}
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={createOpen || editOpen} onOpenChange={(open) => { if(!open) { setCreateOpen(false); setEditOpen(false); setApproveMode(false); } }}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            {editOpen ? "Editar Perfil" : "Nuevo Colaborador"}
                        </DialogTitle>
                        <DialogDescription>
                            Ingrese los datos del usuario.
                        </DialogDescription>
                    </DialogHeader>

                    {(createOpen || (editOpen && selectedUser)) && (
                        <UserForm
                            key={editOpen ? selectedUser.id : 'new'}
                            isEdit={editOpen}
                            catalogs={catalogs}
                            onSubmit={editOpen ? handleEditSubmit : handleCreateSubmit}
                            onCancel={() => { setCreateOpen(false); setEditOpen(false); }}
                            defaultValues={editOpen ? {
                                ...selectedUser,
                                email: selectedUser.email ?? "",
                                role_id: resolveRoleId(selectedUser.roles, catalogs.roles),
                                password: ""
                            } : undefined}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}









