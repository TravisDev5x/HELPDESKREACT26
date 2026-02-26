import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getResumenGeneral,
  exportarCuentas,
  exportarBitacora,
  exportarCruce,
  getSistemas,
  getHistorialCruces,
} from "@/services/siguaApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
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
import { notify } from "@/lib/notify";
import type { SiguaFilters, Sistema, CuentaGenerica, RegistroBitacora, Cruce } from "@/types/sigua";
import {
  Download,
  Loader2,
  AlertTriangle,
  Users,
  BookOpen,
  GitMerge,
  BarChart3,
} from "lucide-react";

export default function SiguaReportes() {
  const { can } = useAuth();
  const canReportes = can("sigua.reportes");

  const [filters, setFilters] = useState<SiguaFilters>({});
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [resumen, setResumen] = useState<{
    cuentas: CuentaGenerica[];
    bitacora: RegistroBitacora[];
    kpis: Record<string, number>;
  } | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [cruces, setCruces] = useState<Cruce[]>([]);
  const [loadingCruces, setLoadingCruces] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<"cuentas" | "bitacora" | null>(null);
  const [cruceSeleccionadoId, setCruceSeleccionadoId] = useState<number | null>(null);

  useEffect(() => {
    getSistemas().then((r) => r.data && setSistemas(r.data));
  }, []);

  const loadResumen = useCallback(async () => {
    setLoadingResumen(true);
    const { data, error } = await getResumenGeneral(filters);
    setLoadingResumen(false);
    if (error) {
      notify.error(error);
      setResumen(null);
      return;
    }
    setResumen(data ?? null);
  }, [filters]);

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  useEffect(() => {
    setLoadingCruces(true);
    getHistorialCruces({ per_page: 30 }).then(({ data: res, error }) => {
      setLoadingCruces(false);
      if (!error && res && "data" in res) setCruces((res as { data: Cruce[] }).data ?? []);
      else setCruces([]);
    });
  }, []);

  const handleExportCuentas = useCallback(async () => {
    setExporting("cuentas");
    const { data, error } = await exportarCuentas(filters);
    setExporting(null);
    if (error || !data) {
      notify.error(error ?? "Error al exportar");
      return;
    }
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigua_cuentas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success("Exportado.");
  }, [filters]);

  const handleExportBitacora = useCallback(async () => {
    setExporting("bitacora");
    const { data, error } = await exportarBitacora(filters);
    setExporting(null);
    if (error || !data) {
      notify.error(error ?? "Error al exportar");
      return;
    }
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigua_bitacora_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success("Exportado.");
  }, [filters]);

  const handleExportCruce = useCallback(async (cruceId: number) => {
    setExporting(`cruce-${cruceId}`);
    const { data, error } = await exportarCruce(cruceId);
    setExporting(null);
    if (error || !data) {
      notify.error(error ?? "Error al exportar");
      return;
    }
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigua_cruce_${cruceId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success("Exportado.");
  }, []);

  if (!canReportes) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para reportes SIGUA.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Reportes" }]} />
        <h1 className="text-2xl font-bold tracking-tight">Reportes y exportación</h1>
        <p className="text-sm text-muted-foreground">Filtros generales y descarga en Excel/CSV.</p>
      </div>

      <Card className="p-4 border-border/60">
        <h3 className="text-sm font-semibold mb-3">Filtros generales</h3>
        <div className="flex flex-wrap gap-3">
          <Select
            value={filters.sistema_id != null ? String(filters.sistema_id) : "all"}
            onValueChange={(v) => setFilters((p) => ({ ...p, sistema_id: v === "all" ? undefined : Number(v) }))}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los sistemas</SelectItem>
              {sistemas.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={filters.estado ?? "all"}
            onValueChange={(v) => setFilters((p) => ({ ...p, estado: v === "all" ? undefined : v }))}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Estado cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activa">Activa</SelectItem>
              <SelectItem value="suspendida">Suspendida</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Desde</label>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.fecha_desde ?? ""}
              onChange={(e) => setFilters((p) => ({ ...p, fecha_desde: e.target.value || undefined }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.fecha_hasta ?? ""}
              onChange={(e) => setFilters((p) => ({ ...p, fecha_hasta: e.target.value || undefined }))}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 border-border/60 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <span className="font-semibold">Resumen general</span>
          </div>
          <p className="text-xs text-muted-foreground">KPIs y vista previa según filtros.</p>
          {loadingResumen ? (
            <Skeleton className="h-20 w-full" />
          ) : resumen?.kpis ? (
            <div className="text-sm space-y-1">
              <p>Cuentas: <strong>{resumen.kpis.total_cuentas ?? resumen.cuentas?.length ?? 0}</strong></p>
              <p>Reg. bitácora: <strong>{resumen.bitacora?.length ?? 0}</strong></p>
            </div>
          ) : null}
        </Card>

        <Card className="p-5 border-border/60 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-muted-foreground" />
            <span className="font-semibold">Exportar cuentas</span>
          </div>
          <p className="text-xs text-muted-foreground">Listado de cuentas genéricas (Excel/CSV).</p>
          <div className="flex gap-2 mt-auto">
            <Button variant="outline" size="sm" onClick={() => setPreviewReport((p) => (p === "cuentas" ? null : "cuentas"))}>
              Preview
            </Button>
            <Button size="sm" onClick={handleExportCuentas} disabled={exporting !== null}>
              {exporting === "cuentas" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Download className="h-4 w-4 mr-2" /> Descargar
            </Button>
          </div>
        </Card>

        <Card className="p-5 border-border/60 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <span className="font-semibold">Exportar bitácora</span>
          </div>
          <p className="text-xs text-muted-foreground">Registros de bitácora (Excel/CSV).</p>
          <div className="flex gap-2 mt-auto">
            <Button variant="outline" size="sm" onClick={() => setPreviewReport((p) => (p === "bitacora" ? null : "bitacora"))}>
              Preview
            </Button>
            <Button size="sm" onClick={handleExportBitacora} disabled={exporting !== null}>
              {exporting === "bitacora" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Download className="h-4 w-4 mr-2" /> Descargar
            </Button>
          </div>
        </Card>

        <Card className="p-5 border-border/60 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <GitMerge className="h-8 w-8 text-muted-foreground" />
            <span className="font-semibold">Exportar cruce</span>
          </div>
          <p className="text-xs text-muted-foreground">Resultado de un cruce por ID.</p>
          <div className="mt-auto space-y-2">
            {loadingCruces ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <>
                <Select value={cruceSeleccionadoId != null ? String(cruceSeleccionadoId) : ""} onValueChange={(v) => setCruceSeleccionadoId(v ? Number(v) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cruce..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cruces.slice(0, 20).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        #{c.id} {c.tipo_cruce} — {c.fecha_ejecucion ? new Date(c.fecha_ejecucion).toLocaleDateString("es-ES") : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full" onClick={() => cruceSeleccionadoId != null && handleExportCruce(cruceSeleccionadoId)} disabled={!!exporting || cruceSeleccionadoId == null}>
                  {exporting?.startsWith("cruce-") && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Download className="h-4 w-4 mr-2" /> Descargar
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>

      {previewReport === "cuentas" && (
        <Card className="border-border/60 overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="font-semibold">Preview — Cuentas</h3>
            <Button variant="ghost" size="sm" onClick={() => setPreviewReport(null)}>Cerrar</Button>
          </div>
          <div className="overflow-auto max-h-[320px]">
            {loadingResumen ? (
              <div className="p-6 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : resumen?.cuentas?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.cuentas.slice(0, 100).map((c: CuentaGenerica) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.usuario_cuenta}</TableCell>
                      <TableCell className="text-sm">{c.nombre_cuenta}</TableCell>
                      <TableCell className="text-xs">{c.sistema?.name ?? c.system_id}</TableCell>
                      <TableCell className="text-xs">{c.estado}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-6 text-muted-foreground text-sm">Sin datos con los filtros actuales.</p>
            )}
            {resumen?.cuentas && resumen.cuentas.length > 100 && (
              <p className="text-xs text-muted-foreground px-4 py-2 border-t">Mostrando 100 de {resumen.cuentas.length}.</p>
            )}
          </div>
        </Card>
      )}

      {previewReport === "bitacora" && (
        <Card className="border-border/60 overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="font-semibold">Preview — Bitácora</h3>
            <Button variant="ghost" size="sm" onClick={() => setPreviewReport(null)}>Cerrar</Button>
          </div>
          <div className="overflow-auto max-h-[320px]">
            {loadingResumen ? (
              <div className="p-6 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : resumen?.bitacora?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Cuenta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.bitacora.slice(0, 100).map((b: RegistroBitacora) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs">{b.fecha ? new Date(b.fecha).toLocaleDateString("es-ES") : "—"}</TableCell>
                      <TableCell className="text-sm">{b.agente_nombre}</TableCell>
                      <TableCell className="text-xs">{b.turno_label ?? b.turno}</TableCell>
                      <TableCell className="text-xs">{b.cuenta?.usuario_cuenta ?? b.account_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-6 text-muted-foreground text-sm">Sin registros de bitácora con los filtros actuales.</p>
            )}
            {resumen?.bitacora && resumen.bitacora.length > 100 && (
              <p className="text-xs text-muted-foreground px-4 py-2 border-t">Mostrando 100 de {resumen.bitacora.length}.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
