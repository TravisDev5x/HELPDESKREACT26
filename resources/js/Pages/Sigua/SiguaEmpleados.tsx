import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getEmpleadosRh, getSistemas } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { EmpleadoRh, Sistema } from "@/types/sigua";
import { AlertTriangle, Check, X, Search, Loader2, User } from "lucide-react";

export default function SiguaEmpleados() {
  const { can } = useAuth();
  const canView = can("sigua.cuentas.view") || can("sigua.dashboard");

  const [empleados, setEmpleados] = useState<EmpleadoRh[]>([]);
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sedeId, setSedeId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);

  const fetchEmpleados = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    const res = await getEmpleadosRh({ sede_id: sedeId, page: pageNum, per_page: 20 });
    if (res.error) {
      setError(res.error);
      setEmpleados([]);
      setMeta(null);
    } else {
      setEmpleados(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta ?? null);
    }
    setLoading(false);
  }, [sedeId]);

  useEffect(() => {
    getSistemas().then((r) => {
      if (r.data) setSistemas(r.data.filter((s) => s.activo !== false));
    });
  }, []);

  useEffect(() => {
    fetchEmpleados(page);
  }, [fetchEmpleados, page]);

  const tieneCuentaEnSistema = useCallback((emp: EmpleadoRh, sistemaId: number) => {
    const cuentas = emp.cuentas ?? [];
    return cuentas.some((c) => c.system_id === sistemaId);
  }, []);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver empleados RH.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Empleados RH" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Empleados RH</h1>
            <p className="text-sm text-muted-foreground">Listado con presencia por sistema</p>
          </div>
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center gap-2">
          <Select value={sedeId != null ? String(sedeId) : "all"} onValueChange={(v) => setSedeId(v === "all" ? undefined : Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas las sedes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {/* Opcional: cargar sedes desde catálogo si se necesita */}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchEmpleados(page)} disabled={loading}>
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
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>#</TableHead>
                  <TableHead>Núm. empleado</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Campaña</TableHead>
                  {sistemas.map((s) => (
                    <TableHead key={s.id} className="text-center whitespace-nowrap">
                      {s.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + sistemas.length} className="text-center text-muted-foreground py-8">
                      No hay empleados RH.
                    </TableCell>
                  </TableRow>
                ) : (
                  empleados.map((emp, idx) => (
                    <TableRow key={emp.id}>
                      <TableCell className="text-muted-foreground">{(meta?.current_page ?? 1) * 20 - 20 + idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{emp.num_empleado}</TableCell>
                      <TableCell>
                        <Link to={`/sigua/empleados-rh/${emp.id}`} className="font-medium text-primary hover:underline">
                          {emp.nombre_completo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.sede?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.campaign?.name ?? "—"}</TableCell>
                      {sistemas.map((s) => {
                        const tiene = tieneCuentaEnSistema(emp, s.id);
                        return (
                          <TableCell key={s.id} className="text-center">
                            {tiene ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                <Check className="h-3 w-3" />
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground">
                                <X className="h-3 w-3" />
                              </Badge>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8">
                          <Link to={`/sigua/empleados-rh/${emp.id}`}>
                            <User className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Pág. {meta.current_page} de {meta.last_page} ({meta.total} registros)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
