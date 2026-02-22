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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";
import { clearCatalogCache } from "@/lib/catalogCache";

const emptyForm = { name: "", is_active: true };

export default function Positions() {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);

    const canSave = useMemo(() => form.name.trim().length >= 3, [form.name]);

    useEffect(() => {
        axios
            .get("/api/positions")
            .then((res) => setPositions(res.data))
            .catch((err) => {
                if (!handleAuthError(err)) {
                    notify.error(getApiErrorMessage(err, "No se pudieron cargar los puestos"));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditing(null);
    };

    const openCreate = () => {
        resetForm();
        setOpen(true);
    };

    const openEdit = (position) => {
        setEditing(position);
        setForm({ name: position.name, is_active: position.is_active });
        setOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSave) return;
        setSaving(true);

        try {
            if (editing) {
                const { data } = await axios.put(`/api/positions/${editing.id}`, form);
                setPositions((prev) => prev.map((p) => (p.id === data.id ? data : p)));
                clearCatalogCache();
                notify.success("Puesto actualizado");
            } else {
                const { data } = await axios.post("/api/positions", form);
                setPositions((prev) => [data, ...prev]);
                clearCatalogCache();
                notify.success("Puesto creado");
            }
            setOpen(false);
            resetForm();
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo guardar el puesto"));
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (position) => {
        const next = !position.is_active;
        try {
            const { data } = await axios.put(`/api/positions/${position.id}`, {
                name: position.name,
                is_active: next,
            });
            setPositions((prev) => prev.map((p) => (p.id === data.id ? data : p)));
            clearCatalogCache();
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo actualizar el estado"));
            }
        }
    };

    const handleDelete = async (position) => {
        const ok = confirm(`¿Eliminar el puesto "${position.name}"?`);
        if (!ok) return;
        try {
            await axios.delete(`/api/positions/${position.id}`);
            setPositions((prev) => prev.filter((p) => p.id !== position.id));
            clearCatalogCache();
            notify.success("Puesto eliminado");
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo eliminar el puesto"));
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Puestos</h1>
                    <p className="text-muted-foreground">Catálogo maestro de puestos.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate}>Crear puesto</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editing ? "Editar puesto" : "Nuevo puesto"}</DialogTitle>
                        </DialogHeader>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="position-name">Nombre</Label>
                                <Input
                                    id="position-name"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Ej. Supervisor, Analista, Coordinador"
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground">Mínimo 3 caracteres.</p>
                            </div>
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                <div>
                                    <p className="text-sm font-medium">Activo</p>
                                    <p className="text-xs text-muted-foreground">Controla si aparece en los formularios.</p>
                                </div>
                                <Switch
                                    checked={form.is_active}
                                    onCheckedChange={(val) => setForm((f) => ({ ...f, is_active: val }))}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setOpen(false);
                                        resetForm();
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={!canSave || saving}>
                                    {saving ? (
                                        <>
                                            <span className="animate-spin mr-2 inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full" aria-hidden />
                                            Guardando...
                                        </>
                                    ) : editing ? "Actualizar" : "Crear"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="w-[160px]">Estado</TableHead>
                            <TableHead className="w-[180px]">Creado</TableHead>
                            <TableHead className="text-right w-[180px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : positions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    No hay puestos registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            positions.map((position) => (
                                <TableRow key={position.id}>
                                    <TableCell className="font-medium">{position.id}</TableCell>
                                    <TableCell>{position.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={position.is_active}
                                                onCheckedChange={() => toggleActive(position)}
                                            />
                                            <Badge variant={position.is_active ? "default" : "secondary"}>
                                                {position.is_active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(position.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(position)}>
                                                Editar
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(position)}>
                                                Eliminar
                                            </Button>
                                        </div>
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
