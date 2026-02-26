import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getEmpleadoRh } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmpleadoRh } from "@/types/sigua";
import { AlertTriangle, ArrowLeft, User } from "lucide-react";

export default function SiguaEmpleadoDetalle() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canView = can("sigua.cuentas.view") || can("sigua.dashboard");

  const [empleado, setEmpleado] = useState<EmpleadoRh | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!id || !/^\d+$/.test(id)) {
      setError("ID inválido");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getEmpleadoRh(Number(id));
    if (res.error) {
      setError(res.error);
      setEmpleado(null);
    } else {
      setEmpleado(res.data ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver este empleado.</p>
          <Button asChild variant="outline"><Link to="/sigua/empleados-rh">Volver a Empleados RH</Link></Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !empleado) {
    return (
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8">
        <Card className="border-destructive/30 p-6">
          <p className="text-destructive">{error ?? "Empleado no encontrado."}</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/sigua/empleados-rh">Volver a Empleados RH</Link></Button>
        </Card>
      </div>
    );
  }

  const cuentas = empleado.cuentas ?? [];

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Empleados RH", to: "/sigua/empleados-rh" }, { label: empleado.nombre_completo }]} />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sigua/empleados-rh"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{empleado.nombre_completo}</h1>
        </div>
      </div>

      <Card className="border-border/60 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Núm. empleado</p>
            <p className="font-mono">{empleado.num_empleado}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sede</p>
            <p>{empleado.sede?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaña</p>
            <p>{empleado.campaign?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Área / Puesto</p>
            <p>{[empleado.area, empleado.puesto].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        </div>
      </Card>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
          <User className="h-5 w-5" />
          <h2 className="font-semibold">Cuentas vinculadas ({cuentas.length})</h2>
        </div>
        {cuentas.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">Sin cuentas vinculadas.</div>
        ) : (
          <ul className="divide-y">
            {cuentas.map((c) => (
              <li key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm">{c.usuario_cuenta}</span>
                  <span className="text-muted-foreground ml-2">— {c.nombre_cuenta}</span>
                  {c.sistema && (
                    <Badge variant="outline" className="ml-2 text-xs">{c.sistema.name}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/sigua/cuentas/${c.id}`}>Ver cuenta</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
