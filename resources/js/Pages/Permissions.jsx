import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { notify } from "@/lib/notify";
import { Trash2, ShieldCheck, Search, Plus, Save, Loader2, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";

const LABELS = {
    "users.manage": "Gestionar usuarios",
    "roles.manage": "Gestionar roles",
    "permissions.manage": "Gestionar permisos",
    "catalogs.manage": "Gestionar catálogos",
    "notifications.manage": "Gestionar notificaciones",
    // SIGUA
    "sigua.dashboard": "Ver dashboard SIGUA",
    "sigua.cuentas.view": "Ver cuentas genéricas",
    "sigua.cuentas.manage": "CRUD cuentas genéricas",
    "sigua.ca01.view": "Ver formatos CA-01",
    "sigua.ca01.manage": "Crear/editar CA-01",
    "sigua.ca01.firmar": "Firmar CA-01",
    "sigua.bitacora.view": "Ver bitácora",
    "sigua.bitacora.registrar": "Registrar en bitácora",
    "sigua.bitacora.sede": "Ver bitácora por sede",
    "sigua.incidentes.view": "Ver incidentes SIGUA",
    "sigua.incidentes.manage": "Gestionar incidentes SIGUA",
    "sigua.importar": "Importar archivos Excel",
    "sigua.cruces": "Ejecutar cruces RH/AD",
    "sigua.reportes": "Generar reportes SIGUA",
};

const formatLabel = (name) => LABELS[name] || name.split('.').pop().replace(/\b\w/g, (c) => c.toUpperCase());

export default function Permissions() {
    const { can } = useAuth();
    const canManagePermissions = can("permissions.manage") || can("roles.manage");
    const canMutate = canManagePermissions;

    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
    const [filter, setFilter] = useState("");
    const [newPermission, setNewPermission] = useState("");
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);

    const selectedRole = useMemo(
        () => roles.find((r) => r.id === selectedRoleId) || null,
        [roles, selectedRoleId]
    );

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [rolesRes, permsRes] = await Promise.all([
                    axios.get("/api/roles"),
                    axios.get("/api/permissions"),
                ]);
                if (cancelled) return;
                setRoles(rolesRes.data || []);
                // Solo permisos del guard "web" para evitar duplicados (mismo nombre en web y sanctum) y IDs incorrectos al guardar
                const allPerms = permsRes.data || [];
                setPermissions(allPerms.filter((p) => p.guard_name === "web"));
                if (!selectedRoleId && rolesRes.data?.length) {
                    setSelectedRoleId(rolesRes.data[0].id);
                }
            } catch (err) {
                if (!handleAuthError(err)) {
                    notify.error(getApiErrorMessage(err, "No se pudieron cargar los permisos"));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!selectedRole) {
            setSelectedPermissionIds([]);
            return;
        }
        const ids = (selectedRole.permissions || []).map((p) => p.id);
        setSelectedPermissionIds(ids);
    }, [selectedRole]);

    // Lógica de agrupación de permisos por categoría
    const groupedPermissions = useMemo(() => {
        const term = filter.trim().toLowerCase();
        const filtered = permissions.filter((p) => {
            const label = formatLabel(p.name).toLowerCase();
            return p.name.toLowerCase().includes(term) || label.includes(term);
        });

        const groups = {};
        filtered.forEach((perm) => {
            const [category] = perm.name.split('.');
            if (!groups[category]) groups[category] = [];
            groups[category].push(perm);
        });
        return groups;
    }, [permissions, filter]);

    const isDirty = useMemo(() => {
        if (!selectedRole) return false;
        const originalIds = (selectedRole.permissions || []).map((p) => p.id).sort((a, b) => a - b);
        const currentIds = [...selectedPermissionIds].sort((a, b) => a - b);
        if (originalIds.length !== currentIds.length) return true;
        return originalIds.some((id, idx) => id !== currentIds[idx]);
    }, [selectedRole, selectedPermissionIds]);

    const togglePermission = (id, checked) => {
        if (!canMutate) return;
        setSelectedPermissionIds((prev) => {
            if (checked) return prev.includes(id) ? prev : [...prev, id];
            return prev.filter((pid) => pid !== id);
        });
    };

    const savePermissions = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await axios.post(`/api/roles/${selectedRole.id}/permissions`, {
                permissions: selectedPermissionIds,
            });
            const mappedPermissions = permissions.filter((p) => selectedPermissionIds.includes(p.id));
            setRoles((prev) => prev.map((role) => role.id === selectedRole.id ? { ...role, permissions: mappedPermissions } : role));
            notify.success("Permisos actualizados con éxito");
        } catch (err) {
            if (!handleAuthError(err)) notify.error(getApiErrorMessage(err, "Error al actualizar"));
        } finally { setSaving(false); }
    };

    const createPermission = async (e) => {
        e.preventDefault();
        if (!canMutate) return;
        const name = newPermission.trim();
        if (name.length < 3) return;
        setCreating(true);
        try {
            const { data } = await axios.post("/api/permissions", { name });
            setPermissions((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewPermission("");
            notify.success("Permiso creado");
        } catch (err) {
            if (!handleAuthError(err)) notify.error(getApiErrorMessage(err, "Error al crear"));
        } finally { setCreating(false); }
    };

    const deletePermission = async (perm) => {
        if (!canMutate) return;
        if (!confirm(`¿Eliminar "${perm.name}"?`)) return;
        try {
            await axios.delete(`/api/permissions/${perm.id}`);
            setPermissions((prev) => prev.filter((p) => p.id !== perm.id));
            setSelectedPermissionIds((prev) => prev.filter((id) => id !== perm.id));
            notify.success("Permiso eliminado");
        } catch (err) {
            if (!handleAuthError(err)) notify.error(getApiErrorMessage(err, "Error al eliminar"));
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Matriz de Permisos</h1>
                        <p className="text-sm text-muted-foreground">Administra el control de acceso por rol.</p>
                    </div>
                </div>
                <form onSubmit={createPermission} className="flex gap-2 w-full md:w-auto">
                    <Input
                        placeholder="ej: users.delete"
                        value={newPermission}
                        onChange={(e) => setNewPermission(e.target.value)}
                        className="max-w-[200px]"
                        disabled={!canMutate}
                    />
                    <Button type="submit" disabled={!canMutate || creating || newPermission.trim().length < 3}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        Nuevo
                    </Button>
                </form>
                {!canMutate && (
                    <Badge variant="secondary" className="uppercase text-[10px]">Solo lectura</Badge>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
                {/* Panel Lateral de Roles */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">Roles del Sistema</h3>
                    <div className="flex flex-col gap-1">
                        {roles.map((role) => (
                            <Button
                                key={role.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRoleId(role.id)}
                                className={`w-full h-auto justify-between px-4 py-2.5 text-sm transition-all ${
                                    role.id === selectedRoleId
                                        ? "bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                                        : "text-muted-foreground font-normal hover:bg-muted hover:text-muted-foreground"
                                }`}
                            >
                                {role.name}
                                {role.id === selectedRoleId && <ChevronRight className="h-4 w-4" />}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Panel Principal de Permisos */}
                <Card className="shadow-md border-muted">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b bg-muted/20">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                {selectedRole?.name}
                                {isDirty && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 animate-pulse">Pendiente de guardar</Badge>}
                            </CardTitle>
                            <CardDescription>Configura las acciones permitidas</CardDescription>
                        </div>
                        <Button onClick={savePermissions} disabled={!canMutate || !selectedRole || !isDirty || saving} size="sm">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Guardar Cambios
                        </Button>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar permiso..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="space-y-8">
                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                <div key={category} className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary/70">{category}</h4>
                                        <Separator className="flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {perms.map((perm) => (
                                            <div key={perm.id} className="group flex items-center justify-between p-3 rounded-lg border border-muted hover:border-primary/20 hover:bg-primary/[0.02] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={selectedPermissionIds.includes(perm.id)}
                                                        onCheckedChange={(val) => togglePermission(perm.id, Boolean(val))}
                                                        disabled={!selectedRole || !canMutate}
                                                        id={`p-${perm.id}`}
                                                    />
                                                    <label htmlFor={`p-${perm.id}`} className="cursor-pointer">
                                                        <div className="text-sm font-medium">{formatLabel(perm.name)}</div>
                                                        <div className="text-[10px] font-mono text-muted-foreground">{perm.name}</div>
                                                    </label>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                                    onClick={() => deletePermission(perm)}
                                                    disabled={!canMutate}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
