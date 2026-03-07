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
import { ArrowLeft, Plus, Loader2, CheckCircle2, MapPin, User, Gauge } from "lucide-react";

export default function TicketCreate() {
    const { user, can } = useAuth();
    const navigate = useNavigate();
    const [catalogs, setCatalogs] = useState({
        areas: [], sedes: [], priorities: [], impact_levels: [], urgency_levels: [], priority_matrix: [], ticket_states: [], ticket_types: [],
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
        impact_level_id: "",
        urgency_level_id: "",
        ticket_state_id: "",
    });

    useEffect(() => {
        let mounted = true;
        loadCatalogs(true, ["core", "tickets"])
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
            impact_level_id: prev.impact_level_id || String(catalogs.impact_levels?.[0]?.id || ""),
            urgency_level_id: prev.urgency_level_id || String(catalogs.urgency_levels?.[0]?.id || ""),
            ticket_state_id: String(openState?.id || ""),
        }));
    }, [loadingCatalogs, catalogs.ticket_states, catalogs.ticket_types, catalogs.impact_levels, catalogs.urgency_levels, user?.sede_id, user?.sede?.id, user?.area_id]);

    const isSolicitanteOnly = !can("tickets.manage_all") && !can("tickets.view_area");
    const backTo = isSolicitanteOnly ? "/" : "/tickets";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject?.trim()) {
            notify.error("El asunto es obligatorio");
            return;
        }
        if (!form.sede_id || !form.area_origin_id || !form.area_current_id || !form.ticket_type_id || !form.impact_level_id || !form.urgency_level_id || !form.ticket_state_id) {
            notify.error("Completa todos los campos obligatorios (incl. Impacto y Urgencia)");
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
                impact_level_id: Number(form.impact_level_id),
                urgency_level_id: Number(form.urgency_level_id),
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

    const computedPriority = (() => {
        const matrix = catalogs.priority_matrix || [];
        const row = matrix.find((m) => Number(m.impact_level_id) === Number(form.impact_level_id) && Number(m.urgency_level_id) === Number(form.urgency_level_id));
        const pid = row?.priority_id;
        const p = (catalogs.priorities || []).find((x) => Number(x.id) === Number(pid));
        return p ? p.name : (form.impact_level_id && form.urgency_level_id ? "—" : "Selecciona Impacto y Urgencia");
    })();

    if (loadingCatalogs) {
        return (
            <div className="w-full max-w-2xl mx-auto p-4 md:p-6 space-y-6">
                <Skeleton className="h-9 w-32 rounded-md" />
                <Skeleton className="h-4 w-48 rounded" />
                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
                    </div>
                    <Skeleton className="h-24 w-full rounded-md" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full p-4 md:p-6 min-h-0">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link to={backTo} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" aria-hidden /> Volver
                    </Link>
                </Button>
            </div>

            <Card className="max-w-3xl mx-auto w-full shadow-sm">
                <CardHeader className="p-0 border-none">
                    <div className="rounded-t-xl overflow-hidden bg-muted/50 border-b border-border/60 p-6 -mt-px">
                        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                            <Plus className="h-5 w-5 text-primary" aria-hidden /> Nuevo ticket
                        </CardTitle>
                        <CardDescription className="mt-1.5">
                            Completa los datos para registrar tu solicitud (Resolvev1). Los campos con <span className="text-destructive">*</span> son obligatorios.
                        </CardDescription>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Asunto: ancho completo */}
                            <div className="md:col-span-full space-y-2">
                                <Label htmlFor="subject">Asunto <span className="text-destructive">*</span></Label>
                                <Input
                                    id="subject"
                                    required
                                    placeholder="Ej: Fallo en impresora de recepción"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    className="w-full"
                                    aria-required
                                />
                            </div>

                            {/* Tipo de ticket / Impacto */}
                            <div className="space-y-2">
                                <Label htmlFor="ticket-type">Tipo de ticket</Label>
                                <Select value={form.ticket_type_id} onValueChange={(v) => setForm({ ...form, ticket_type_id: v })}>
                                    <SelectTrigger id="ticket-type" className="w-full">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.ticket_types || []).map((t) => (
                                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Impacto: Select en escritorio, chips en móvil (mismo estado) */}
                            <div className="space-y-2">
                                <Label htmlFor="impact" id="impact-label">Impacto <span className="text-destructive">*</span></Label>
                                <div className="block md:hidden" role="radiogroup" aria-labelledby="impact-label">
                                    <div className="flex w-full gap-2 flex-wrap">
                                        {(catalogs.impact_levels || []).map((i) => {
                                            const isSelected = form.impact_level_id === String(i.id);
                                            return (
                                                <button
                                                    key={i.id}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={isSelected}
                                                    id={`impact-chip-${i.id}`}
                                                    className={cn(
                                                        "flex-1 min-w-0 min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
                                                        "flex items-center justify-center px-2 py-2.5",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                    )}
                                                    onClick={() => setForm((prev) => ({ ...prev, impact_level_id: String(i.id) }))}
                                                >
                                                    <span className="truncate">{i.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <Select value={form.impact_level_id} onValueChange={(v) => setForm({ ...form, impact_level_id: v })}>
                                        <SelectTrigger id="impact" className="w-full">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(catalogs.impact_levels || []).map((i) => (
                                                <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Urgencia: Select en escritorio, chips en móvil (mismo estado) */}
                            <div className="space-y-2">
                                <Label htmlFor="urgency" id="urgency-label">Urgencia <span className="text-destructive">*</span></Label>
                                <div className="block md:hidden" role="radiogroup" aria-labelledby="urgency-label">
                                    <div className="flex w-full gap-2 flex-wrap">
                                        {(catalogs.urgency_levels || []).map((u) => {
                                            const isSelected = form.urgency_level_id === String(u.id);
                                            return (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={isSelected}
                                                    id={`urgency-chip-${u.id}`}
                                                    className={cn(
                                                        "flex-1 min-w-0 min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
                                                        "flex items-center justify-center px-2 py-2.5",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                    )}
                                                    onClick={() => setForm((prev) => ({ ...prev, urgency_level_id: String(u.id) }))}
                                                >
                                                    <span className="truncate">{u.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <Select value={form.urgency_level_id} onValueChange={(v) => setForm({ ...form, urgency_level_id: v })}>
                                        <SelectTrigger id="urgency" className="w-full">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(catalogs.urgency_levels || []).map((u) => (
                                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority-calc" className="flex items-center gap-1.5">
                                    <Gauge className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> Prioridad (calculada)
                                </Label>
                                <Input
                                    id="priority-calc"
                                    readOnly
                                    className="w-full bg-muted text-muted-foreground cursor-default"
                                    value={computedPriority}
                                    tabIndex={-1}
                                    aria-readonly
                                />
                            </div>
                        </div>

                        <Separator className="my-6" />

                        {/* Sede / Áreas: lógica de negocio intacta */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg bg-muted/20 p-4 border border-border/50">
                            <div className="space-y-2">
                                <Label htmlFor="sede" className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> Sede
                                </Label>
                                <Select value={form.sede_id} onValueChange={(v) => setForm({ ...form, sede_id: v })}>
                                    <SelectTrigger id="sede" className="w-full bg-background">
                                        <SelectValue placeholder="Seleccionar sede" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.sedes || []).map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="area-current" className="flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> Área responsable <span className="text-destructive">*</span>
                                </Label>
                                <Select value={form.area_current_id} onValueChange={(v) => setForm({ ...form, area_current_id: v })}>
                                    <SelectTrigger id="area-current" className="w-full bg-background">
                                        <SelectValue placeholder="Área que atenderá" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.areas || []).map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-full space-y-2">
                                <Label htmlFor="area-origin">Área de origen (solicitante)</Label>
                                <Select value={form.area_origin_id} onValueChange={(v) => setForm({ ...form, area_origin_id: v })}>
                                    <SelectTrigger id="area-origin" className="w-full bg-background">
                                        <SelectValue placeholder="Tu área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.areas || []).map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción del problema</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe qué ocurrió, cuándo y si hay mensajes de error..."
                                className="min-h-[120px] resize-y w-full"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2 border-t pt-4 px-6 pb-6">
                        <Button type="button" variant="outline" asChild>
                            <Link to={backTo}>Cancelar</Link>
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creando...</>
                            ) : (
                                <><CheckCircle2 className="mr-2 h-4 w-4" aria-hidden /> Crear ticket</>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
