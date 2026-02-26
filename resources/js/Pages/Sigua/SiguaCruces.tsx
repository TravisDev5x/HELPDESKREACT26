import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCruces } from "@/hooks/sigua";
import { exportarCruce } from "@/services/siguaApi";
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
import type { Cruce } from "@/types/sigua";
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

  useEffect(() => {
    if (historial.length > 0 && !selectedId) setSelectedId(historial[0].id);
  }, [historial, selectedId]);

  useEffect(() => {
    if (selectedId == null) {
      setDetalle(null);
      return;
    }
    const c = historial.find((h) => h.id === selectedId);
    if (c) {
      setDetalle(c);
      return;
    }
    getDetalle(selectedId).then((r) => r.data && setDetalle(r.data));
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

  const tableRows = useMemo(() => {
    const rows = buildTableRows(detalle);
    if (categoriaFilter === "all") return rows;
    return rows.filter((r) => String(r.categoria ?? "").toLowerCase().includes(categoriaFilter.toLowerCase()) || String(r.categoria) === categoriaFilter);
  }, [detalle, categoriaFilter]);

  const categoriasInData = useMemo(() => {
    const rows = buildTableRows(detalle);
    const set = new Set<string>();
    rows.forEach((r) => {
      const c = r.categoria as string;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [detalle]);

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
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          {tableRows.length > 200 && (
            <p className="text-xs text-muted-foreground px-4 py-2 border-t">Mostrando 200 de {tableRows.length} filas. Exporta a Excel para ver todas.</p>
          )}
        </Card>
      )}
    </div>
  );
}
