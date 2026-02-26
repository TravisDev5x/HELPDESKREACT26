import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getAlertas, marcarAlertaLeida, resolverAlerta } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Alerta, SeveridadAlerta } from "@/types/sigua";
import { AlertTriangle, Bell, Check, CheckCircle2, Loader2, Filter } from "lucide-react";

const SEVERIDAD_STYLES: Record<SeveridadAlerta, string> = {
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  critical: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

export default function SiguaAlertas() {
  const { can } = useAuth();
  const canView = can("sigua.dashboard") || can("sigua.cuentas.view");
  const canResolve = can("sigua.cuentas.manage");

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLeida, setFilterLeida] = useState<"all" | "no" | "si">("all");
  const [filterResuelta, setFilterResuelta] = useState<"all" | "no" | "si">("no");
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: { leida?: boolean; resuelta?: boolean } = {};
    if (filterLeida !== "all") params.leida = filterLeida === "si";
    if (filterResuelta !== "all") params.resuelta = filterResuelta === "si";
    const res = await getAlertas(params);
    if (res.error) {
      setError(res.error);
      setAlertas([]);
    } else {
      const body = res.data as { data?: Alerta[] };
      setAlertas(Array.isArray(body?.data) ? body.data : []);
    }
    setLoading(false);
  }, [filterLeida, filterResuelta]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  const handleMarcarLeida = useCallback(async (id: number) => {
    setActingId(id);
    const res = await marcarAlertaLeida(id);
    setActingId(null);
    if (!res.error) fetchAlertas();
  }, [fetchAlertas]);

  const handleResolver = useCallback(async (id: number) => {
    setActingId(id);
    const res = await resolverAlerta(id);
    setActingId(null);
    if (!res.error) fetchAlertas();
  }, [fetchAlertas]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver alertas SIGUA.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Alertas" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
            <p className="text-sm text-muted-foreground">Notificaciones y elementos que requieren atención</p>
          </div>
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterLeida} onValueChange={(v) => setFilterLeida(v as "all" | "no" | "si")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas (leída)</SelectItem>
              <SelectItem value="no">No leídas</SelectItem>
              <SelectItem value="si">Leídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterResuelta} onValueChange={(v) => setFilterResuelta(v as "all" | "no" | "si")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas (resuelta)</SelectItem>
              <SelectItem value="no">Pendientes</SelectItem>
              <SelectItem value="si">Resueltas</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAlertas} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Actualizar
          </Button>
        </div>

        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : alertas.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
            No hay alertas con los filtros seleccionados.
          </div>
        ) : (
          <ul className="divide-y">
            {alertas.map((a) => (
              <li key={a.id} className={cn("p-4 flex flex-col sm:flex-row sm:items-center gap-3", !a.leida && "bg-muted/20")}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-xs", SEVERIDAD_STYLES[a.severidad] ?? SEVERIDAD_STYLES.info)}>
                      {a.severidad}
                    </Badge>
                    {a.resuelta && (
                      <Badge variant="secondary" className="text-xs">Resuelta</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {a.created_at ? new Date(a.created_at).toLocaleString("es-ES") : ""}
                    </span>
                  </div>
                  <p className="font-medium">{a.titulo}</p>
                  {a.descripcion && <p className="text-sm text-muted-foreground mt-0.5">{a.descripcion}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!a.leida && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarcarLeida(a.id)}
                      disabled={actingId === a.id}
                    >
                      {actingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Marcar leída
                    </Button>
                  )}
                  {canResolve && !a.resuelta && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleResolver(a.id)}
                      disabled={actingId === a.id}
                    >
                      {actingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Resolver
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
