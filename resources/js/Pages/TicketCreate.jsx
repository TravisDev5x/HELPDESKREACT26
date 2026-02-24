import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { loadCatalogs, clearCatalogCache } from "@/lib/catalogCache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { ArrowLeft, Plus, Loader2, CheckCircle2, MapPin, User } from "lucide-react";

export default function TicketCreate() {
    const { user, can } = useAuth();
    const navigate = useNavigate();
    const [catalogs, setCatalogs] = useState({
        areas: [], sedes: [], priorities: [], ticket_states: [], ticket_types: [],
    });
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        subject: "",
        description: "",
        sede_id: "",
        area_origin_id: "",
        area_current_id: "",
        ticket_type_id: "",
        priority_id: "",
        ticket_state_id: "",
    });

    useEffect(() => {
        let mounted = true;
        loadCatalogs()
            .then((data) => { if (mounted) setCatalogs(data); })
            .catch(() => { if (mounted) notify.error("No se pudieron cargar los catálogos"); })
            .finally(() => { if (mounted) setLoadingCatalogs(false); });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (loadingCatalogs || catalogs.ticket_states?.length === 0) return;
        const openState = catalogs.ticket_states.find((s) => (s.code || "").toLowerCase() === "abierto") || catalogs.ticket_states[0];
        setForm((prev) => ({
            ...prev,
            sede_id: prev.sede_id || String(user?.sede_id || user?.sede?.id || ""),
            area_origin_id: prev.area_origin_id || String(user?.area_id || ""),
            ticket_type_id: prev.ticket_type_id || String(catalogs.ticket_types?.[0]?.id || ""),
            priority_id: prev.priority_id || String(catalogs.priorities?.[0]?.id || ""),
            ticket_state_id: String(openState?.id || ""),
        }));
    }, [loadingCatalogs, catalogs.ticket_states, catalogs.ticket_types, catalogs.priorities, user?.sede_id, user?.sede?.id, user?.area_id]);

    const isSolicitanteOnly = !can("tickets.manage_all") && !can("tickets.view_area");
    const backTo = isSolicitanteOnly ? "/" : "/tickets";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject?.trim()) {
            notify.error("El asunto es obligatorio");
            return;
        }
        if (!form.sede_id || !form.area_origin_id || !form.area_current_id || !form.ticket_type_id || !form.priority_id || !form.ticket_state_id) {
            notify.error("Completa todos los campos obligatorios");
            return;
        }
        setSaving(true);
        try {
            const now = new Date().toISOString();
            const payload = {
                subject: form.subject.trim(),
                description: form.description?.trim() || null,
                sede_id: Number(form.sede_id),
                area_origin_id: Number(form.area_origin_id),
                area_current_id: Number(form.area_current_id),
                priority_id: Number(form.priority_id),
                ticket_type_id: Number(form.ticket_type_id),
                ticket_state_id: Number(form.ticket_state_id),
                created_at: now,
            };
            const { data } = await axios.post("/api/tickets", payload);
            clearCatalogCache();
            notify.success("Ticket creado correctamente");
            if (data?.id) {
                navigate(`/tickets/${data.id}`, { replace: true });
            } else if (isSolicitanteOnly) {
                navigate("/", { replace: true });
            } else {
                navigate("/tickets", { replace: true });
            }
        } catch (err) {
            notify.error(err?.response?.data?.message || "Error al crear el ticket");
        } finally {
            setSaving(false);
        }
    };

    if (loadingCatalogs) {
        return (
            <div className="w-full max-w-2xl mx-auto p-4 md:p-6 space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link to={backTo}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="bg-primary/10 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Plus className="h-5 w-5" /> Nuevo ticket
                    </CardTitle>
                    <CardDescription>Completa los datos para registrar tu solicitud.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label>Asunto <span className="text-destructive">*</span></Label>
                            <Input
                                required
                                placeholder="Ej: Fallo en impresora de recepción"
                                value={form.subject}
                                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de ticket</Label>
                                <Select value={form.ticket_type_id} onValueChange={(v) => setForm({ ...form, ticket_type_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.ticket_types || []).map((t) => (
                                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Prioridad</Label>
                                <Select value={form.priority_id} onValueChange={(v) => setForm({ ...form, priority_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.priorities || []).map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border border-border/50">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Sede</Label>
                                <Select value={form.sede_id} onValueChange={(v) => setForm({ ...form, sede_id: v })}>
                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar sede" /></SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.sedes || []).map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1"><User className="w-3 h-3" /> Área responsable <span className="text-destructive">*</span></Label>
                                <Select value={form.area_current_id} onValueChange={(v) => setForm({ ...form, area_current_id: v })}>
                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Área que atenderá" /></SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.areas || []).map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Área de origen (solicitante)</Label>
                                <Select value={form.area_origin_id} onValueChange={(v) => setForm({ ...form, area_origin_id: v })}>
                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Tu área" /></SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.areas || []).map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción del problema</Label>
                            <Textarea
                                placeholder="Describe qué ocurrió, cuándo y si hay mensajes de error..."
                                className="min-h-[120px] resize-y"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t p-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" asChild>
                            <Link to={backTo}>Cancelar</Link>
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Crear ticket
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
