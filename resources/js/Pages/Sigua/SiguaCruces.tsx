import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCruces } from "@/hooks/sigua";
import { exportarCruce, compararCruce } from "@/services/siguaApi";
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
import { cn } from "@/lib/utils";
import type { Cruce, CruceResultado, CategoriaCruce } from "@/types/sigua";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Play,
  Loader2,
  AlertTriangle,
  History,
  Download,
  BarChart3,
} from "lucide-react";

const CATEGORIA_LABELS: Record<string, string> = {
  activo: "Activo en RH",
  baja_pendiente: "No en RH",
  sin_ad: "En RH sin AD",
  genérico: "Genérico PRB",
  sistema: "Sistema",
  en_ad_no_rh: "No en RH",
  en_rh_no_ad: "En RH sin AD",
  coincidencias: "Coincidencias",
  ok_completo: "OK completo",
  sin_cuenta_sistema: "Sin cuenta sistema",
  cuenta_sin_rh: "Cuenta sin RH",
  generico_con_responsable: "Genérico con responsable",
  generico_sin_responsable: "Genérico sin responsable",
  cuenta_baja_pendiente: "Baja pendiente",
  cuenta_servicio: "Cuenta servicio",
  anomalia: "Anomalía",
};

const CATEGORIA_COLORS: Record<string, string> = {
  ok_completo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  sin_cuenta_sistema: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  cuenta_sin_rh: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  generico_con_responsable: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  generico_sin_responsable: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  cuenta_baja_pendiente: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  cuenta_servicio: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  anomalia: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const CHART_COLORS = ["#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

function buildPieData(cruce: Cruce | null): { name: string; value: number; color: string }[] {
  if (!cruce) return [];
  const json = cruce.resultado_json as Record<string, unknown> | null;
  const cat = json?.categorizacion as Record<string, number> | undefined;
  if (cat && typeof cat === "object") {
    return Object.entries(cat)
      .filter(([, v]) => Number(v) > 0)
      .map(([k, v], i) => ({
        name: CATEGORIA_LABELS[k] ?? k,
        value: Number(v),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }
  if (cruce.coincidencias > 0 || cruce.sin_match > 0) {
    return [
      { name: "Coincidencias", value: cruce.coincidencias, color: CHART_COLORS[0] },
      { name: "Sin match", value: cruce.sin_match, color: CHART_COLORS[1] },
    ].filter((d) => d.value > 0);
  }
  return [];
}

function buildTableRows(cruce: Cruce | null): Record<string, unknown>[] {
  if (!cruce?.resultado_json || typeof cruce.resultado_json !== "object") return [];
  const j = cruce.resultado_json as Record<string, unknown>;
  const filas = j.filas as Record<string, unknown>[] | undefined;
  if (Array.isArray(filas) && filas.length > 0) return filas;
  const rows: Record<string, unknown>[] = [];
  const coincidencias = (j.coincidencias as Record<string, unknown>[]) ?? [];
  const enAdNoRh = (j.en_ad_no_rh as Record<string, unknown>[]) ?? [];
  const enRhNoAd = (j.en_rh_no_ad as Record<string, unknown>[]) ?? [];
  coincidencias.forEach((r) => rows.push({ ...r, categoria: "Activo en RH" }));
  enAdNoRh.forEach((r) => rows.push({ ...r, categoria: "No en RH" }));
  enRhNoAd.forEach((r) => rows.push({ ...r, categoria: "En RH sin AD" }));
  return rows;
}

export default function SiguaCruces() {
  const { can } = useAuth();
  const canExecute = can("sigua.cruces.ejecutar");
  const canExport = can("sigua.reportes");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [exportingId, setExportingId] = useState<number | null>(null);

  const { historial, meta, loading, error, refetchHistorial, ejecutar, getDetalle, executing } = useCruces({ per_page: 20 });
  const [detalle, setDetalle] = useState<Cruce | null>(null);
  const [resultados, setResultados] = useState<CruceResultado[]>([]);
  const [resultadosLoading, setResultadosLoading] = useState(false);

  useEffect(() => {
    if (historial.length > 0 && !selectedId) setSelectedId(historial[0].id);
  }, [historial, selectedId]);

  useEffect(() => {
    if (selectedId == null) {
      setDetalle(null);
      setResultados([]);
      return;
    }
    const c = historial.find((h) => h.id === selectedId);
    if (c) setDetalle(c);
    else getDetalle(selectedId).then((r) => r.data && setDetalle(r.data));
    setResultadosLoading(true);
    compararCruce(selectedId).then((res) => {
      setResultadosLoading(false);
      if (res.data?.resultados) setResultados(res.data.resultados);
      else setResultados([]);
    });
  }, [selectedId, historial, getDetalle]);

  const handleEjecutar = useCallback(async () => {
    const res = await ejecutar();
    if (res.error) notify.error(res.error);
    else {
      notify.success("Cruce ejecutado.");
      if (res.data) setSelectedId(res.data.id);
    }
  }, [ejecutar]);

  const handleExport = useCallback(async (id: number) => {
    setExportingId(id);
    const { data, error: err } = await exportarCruce(id);
    setExportingId(null);
    if (err || !data) {
      notify.error(err ?? "Error al exportar");
      return;
    }
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigua_cruce_${id}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success("Exportado.");
  }, []);

  const sistemasFromResultados = useMemo(() => {
    const first = resultados[0];
    const rps = first?.resultados_por_sistema ?? [];
    return rps.map((r) => ({ id: r.sistema_id, slug: r.slug }));
  }, [resultados]);

  const tableRows = useMemo(() => {
    const rows = buildTableRows(detalle);
    if (categoriaFilter === "all") return rows;
    return rows.filter((r) => String(r.categoria ?? "").toLowerCase().includes(categoriaFilter.toLowerCase()) || String(r.categoria) === categoriaFilter);
  }, [detalle, categoriaFilter]);

  const resultadosFiltered = useMemo(() => {
    if (categoriaFilter === "all") return resultados;
    return resultados.filter((r) => r.categoria === categoriaFilter || String(r.categoria).toLowerCase().includes(categoriaFilter.toLowerCase()));
  }, [resultados, categoriaFilter]);

  const categoriasInData = useMemo(() => {
    const set = new Set<string>();
    const rows = buildTableRows(detalle);
    rows.forEach((r) => {
      const c = r.categoria as string;
      if (c) set.add(c);
    });
    resultados.forEach((r) => set.add(r.categoria));
    return Array.from(set).sort();
  }, [detalle, resultados]);

  const pieData = useMemo(() => buildPieData(detalle), [detalle]);

  if (!canExecute && !can("sigua.cruces.view")) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para cruces SIGUA.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Cruces" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cruces RH vs AD vs Neotel</h1>
            <p className="text-sm text-muted-foreground">Ejecuta el cruce completo y revisa resultados.</p>
          </div>
          {canExecute && (
            <Button onClick={handleEjecutar} disabled={executing}>
              {executing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Play className="h-4 w-4 mr-2" /> Ejecutar cruce completo
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {detalle && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Analizados</p>
            <p className="text-2xl font-bold">{detalle.total_analizados ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Coincidencias</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{detalle.coincidencias ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sin match</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{detalle.sin_match ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Cruce</p>
            <p className="text-sm font-medium">{detalle.tipo_cruce ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{detalle.fecha_ejecucion ? new Date(detalle.fecha_ejecucion).toLocaleString("es-ES") : ""}</p>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {pieData.length > 0 && (
          <Card className="border-border/60 overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <h2 className="font-semibold">Distribución</h2>
            </div>
            <div className="p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card className="border-border/60 overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h2 className="font-semibold">Historial de cruces</h2>
            {detalle && canExport && (
              <Button variant="outline" size="sm" onClick={() => handleExport(detalle.id)} disabled={exportingId !== null}>
                {exportingId === detalle.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Download className="h-4 w-4 mr-2" /> Exportar
              </Button>
            )}
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Coincidencias</TableHead>
                    <TableHead className="text-right">Sin match</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay cruces. Ejecuta un cruce completo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historial.map((row: Cruce) => (
                      <TableRow
                        key={row.id}
                        className={cn(selectedId === row.id && "bg-muted/50")}
                      >
                        <TableCell className="text-sm">{row.fecha_ejecucion ? new Date(row.fecha_ejecucion).toLocaleString("es-ES") : "—"}</TableCell>
                        <TableCell><Badge variant="outline">{row.tipo_cruce}</Badge></TableCell>
                        <TableCell className="text-right">{row.coincidencias ?? 0}</TableCell>
                        <TableCell className="text-right">{row.sin_match ?? 0}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.id)}>Ver</Button>
                          {canExport && (
                            <Button variant="ghost" size="sm" onClick={() => handleExport(row.id)} disabled={exportingId !== null}>
                              {exportingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {detalle && (
        <Card className="border-border/60 overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center gap-2">
            <span className="font-semibold">Tabla de resultados</span>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categoriasInData.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c] ?? c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {resultadosLoading ? (
            <div className="p-6 flex items-center justify-center text-muted-foreground">Cargando resultados…</div>
          ) : resultados.length > 0 ? (
            <>
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Sede</TableHead>
                      <TableHead>Campaña</TableHead>
                      {sistemasFromResultados.map((s) => (
                        <TableHead key={s.id} className="text-center text-xs">{s.slug}</TableHead>
                      ))}
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadosFiltered.slice(0, 200).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          <span className="font-mono text-xs">{r.num_empleado ?? "—"}</span>
                          <span className="block truncate max-w-[140px]" title={r.nombre_empleado ?? ""}>{r.nombre_empleado ?? "—"}</span>
                        </TableCell>
                        <TableCell className="text-xs">{r.sede ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.campana ?? "—"}</TableCell>
                        {sistemasFromResultados.map((sys) => {
                          const s = (r.resultados_por_sistema ?? []).find((x) => x.sistema_id === sys.id);
                          return (
                            <TableCell key={sys.id} className="text-center">
                              {s?.tiene_cuenta ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">✓</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">—</Badge>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", CATEGORIA_COLORS[r.categoria] ?? "")}>
                            {CATEGORIA_LABELS[r.categoria] ?? r.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.empleado_rh_id && (
                            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                              <Link to={`/sigua/empleados-rh/${r.empleado_rh_id}`}>Ver empleado</Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {resultadosFiltered.length > 200 && (
                <p className="text-xs text-muted-foreground px-4 py-2 border-t">Mostrando 200 de {resultadosFiltered.length} filas. Exporta para ver todas.</p>
              )}
            </>
          ) : (
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Categoría</TableHead>
                    {tableRows[0] && Object.keys(tableRows[0]).filter((k) => k !== "categoria").slice(0, 6).map((k) => (
                      <TableHead key={k} className="capitalize">{k.replace(/_/g, " ")}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Sin filas para este cruce o filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.slice(0, 200).map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell><Badge variant="outline" className="text-xs">{String(row.categoria ?? "—")}</Badge></TableCell>
                        {Object.entries(row)
                          .filter(([k]) => k !== "categoria")
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <TableCell key={k} className="text-xs max-w-[140px] truncate" title={String(v ?? "")}>
                              {v != null ? String(v) : "—"}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
