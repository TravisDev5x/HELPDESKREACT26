import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useIncidentes } from "@/hooks/sigua";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Incidente } from "@/types/sigua";
import { AlertTriangle, ArrowLeft, Clock } from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  abierto: "Abierto",
  investigando: "Investigando",
  resuelto: "Resuelto",
  escalado: "Escalado",
};

const ESTADO_VARIANTS: Record<string, string> = {
  abierto: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  investigando: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  resuelto: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  escalado: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
};

function TimelineEstados({ incidente }: { incidente: Incidente }) {
  const items: Array<{ label: string; fecha: string; estado: string }> = [];
  const created = (incidente as Incidente & { created_at?: string }).created_at;
  const updated = (incidente as Incidente & { updated_at?: string }).updated_at;
  const estado = incidente.estado ?? "abierto";
  items.push({
    label: "Creado (Abierto)",
    fecha: created ?? incidente.fecha_incidente,
    estado: "abierto",
  });
  if (estado === "investigando" || estado === "resuelto" || estado === "escalado") {
    items.push({ label: "En investigación", fecha: updated ?? created ?? "", estado: "investigando" });
  }
  if (estado === "resuelto") {
    items.push({ label: "Resuelto", fecha: updated ?? "", estado: "resuelto" });
  }
  if (estado === "escalado") {
    items.push({ label: "Escalado", fecha: updated ?? "", estado: "escalado" });
  }
  const dotClass: Record<string, string> = {
    abierto: "bg-amber-500",
    investigando: "bg-blue-500",
    resuelto: "bg-emerald-500",
    escalado: "bg-violet-500",
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <div className={cn("h-2 w-2 rounded-full shrink-0", dotClass[item.estado] ?? "bg-muted")} />
          <span className="font-medium">{item.label}</span>
          <span className="text-muted-foreground text-xs">
            {item.fecha ? new Date(item.fecha).toLocaleString("es-ES") : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SiguaIncidenteDetalle() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canView = can("sigua.incidentes.view");
  const { getOne } = useIncidentes(null);
  const [detalle, setDetalle] = useState<Incidente | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getOne(Number(id)).then((res) => {
      setDetalle(res.data ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, getOne]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver este incidente.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  if (loading || !detalle) {
    return (
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const asignado = detalle.asignado ?? (detalle as unknown as { asignadoA?: { name?: string } }).asignadoA;
  const sistema = (detalle as unknown as { sistema?: { name?: string } }).sistema;
  const cuenta = detalle.cuenta;

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <SiguaBreadcrumbs
        items={[
          { label: "Incidentes", to: "/sigua/incidentes" },
          { label: `Incidente #${detalle.id}` },
        ]}
      />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sigua/incidentes"><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Link>
        </Button>
      </div>

      <Card className="border-border/60 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold">Incidente #{detalle.id}</h1>
          <Badge variant="outline" className={cn("font-semibold", ESTADO_VARIANTS[detalle.estado] ?? ESTADO_VARIANTS.abierto)}>
            {ESTADO_LABELS[detalle.estado] ?? detalle.estado}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Fecha incidente: {detalle.fecha_incidente ? new Date(detalle.fecha_incidente).toLocaleString("es-ES") : "—"} · 
          Cuenta: {cuenta ? (cuenta as { usuario_cuenta?: string }).usuario_cuenta : detalle.account_id} · 
          Sistema: {sistema?.name ?? detalle.system_id}
        </p>
        <p className="text-sm whitespace-pre-wrap">{detalle.descripcion}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Asignado a</p>
            <p className="font-medium">{asignado?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Agente identificado</p>
            <p className="font-medium">{detalle.agente_identificado ?? "—"}</p>
          </div>
          {detalle.resolucion && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground uppercase font-medium">Resolución</p>
              <p className="text-sm">{detalle.resolucion}</p>
            </div>
          )}
        </div>
        <Separator />
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline de estados</h4>
          <TimelineEstados incidente={detalle} />
        </div>
      </Card>
    </div>
  );
}
