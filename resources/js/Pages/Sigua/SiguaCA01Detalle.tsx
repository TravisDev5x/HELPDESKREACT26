import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getCA01 } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { FormatoCA01 } from "@/types/sigua";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  vigente: "Vigente",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const ESTADO_VARIANTS: Record<string, string> = {
  vigente: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  vencido: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  cancelado: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

export default function SiguaCA01Detalle() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canView = can("sigua.ca01.view");
  const [data, setData] = useState<FormatoCA01 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !canView) return;
    setLoading(true);
    getCA01(Number(id))
      .then((res) => {
        if (res.error) {
          setError(res.error);
          setData(null);
          notify.error(res.error);
        } else setData(res.data ?? null);
      })
      .finally(() => setLoading(false));
  }, [id, canView]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver este CA-01.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8">
        <Card className="border-destructive/30 p-6 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">{error ?? "CA-01 no encontrado."}</p>
          <Button asChild variant="outline"><Link to="/sigua/ca01">Volver a CA-01</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <SiguaBreadcrumbs
        items={[
          { label: "Formatos CA-01", to: "/sigua/ca01" },
          { label: `CA-01 #${data.id}` },
        ]}
      />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sigua/ca01"><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Link>
        </Button>
      </div>

      <Card className="border-border/60 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold">CA-01 #{data.id}</h1>
          <Badge variant="outline" className={cn("font-semibold", ESTADO_VARIANTS[data.estado] ?? ESTADO_VARIANTS.cancelado)}>
            {ESTADO_LABELS[data.estado] ?? data.estado}
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Gerente</p>
            <p className="font-medium">{data.gerente?.name ?? data.gerente_user_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Campaña</p>
            <p className="font-medium">{data.campaign?.name ?? data.campaign_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Sede</p>
            <p className="font-medium">{data.sede?.name ?? data.sede_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Sistema</p>
            <p className="font-medium">{data.sistema?.name ?? data.system_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Fecha firma</p>
            <p className="font-medium">{data.fecha_firma ? new Date(data.fecha_firma).toLocaleDateString("es-ES") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Fecha vencimiento</p>
            <p className="font-medium">{data.fecha_vencimiento ? new Date(data.fecha_vencimiento).toLocaleDateString("es-ES") : "—"}</p>
          </div>
        </div>
        {data.observaciones && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Observaciones</p>
            <p className="text-sm">{data.observaciones}</p>
          </div>
        )}
        {data.cuentas && data.cuentas.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Cuentas ({data.cuentas.length})</p>
            <ul className="text-sm list-disc list-inside space-y-1">
              {data.cuentas.slice(0, 20).map((c) => (
                <li key={c.id}>{c.usuario_cuenta} — {c.nombre_cuenta}</li>
              ))}
              {data.cuentas.length > 20 && <li className="text-muted-foreground">… y {data.cuentas.length - 20} más</li>}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
