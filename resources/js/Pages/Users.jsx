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
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { notify } from "@/lib/notify";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { loadCatalogs as fetchCatalogs, clearCatalogCache } from "@/lib/catalogCache";

// --- ICONOS ---
import {
    UserPlus, ShieldCheck, Trash2, Mail, Search,
    SlidersHorizontal, RotateCcw, AlertOctagon,
    Phone, Briefcase, Building2, UserCircle,
    ShieldAlert, AlertTriangle, Filter, X, Loader2, CheckCircle2, Eye
} from "lucide-react";

// --- SCHEMAS ---
// Normaliza vacío/null/undefined para campos opcionales (evita "expected string, received null/undefined")
const emptyToUndefined = (val) => (val === "" || val == null ? undefined : val);

const emailOptionalSchema = z
    .preprocess(emptyToUndefined, z.union([
        z.undefined(),
        z.string().min(1, "Ingresa un correo").email("Correo inválido o dominio incorrecto"),
    ]));

const phoneOptionalSchema = z
    .preprocess(emptyToUndefined, z.union([
        z.undefined(),
        z.string().regex(/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos"),
    ]));

const createFormSchema = z.object({
    employee_number: z.string().min(1, "El número de empleado es requerido"),
    first_name: z.string().min(2, "Nombre(s) muy corto (mín. 2 letras)"),
    paternal_last_name: z.string().min(2, "Apellido paterno requerido (mín. 2 letras)"),
    maternal_last_name: z.string().max(255).optional().or(z.literal("")),
    email: emailOptionalSchema,
    phone: phoneOptionalSchema,
    campaign: z.string().min(1, "Selecciona una campaña"),
    area: z.string().min(1, "Selecciona un área"),
    position: z.string().min(1, "Seleccione un puesto"),
    role_id: z.string().min(1, "Asigna un rol al usuario"),
    password: strongPasswordSchema.optional().or(z.literal("")),
});

const editFormSchema = createFormSchema.extend({
    password: z.string().optional(),
});

// --- COMPONENTE AUXILIAR: STATUS BADGE (compatible tema claro/oscuro) ---
const StatusBadge = ({ status, isBlacklisted }) => {
    if (isBlacklisted) return <Badge variant="destructive" className="gap-1"><AlertOctagon className="h-3 w-3"/> VETADO</Badge>;

    const styles = {
        active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30 hover:bg-emerald-500/25 dark:hover:bg-emerald-500/20",
        pending_admin: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30 hover:bg-amber-500/25 dark:hover:bg-amber-500/20",
        pending_email: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30 hover:bg-blue-500/25 dark:hover:bg-blue-500/20",
        blocked: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20 dark:border-slate-500/30 hover:bg-slate-500/25 dark:hover:bg-slate-500/20",
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

// --- COLUMNAS Y TABLA USUARIOS (TanStack Table) ---
function useUsersTableColumns({ selectedIds, setSelectedIds, renderRowActions, data }) {
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
                cell: ({ row }) => (
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
                meta: {
                    headerClassName: "w-[40px] text-center",
                    className: "w-[40px] text-center",
                },
            },
            {
                id: "identidad",
                header: "Identidad",
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">
                                {user.name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono bg-muted px-1 rounded text-[10px]">
                                    #{user.employee_number}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {user.email}
                                </span>
                            </div>
                        </div>
                    );
                },
                meta: { headerClassName: "font-bold text-xs uppercase tracking-wider" },
            },
            {
                id: "ubicacion",
                header: "Ubicación",
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1 font-semibold text-foreground/80">
                                <Briefcase className="h-3 w-3 opacity-70" />{" "}
                                {user.campaign}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Building2 className="h-3 w-3 opacity-70" />{" "}
                                {user.area}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Building2 className="h-3 w-3 opacity-70" />{" "}
                                {user.sede}
                            </div>
                            {user.ubicacion && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Building2 className="h-3 w-3 opacity-70" />{" "}
                                    {user.ubicacion}
                                </div>
                            )}
                        </div>
                    );
                },
                meta: {
                    headerClassName: "font-bold text-xs uppercase tracking-wider hidden md:table-cell",
                    className: "hidden md:table-cell",
                },
            },
            {
                id: "rolEstado",
                header: "Rol / Estado",
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="flex flex-col items-start gap-1.5">
                            <StatusBadge
                                status={user.status}
                                isBlacklisted={user.is_blacklisted}
                            />
                            <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> {user.position}
                            </span>
                        </div>
                    );
                },
                meta: { headerClassName: "font-bold text-xs uppercase tracking-wider" },
            },
            {
                id: "acciones",
                header: "Acciones",
                cell: ({ row }) => renderRowActions(row.original),
                meta: {
                    headerClassName: "text-right font-bold text-xs uppercase tracking-wider px-6",
                    className: "text-right px-6",
                },
            },
        ],
        [selectedIds, setSelectedIds, renderRowActions, data]
    );
}

function UsersTable({
    data,
    loading,
    selectedIds,
    setSelectedIds,
    renderRowActions,
}) {
    const columns = useUsersTableColumns({
        selectedIds,
        setSelectedIds,
        renderRowActions,
        data,
    });
    return (
        <DataTable
            columns={columns}
            data={data}
            loading={loading}
            getRowId={(row) => row.id}
            selectedIds={selectedIds}
            emptyMessage="No se encontraron resultados"
            emptyColSpan={5}
        />
    );
}

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
            employee_number: "", first_name: "", paternal_last_name: "", maternal_last_name: "",
            email: "", phone: "", campaign: "", area: "", position: "", role_id: "", password: ""
        },
    });

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((vals) => onSubmit(vals, form))} className="space-y-6">

                {/* Sección: Datos Personales */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <UserCircle className="h-4 w-4 shrink-0 text-primary" />
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
                        <FormField control={form.control} name="first_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Nombre(s)</FormLabel>
                                <FormControl><Input {...field} placeholder="Ej. Juan Carlos" className="h-9" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="paternal_last_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Apellido Paterno</FormLabel>
                                <FormControl><Input {...field} placeholder="Ej. Pérez" className="h-9" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="maternal_last_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Apellido Materno (opcional)</FormLabel>
                                <FormControl><Input {...field} placeholder="Ej. García" className="h-9" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Correo Electrónico (opcional)</FormLabel>
                                <FormControl><Input {...field} type="email" placeholder="usuario@empresa.com" className="h-9" value={field.value ?? ""} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold">Teléfono (opcional)</FormLabel>
                                <FormControl><Input {...field} placeholder="10 dígitos" className="h-9" maxLength={10} value={field.value ?? ""} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* Sección: Datos Organizacionales */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Building2 className="h-4 w-4 shrink-0 text-primary" />
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

                <div className="bg-muted/30 dark:bg-muted/20 p-4 rounded-lg border border-border">
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
    const [viewOpen, setViewOpen] = useState(false);
    const [viewUser, setViewUser] = useState(null);
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

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (filters.campaign !== "all") n++;
        if (filters.area !== "all") n++;
        if (filters.role !== "all") n++;
        if (filters.status !== "all") n++;
        if (filters.sede !== "all") n++;
        if (filters.ubicacion !== "all") n++;
        return n;
    }, [filters]);

    const hasActiveFilters = activeFilterCount > 0;

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
        const payload = { ...values };
        if (payload.email === "" || payload.email == null) payload.email = null;
        if (payload.phone === "" || payload.phone == null) payload.phone = null;
        try {
            const { data } = await axios.post("/api/users", payload);
            if (payload.role_id) {
                await axios.post(`/api/users/${data.id || data.user.id}/roles`, { roles: [Number(payload.role_id)] });
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
        const payload = { ...values };
        if (!payload.password) delete payload.password;
        if (approveMode) payload.status = "active";
        if (payload.email === "" || payload.email == null) payload.email = null;
        if (payload.phone === "" || payload.phone == null) payload.phone = null;
        if (!selectedUser) return;
        try {
            await axios.put(`/api/users/${selectedUser.id}`, payload);
            if (payload.role_id) {
                await axios.post(`/api/users/${selectedUser.id}/roles`, { roles: [Number(payload.role_id)] });
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
                        <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                    onClick={() => { setViewUser(user); setViewOpen(true); }}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger><TooltipContent>Ver (solo consulta)</TooltipContent></Tooltip>
                        {user.status === "pending_admin" && (
                            <Tooltip><TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                        onClick={() => { setSelectedUser(user); setApproveMode(true); setEditOpen(true); }}>
                                    <CheckCircle2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger><TooltipContent>Aprobar</TooltipContent></Tooltip>
                        )}
                        <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-muted"
                                    onClick={() => { setSelectedUser(user); setApproveMode(false); setEditOpen(true); }}>
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>

                        <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                    onClick={() => initiateAction('BLACKLIST', user.id)}>
                                <ShieldAlert className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger><TooltipContent>Vetar</TooltipContent></Tooltip>

                        <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-10 gap-2 ${showFilters ? "bg-muted border-primary/30" : ""} ${hasActiveFilters ? "border-primary/50 text-primary" : ""}`}
                        >
                            <Filter className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Filtros</span>
                            {hasActiveFilters && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">
                                    {activeFilterCount}
                                </span>
                            )}
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
                    <div className="px-4 pb-4 pt-0 border-t border-border/60 mt-0">
                        <div className="flex flex-wrap items-center gap-2 pt-4 pb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar por</span>
                            {hasActiveFilters && (
                                <span className="text-xs text-muted-foreground">
                                    ({activeFilterCount} activo{activeFilterCount !== 1 ? "s" : ""})
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-foreground">Campaña</label>
                                <Select value={filters.campaign} onValueChange={(v) => updateFilter('campaign', v)}>
                                    <SelectTrigger className="bg-background h-9 text-sm w-full">
                                        <SelectValue placeholder="Todas las campañas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las campañas</SelectItem>
                                        {catalogs.campaigns.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-foreground">Área</label>
                                <Select value={filters.area} onValueChange={(v) => updateFilter('area', v)}>
                                    <SelectTrigger className="bg-background h-9 text-sm w-full">
                                        <SelectValue placeholder="Todas las áreas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las áreas</SelectItem>
                                        {catalogs.areas.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-foreground">Rol de sistema</label>
                                <Select value={filters.role} onValueChange={(v) => updateFilter('role', v)}>
                                    <SelectTrigger className="bg-background h-9 text-sm w-full">
                                        <SelectValue placeholder="Todos los roles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los roles</SelectItem>
                                        {catalogs.roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-foreground">Sede</label>
                                <Select value={filters.sede} onValueChange={(v) => updateFilter('sede', v)}>
                                    <SelectTrigger className="bg-background h-9 text-sm w-full">
                                        <SelectValue placeholder="Todas las sedes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las sedes</SelectItem>
                                        {catalogs.sedes.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-foreground">Ubicación</label>
                                <Select value={filters.ubicacion} onValueChange={(v) => updateFilter('ubicacion', v)}>
                                    <SelectTrigger className="bg-background h-9 text-sm w-full">
                                        <SelectValue placeholder="Todas las ubicaciones" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las ubicaciones</SelectItem>
                                        {catalogs.ubicaciones
                                            .filter(u => filters.sede === 'all' || u.sede_name === filters.sede)
                                            .map(u => <SelectItem key={u.id} value={u.name}>{u.name}{u.sede_name ? ` · ${u.sede_name}` : ""}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-foreground">Estatus</label>
                                <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
                                    <SelectTrigger className="bg-background h-9 text-sm w-full">
                                        <SelectValue placeholder="Todos los estatus" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estatus</SelectItem>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="pending_admin">Pendiente de aprobación</SelectItem>
                                        <SelectItem value="pending_email">Verificando email</SelectItem>
                                        <SelectItem value="blocked">Bloqueado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {hasActiveFilters && (
                            <div className="flex justify-end pt-3">
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5">
                                    <X className="h-3.5 w-3.5" /> Limpiar todos los filtros
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* TABLA (TanStack Table) */}
            <Card className="overflow-hidden border-border/60 shadow-sm">
                <UsersTable
                    data={filteredUsers}
                    loading={loading}
                    selectedIds={selectedIds}
                    setSelectedIds={setSelectedIds}
                    renderRowActions={renderRowActions}
                />

                {/* PAGINACIÓN: rango visible, total y botones correctamente deshabilitados */}
                <div className="border-t border-border/50 bg-muted/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Mostrar</span>
                        <Select value={perPage} onValueChange={(v) => { setPerPage(v); fetchData(1); }}>
                            <SelectTrigger className="h-8 w-[70px] text-xs bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {["10", "20", "50", "100"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                            {pagination.total === 0
                                ? "0 registros"
                                : (() => {
                                    const from = (pagination.current - 1) * Number(perPage) + 1;
                                    const to = Math.min(pagination.current * Number(perPage), pagination.total);
                                    return to > from ? `${from}–${to} de ${pagination.total}` : `${from} de ${pagination.total}`;
                                })()}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            Página {pagination.current} de {Math.max(1, pagination.last)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current <= 1 || loading || pagination.total === 0}
                            onClick={() => fetchData(pagination.current - 1)}
                            className="h-8 text-xs"
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current >= pagination.last || loading || pagination.total === 0}
                            onClick={() => fetchData(pagination.current + 1)}
                            className="h-8 text-xs"
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </Card>

            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!processing) setConfirmOpen(open); }}>
                <DialogContent className="sm:max-w-md border-border bg-background text-foreground shadow-xl">
                    <DialogHeader className="space-y-2 pb-2">
                        <DialogTitle className="flex items-center gap-2 text-destructive text-lg">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            {actionConfig.type === 'DELETE' ? 'Confirmar Baja' : 'Confirmar Veto'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Acción irreversible para {actionConfig.ids.length} usuarios.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Motivo (mín. 5 caracteres)
                        </label>
                        <Textarea
                            placeholder="Motivo..."
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            className="min-h-[80px] resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <DialogFooter className="flex flex-row gap-3 pt-4 mt-4 border-t border-border">
                        <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={processing} className="min-w-0">
                            Cancelar
                        </Button>
                        <Button
                            variant={actionConfig.type === 'DELETE' ? "destructive" : "default"}
                            onClick={executeAction}
                            disabled={processing || actionReason.length < 5}
                            className="min-w-[120px]"
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal solo consulta: ver usuario */}
            <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setViewUser(null); } }}>
                <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden border-border bg-background text-foreground shadow-xl p-0 gap-0">
                    <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-4 border-b border-border space-y-1.5 text-left">
                        <DialogTitle className="text-xl flex items-center gap-2 text-foreground">
                            <Eye className="h-5 w-5 shrink-0 text-blue-500 dark:text-blue-400" />
                            Ver usuario (solo consulta)
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Información del colaborador. No se pueden editar datos desde esta vista.
                        </DialogDescription>
                    </DialogHeader>
                    {viewUser && (
                        <>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                <div className="px-6 py-5 space-y-5">
                                    <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
                                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                            <span className="font-bold text-lg text-foreground break-words">{viewUser.name}</span>
                                            <span className="text-sm text-muted-foreground font-mono">#{viewUser.employee_number}</span>
                                        </div>
                                        <StatusBadge status={viewUser.status} isBlacklisted={viewUser.is_blacklisted} />
                                    </div>
                                    <dl className="grid grid-cols-1 gap-4 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Correo</dt>
                                            <dd className="flex items-center gap-2 text-foreground"><Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {viewUser.email || "—"}</dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</dt>
                                            <dd className="flex items-center gap-2 text-foreground"><Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {viewUser.phone || "—"}</dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaña</dt>
                                            <dd className="flex items-center gap-2 text-foreground"><Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {viewUser.campaign || "—"}</dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Área</dt>
                                            <dd className="flex items-center gap-2 text-foreground"><Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {viewUser.area || "—"}</dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Puesto</dt>
                                            <dd className="flex items-center gap-2 text-foreground"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {viewUser.position || "—"}</dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sede</dt>
                                            <dd className="flex items-center gap-2 text-foreground"><Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {viewUser.sede || "—"}</dd>
                                        </div>
                                        {viewUser.ubicacion && (
                                            <div className="flex flex-col gap-1">
                                                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ubicación</dt>
                                                <dd className="flex items-center gap-2 text-foreground"><Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {viewUser.ubicacion}</dd>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rol(es)</dt>
                                            <dd className="flex flex-wrap gap-1.5">
                                                {viewUser.roles?.length ? viewUser.roles.map((r) => (
                                                    <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
                                                )) : "—"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                            <DialogFooter className="shrink-0 flex flex-row gap-3 px-6 py-4 border-t border-border bg-muted/30">
                                <Button type="button" variant="outline" onClick={() => { setViewOpen(false); setViewUser(null); }} className="min-w-0">
                                    Cerrar
                                </Button>
                                <Button type="button" variant="default" onClick={() => { setViewOpen(false); setViewUser(null); setSelectedUser(viewUser); setApproveMode(false); setEditOpen(true); }} className="min-w-0">
                                    Ir a editar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={createOpen || editOpen} onOpenChange={(open) => { if(!open) { setCreateOpen(false); setEditOpen(false); setApproveMode(false); } }}>
                <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col overflow-hidden border-border bg-background text-foreground shadow-xl p-0 gap-0">
                    <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-4 border-b border-border space-y-1.5 text-left">
                        <DialogTitle className="text-xl text-foreground">
                            {editOpen ? "Editar Perfil" : "Nuevo Colaborador"}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Ingrese los datos del usuario.
                        </DialogDescription>
                    </DialogHeader>

                    {(createOpen || (editOpen && selectedUser)) && (
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <div className="px-6 py-5">
                                <UserForm
                                    key={editOpen ? selectedUser.id : 'new'}
                                    isEdit={editOpen}
                                    catalogs={catalogs}
                                    onSubmit={editOpen ? handleEditSubmit : handleCreateSubmit}
                                    onCancel={() => { setCreateOpen(false); setEditOpen(false); }}
                                    defaultValues={editOpen ? {
                                        ...selectedUser,
                                        first_name: selectedUser.first_name ?? "",
                                        paternal_last_name: selectedUser.paternal_last_name ?? "",
                                        maternal_last_name: selectedUser.maternal_last_name ?? "",
                                        email: selectedUser.email ?? "",
                                        phone: selectedUser.phone ?? "",
                                        role_id: resolveRoleId(selectedUser.roles, catalogs.roles),
                                        password: ""
                                    } : undefined}
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}









