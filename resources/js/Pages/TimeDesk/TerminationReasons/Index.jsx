import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Plus, Pencil, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";

const emptyForm = { name: "", description: "", is_active: true };

export default function TerminationReasonsIndex() {
    const { can } = useAuth();
    const canManage = can("attendances.manage");

    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);

    const canSave = form.name.trim().length >= 2;

    const fetchReasons = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/timedesk/termination-reasons");
            setReasons(Array.isArray(data) ? data : []);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudieron cargar los motivos de baja"));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReasons();
    }, [fetchReasons]);

    const resetForm = () => {
        setForm(emptyForm);
        setEditing(null);
    };

    const openCreate = () => {
        resetForm();
        setOpen(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setForm({
            name: item.name,
            description: item.description ?? "",
            is_active: item.is_active ?? true,
        });
        setOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSave) return;
        setSaving(true);
        try {
            if (editing) {
                const { data } = await axios.put(
                    `/api/timedesk/termination-reasons/${editing.id}`,
                    form
                );
                setReasons((prev) => prev.map((r) => (r.id === data.id ? data : r)));
                notify.success("Motivo actualizado");
            } else {
                const { data } = await axios.post("/api/timedesk/termination-reasons", form);
                setReasons((prev) => [data, ...prev]);
                notify.success("Motivo creado");
            }
            setOpen(false);
            resetForm();
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo guardar"));
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (item) => {
        const next = !item.is_active;
        try {
            const { data } = await axios.put(
                `/api/timedesk/termination-reasons/${item.id}`,
                { is_active: next }
            );
            setReasons((prev) => prev.map((r) => (r.id === data.id ? data : r)));
            notify.success(next ? "Motivo activado" : "Motivo desactivado");
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
            }
        }
    };

    const handleDelete = async (item) => {
        if (!confirm(`¿Eliminar el motivo "${item.name}"?`)) return;
        try {
            await axios.delete(`/api/timedesk/termination-reasons/${item.id}`);
            setReasons((prev) => prev.filter((r) => r.id !== item.id));
            notify.success("Motivo eliminado");
        } catch (err) {
            if (!handleAuthError(err)) {
                const msg = err?.response?.data?.message || getApiErrorMessage(err, "No se pudo eliminar");
                notify.error(msg);
            }
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/timedesk">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                            <Clock className="h-8 w-8 text-primary" />
                            Catálogo de Motivos de Baja
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Administre los motivos de baja para el expediente de RH.
                        </p>
                    </div>
                </div>
                {canManage && (
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo motivo
                    </Button>
                )}
            </div>

            <Card className="border-border overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">Nombre</TableHead>
                                <TableHead className="font-bold hidden md:table-cell">Descripción</TableHead>
                                <TableHead className="font-bold w-[100px]">Estado</TableHead>
                                {canManage && (
                                    <TableHead className="text-right font-bold w-[140px]">Acciones</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reasons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 4 : 3} className="text-center text-muted-foreground py-8">
                                        No hay motivos registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reasons.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.name}</TableCell>
                                        <TableCell className="text-muted-foreground hidden md:table-cell max-w-[300px] truncate">
                                            {r.description || "—"}
                                        </TableCell>
                                        <TableCell>
                                            {canManage ? (
                                                <Switch
                                                    checked={!!r.is_active}
                                                    onCheckedChange={() => toggleActive(r)}
                                                />
                                            ) : (
                                                <Badge variant={r.is_active ? "default" : "secondary"}>
                                                    {r.is_active ? "Activo" : "Inactivo"}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        {canManage && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openEdit(r)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(r)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); if (!o) resetForm(); }}>
                <DialogContent className="sm:max-w-md border-border bg-background">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar motivo" : "Nuevo motivo de baja"}</DialogTitle>
                        <DialogDescription>
                            El nombre se mostrará en el modal de Procesar Baja.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tr-name">Nombre</Label>
                            <Input
                                id="tr-name"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Ej. Renuncia"
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tr-desc">Descripción (opcional)</Label>
                            <Textarea
                                id="tr-desc"
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Breve descripción del motivo"
                                rows={2}
                                className="bg-background resize-none"
                            />
                        </div>
                        {editing && (
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="tr-active"
                                    checked={form.is_active}
                                    onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))}
                                />
                                <Label htmlFor="tr-active">Activo</Label>
                            </div>
                        )}
                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={!canSave || saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editing ? "Guardar" : "Crear"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
