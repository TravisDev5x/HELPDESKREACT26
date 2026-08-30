import { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import PortalLayout from "@/Inertia/Layouts/PortalLayout";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TicketDescriptionEditor } from "@/components/tickets/TicketDescriptionEditor";
import { catalogName, TicketDescriptionGuidance, TicketSubmissionSummary } from "@/components/tickets/TicketCreationAssist";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function PortalTicketsCreate() {
    const { ticketTypes = [], defaultAreaId, defaultStateId } = usePage().props;

    const [form, setForm] = useState({
        subject: "",
        description: "",
        ticket_type_id: ticketTypes[0]?.id ? String(ticketTypes[0].id) : "",
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const ticketTypeName = catalogName(ticketTypes, form.ticket_type_id);
    const missingLabels = [
        !form.subject.trim() && "asunto",
        !form.ticket_type_id && "tipo",
    ].filter(Boolean);

    const set = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: typeof e === "string" ? e : e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const newErrors = {};
        if (!form.subject.trim()) newErrors.subject = "El asunto es obligatorio.";
        if (!form.ticket_type_id) newErrors.ticket_type_id = "Selecciona un tipo de solicitud.";
        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                subject: form.subject.trim(),
                description: form.description.trim() || null,
                ticket_type_id: Number(form.ticket_type_id),
                area_origin_id: defaultAreaId,
                ticket_state_id: defaultStateId,
                created_at: new Date().toISOString(),
            };
            const { data } = await axios.post("/api/my-tickets", payload);
            // Navigate to /tickets using Inertia so PortalLayout stays loaded
            router.visit("/tickets", { replace: false });
        } catch (err) {
            const status = err?.response?.status;
            if (status === 422) {
                const serverErrors = err?.response?.data?.errors ?? {};
                const mapped = {};
                Object.entries(serverErrors).forEach(([field, messages]) => {
                    mapped[field] = Array.isArray(messages) ? messages[0] : messages;
                });
                setErrors(mapped);
            } else {
                setErrors({ subject: "Error al enviar. Intenta de nuevo." });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PortalLayout title="Nuevo ticket">
            <div className="max-w-xl">
                <h1 className="mb-6 text-2xl font-bold">Abrir ticket de soporte</h1>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    {/* Subject */}
                    <div className="space-y-1.5">
                        <Label htmlFor="subject">
                            Asunto <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="subject"
                            placeholder="Describe brevemente el problema…"
                            value={form.subject}
                            onChange={set("subject")}
                            disabled={submitting}
                            aria-invalid={Boolean(errors.subject)}
                            className="h-11"
                            autoFocus
                        />
                        {errors.subject && (
                            <p className="text-xs text-destructive">{errors.subject}</p>
                        )}
                    </div>

                    {/* Ticket type */}
                    <div className="space-y-1.5">
                        <Label htmlFor="ticket_type_id">
                            Tipo de solicitud <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.ticket_type_id}
                            onValueChange={set("ticket_type_id")}
                            disabled={submitting}
                        >
                            <SelectTrigger id="ticket_type_id" className="h-11">
                                <SelectValue placeholder="Selecciona…" />
                            </SelectTrigger>
                            <SelectContent>
                                {ticketTypes.map((t) => (
                                    <SelectItem key={t.id} value={String(t.id)}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.ticket_type_id && (
                            <p className="text-xs text-destructive">{errors.ticket_type_id}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="description">
                            Descripción{" "}
                            <span className="text-muted-foreground text-xs font-normal">
                                (opcional)
                            </span>
                        </Label>
                        <TicketDescriptionEditor
                            id="description"
                            value={form.description}
                            onChange={(description) => setForm((current) => ({ ...current, description }))}
                            disabled={submitting}
                            placeholder="Proporciona más detalles sobre el problema…"
                            aria-invalid={Boolean(errors.description)}
                        />
                        <TicketDescriptionGuidance ticketTypeName={ticketTypeName} />
                        {errors.description && (
                            <p className="text-xs text-destructive">{errors.description}</p>
                        )}
                    </div>

                    {/* Generic server error */}
                    {errors.area_origin_id || errors.ticket_state_id ? (
                        <p className="text-xs text-destructive">
                            {errors.area_origin_id ?? errors.ticket_state_id}
                        </p>
                    ) : null}

                    <div className="sticky bottom-0 z-10 -mx-3 flex flex-col gap-3 border-t border-border/60 bg-background/95 px-3 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                        <TicketSubmissionSummary
                            ticketTypeName={ticketTypeName}
                            fileCount={0}
                            missingLabels={missingLabels}
                        />
                        <div className="flex gap-3">
                        <Button type="submit" disabled={submitting} className="gap-2">
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? "Enviando…" : "Enviar ticket"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={submitting}
                            onClick={() => router.visit("/tickets")}
                        >
                            Cancelar
                        </Button>
                        </div>
                    </div>
                </form>
            </div>
        </PortalLayout>
    );
}
