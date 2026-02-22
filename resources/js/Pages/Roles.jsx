import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";

export default function Roles() {
    const { can } = useAuth();
    const canManageRoles = can("roles.manage");

    // -----------------------------
    // State
    // -----------------------------
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    // -----------------------------
    // Derived state
    // -----------------------------
    const canSave = useMemo(() => name.trim().length >= 3, [name]);

    // -----------------------------
    // Fetch roles (GET)
    // -----------------------------
    useEffect(() => {
        axios
            .get("/api/roles")
            .then((res) => setRoles(res.data))
            .catch((err) => {
                if (!handleAuthError(err)) {
                    notify.error(getApiErrorMessage(err, "No se pudieron cargar los roles"));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    // -----------------------------
    // Create role (POST)
    // -----------------------------
    async function onCreateRole(e) {
        e.preventDefault();
        if (!canManageRoles || !canSave) return;

        setSaving(true);

        try {
            // axios ya maneja CSRF (XSRF-TOKEN) al estar logueado
            const { data } = await axios.post("/api/roles", { name });
            setRoles((prev) => [data, ...prev]);

            setName("");
            setOpen(false);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo crear el rol"));
            }
        } finally {
            setSaving(false);
        }
    }

    // -----------------------------
    // Delete role (DELETE)
    // -----------------------------
    async function onDeleteRole(id) {
        if (!canManageRoles) return;
        const ok = confirm("¿Eliminar este rol?");
        if (!ok) return;

        try {
            await axios.delete(`/api/roles/${id}`);

            setRoles((prev) => prev.filter((r) => r.id !== id));
            notify.success("Rol eliminado correctamente");
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo eliminar el rol"));
            }
        }
    }

    // -----------------------------
    // Render
    // -----------------------------
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Roles
                    </h1>
                    <p className="text-muted-foreground">
                        Administra los roles del sistema.
                    </p>
                </div>

                {/* Create Role Dialog */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!canManageRoles}>Crear rol</Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nuevo rol</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={onCreateRole} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="role-name">Nombre</Label>
                                <Input
                                    id="role-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Admin, Editor, Soporte..."
                                    autoFocus
                                    disabled={!canManageRoles}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mínimo 3 caracteres. El slug se genera en el
                                    backend.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setOpen(false);
                                        setName("");
                                    }}
                                    disabled={!canManageRoles}
                                >
                                    Cancelar
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={!canManageRoles || !canSave || saving}
                                >
                                    {saving ? "Guardando..." : "Crear"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead className="w-[160px]">Creado</TableHead>
                            <TableHead className="text-right w-[120px]">
                                Acciones
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-muted-foreground py-10"
                                >
                                    Cargando roles...
                                </TableCell>
                            </TableRow>
                        ) : roles.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-muted-foreground py-10"
                                >
                                    No hay roles todavía.
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium">
                                        {role.id}
                                    </TableCell>
                                    <TableCell>{role.name}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {role.slug}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(
                                            role.created_at
                                        ).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => onDeleteRole(role.id)}
                                            disabled={!canManageRoles}
                                        >
                                            Eliminar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

