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
import { toast } from "@/hooks/use-toast";

// Manejo de expiración de sesión
const handleAuthError = (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 419) {
        window.location.href = "/login";
        return true;
    }
    return false;
};

const emptyForm = { name: "", is_active: true };

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);

    const canSave = useMemo(() => form.name.trim().length >= 3, [form.name]);

    // Cargar campañas
    useEffect(() => {
        axios
            .get("/api/campaigns")
            .then((res) => setCampaigns(res.data))
            .catch((err) => {
                console.error(err);
                if (!handleAuthError(err)) {
                    toast({ description: "No se pudieron cargar las campañas", variant: "destructive" });
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

    const openEdit = (campaign) => {
        setEditing(campaign);
        setForm({ name: campaign.name, is_active: campaign.is_active });
        setOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSave) return;
        setSaving(true);

        try {
            if (editing) {
                const { data } = await axios.put(`/api/campaigns/${editing.id}`, form);
                setCampaigns((prev) => prev.map((c) => (c.id === data.id ? data : c)));
                toast({ description: "Campaña actualizada" });
            } else {
                const { data } = await axios.post("/api/campaigns", form);
                setCampaigns((prev) => [data, ...prev]);
                toast({ description: "Campaña creada" });
            }
            setOpen(false);
            resetForm();
        } catch (err) {
            console.error(err);
            if (!handleAuthError(err)) {
                const msg = err?.response?.data?.message || "No se pudo guardar la campaña";
                toast({ description: msg, variant: "destructive" });
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (campaign) => {
        const next = !campaign.is_active;
        try {
            const { data } = await axios.put(`/api/campaigns/${campaign.id}`, {
                name: campaign.name,
                is_active: next,
            });
            setCampaigns((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        } catch (err) {
            console.error(err);
            if (!handleAuthError(err)) {
                toast({ description: "No se pudo actualizar el estado", variant: "destructive" });
            }
        }
    };

    const handleDelete = async (campaign) => {
        const ok = confirm(`¿Eliminar la campaña "${campaign.name}"?`);
        if (!ok) return;
        try {
            await axios.delete(`/api/campaigns/${campaign.id}`);
            setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
            toast({ description: "Campaña eliminada" });
        } catch (err) {
            console.error(err);
            if (!handleAuthError(err)) {
                toast({ description: "No se pudo eliminar la campaña", variant: "destructive" });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Campañas</h1>
                    <p className="text-muted-foreground">Catálogo maestro de campañas activas e inactivas.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate}>Crear campaña</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editing ? "Editar campaña" : "Nueva campaña"}</DialogTitle>
                        </DialogHeader>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="campaign-name">Nombre</Label>
                                <Input
                                    id="campaign-name"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Ej. Onboarding, Retención, Ventas"
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground">Mínimo 3 caracteres.</p>
                            </div>
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                <div>
                                    <p className="text-sm font-medium">Activa</p>
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
                                    {saving ? "Guardando..." : editing ? "Actualizar" : "Crear"}
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
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    Cargando campañas...
                                </TableCell>
                            </TableRow>
                        ) : campaigns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    No hay campañas registradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            campaigns.map((campaign) => (
                                <TableRow key={campaign.id}>
                                    <TableCell className="font-medium">{campaign.id}</TableCell>
                                    <TableCell>{campaign.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={campaign.is_active}
                                                onCheckedChange={() => toggleActive(campaign)}
                                            />
                                            <Badge variant={campaign.is_active ? "default" : "secondary"}>
                                                {campaign.is_active ? "Activa" : "Inactiva"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(campaign)}>
                                                Editar
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(campaign)}>
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
