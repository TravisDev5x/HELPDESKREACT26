import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, FileText, Lightbulb, MapPin, Tag } from "lucide-react";

export function catalogName(items = [], id, fallback = "Sin seleccionar") {
    return items.find((item) => String(item.id) === String(id))?.name || fallback;
}

function guidanceFor(ticketTypeName = "") {
    const type = ticketTypeName.toLocaleLowerCase("es");

    if (/(acceso|cuenta|contraseña|password|permiso)/.test(type)) {
        return ["Sistema o cuenta afectada", "Mensaje de error exacto", "Desde cuándo ocurre"];
    }
    if (/(solicitud|requerimiento|cambio|mejora)/.test(type)) {
        return ["Resultado que necesitas", "Motivo o beneficio", "Fecha en que lo requieres"];
    }
    if (/(falla|error|incidente|problema)/.test(type)) {
        return ["Qué estabas haciendo", "Mensaje de error exacto", "Qué intentaste para resolverlo"];
    }

    return ["Qué ocurrió o necesitas", "Desde cuándo", "Personas o equipos afectados"];
}

export function TicketDescriptionGuidance({ ticketTypeName }) {
    const suggestions = guidanceFor(ticketTypeName);

    return (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5" aria-live="polite">
            <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 space-y-1.5">
                    <p className="text-xs font-medium text-foreground">
                        Para recibir ayuda más rápido, incluye:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((suggestion) => (
                            <Badge key={suggestion} variant="outline" className="bg-background/70 font-normal">
                                {suggestion}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TicketSubmissionSummary({
    ticketTypeName,
    siteName,
    fileCount = 0,
    missingLabels = [],
    compact = false,
}) {
    const ready = missingLabels.length === 0;

    return (
        <div className={cn("min-w-0 space-y-1.5", compact && "space-y-1")} aria-live="polite">
            <div className="flex items-center gap-1.5 text-xs font-medium">
                {ready ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                )}
                <span>{ready ? "Listo para crear" : `Falta completar: ${missingLabels.join(", ")}`}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" aria-hidden /> {ticketTypeName || "Sin tipo"}
                </span>
                {siteName ? (
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden /> {siteName}
                    </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    {fileCount === 1 ? "1 archivo" : `${fileCount} archivos`}
                </span>
            </div>
        </div>
    );
}
