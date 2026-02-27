import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useImportaciones } from "@/hooks/sigua";
import { getSistemas, previewImportacion } from "@/services/siguaApi";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { TipoImportacion, Importacion, Sistema } from "@/types/sigua";
import {
  Upload,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  History,
  Eye,
} from "lucide-react";

const TIPO_OPTIONS: { value: TipoImportacion; label: string }[] = [
  { value: "rh_activos", label: "RH Activos" },
  { value: "ad_usuarios", label: "AD Usuarios" },
  { value: "neotel_isla2", label: "Neotel Isla 2" },
  { value: "neotel_isla3", label: "Neotel Isla 3" },
  { value: "neotel_isla4", label: "Neotel Isla 4" },
  { value: "bajas_rh", label: "Bajas RH" },
  { value: "sistema", label: "Por sistema (dinámico)" },
];

const PREVIEW_MAX_ROWS = 10;

function parsePreview(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const rows = lines.slice(0, PREVIEW_MAX_ROWS + 1).map((line) => {
        if (line.includes("\t")) return line.split("\t");
        return line.split(/[,;]/).map((c) => c.trim());
      });
      resolve(rows);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "UTF-8");
  });
}

export default function SiguaImportar() {
  const { can } = useAuth();
  const canImport = can("sigua.importar");

  const [tipo, setTipo] = useState<TipoImportacion>("rh_activos");
  const [sistemaId, setSistemaId] = useState<number | null>(null);
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewApi, setPreviewApi] = useState<{ filas: number; columnas: string[]; muestra: Array<Record<string, unknown>>; errores?: string[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastImportTipo, setLastImportTipo] = useState<TipoImportacion | null>(null);
  const [lastImportResumen, setLastImportResumen] = useState<{ procesados: number; nuevos: number; actualizados: number; errores?: number } | null>(null);

  const { historial, meta, loading, error, refetchHistorial, importar, importing } = useImportaciones({ per_page: 20 });

  useEffect(() => {
    if (lastImportTipo == null) return;
    const t = setTimeout(() => {
      setLastImportTipo(null);
      setLastImportResumen(null);
    }, 10000);
    return () => clearTimeout(t);
  }, [lastImportTipo]);

  useEffect(() => {
    getSistemas().then((r) => {
      if (r.data) setSistemas(r.data.filter((s) => s.activo !== false));
    });
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewRows([]);
      setPreviewApi(null);
      return;
    }
    if (tipo === "sistema" && sistemaId != null) {
      setPreviewLoading(true);
      previewImportacion(file, sistemaId).then((res) => {
        setPreviewLoading(false);
        if (res.data) setPreviewApi(res.data);
        else setPreviewApi(null);
      });
    } else {
      setPreviewApi(null);
      parsePreview(file).then(setPreviewRows).catch(() => setPreviewRows([]));
    }
  }, [file, tipo, sistemaId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setFile(f);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target?.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !canImport) return;
    if (tipo === "sistema" && !sistemaId) {
      notify.error("Selecciona un sistema para importar.");
      return;
    }
    setProgress(0);
    const id = setInterval(() => setProgress((p) => Math.min(p + 8, 90)), 200);
    const result = await importar(file, tipo, tipo === "sistema" ? sistemaId ?? undefined : undefined);
    clearInterval(id);
    setProgress(100);
    if (result.error) {
      notify.error(result.error);
    } else {
      const importTipo = (result.data?.tipo ?? tipo) as TipoImportacion;
      setLastImportTipo(importTipo);
      setLastImportResumen({
        procesados: result.data?.registros_procesados ?? 0,
        nuevos: result.data?.registros_nuevos ?? 0,
        actualizados: result.data?.registros_actualizados ?? 0,
        errores: result.data?.errores ?? 0,
      });
      const esRh = importTipo === "rh_activos" || importTipo === "bajas_rh";
      notify.success(esRh ? "Importación completada. Ver datos en Empleados RH." : "Importación completada. Ver datos en Cuentas genéricas.");
      setFile(null);
      setPreviewRows([]);
      setPreviewApi(null);
    }
    setTimeout(() => setProgress(0), 800);
  }, [file, tipo, sistemaId, canImport, importar]);

  if (!canImport) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para importar archivos en SIGUA.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Importar" }]} />
        <h1 className="text-2xl font-bold tracking-tight">Importación de archivos</h1>
        <p className="text-sm text-muted-foreground">Sube archivos CSV/Excel según el tipo de datos.</p>
        {(tipo === "rh_activos" || tipo === "bajas_rh") && (
          <p className="text-xs text-muted-foreground">
            RH: primera fila = encabezado. Incluye columna de número de empleado (<strong>Núm. Empleado</strong>, <strong>ID</strong>, etc.) y <strong>Nombre</strong>. Opcional: <strong>Sede</strong>, <strong>Campaña</strong> (si el Excel los trae, se crean en catálogo y se asignan al reimportar).
          </p>
        )}
      </div>

      <Card className="border-border/60 overflow-hidden p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de importación</label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoImportacion); setPreviewApi(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tipo === "sistema" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Sistema</label>
              <Select value={sistemaId != null ? String(sistemaId) : ""} onValueChange={(v) => { setSistemaId(v ? Number(v) : null); setPreviewApi(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona sistema" />
                </SelectTrigger>
                <SelectContent>
                  {sistemas.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
            file && "border-emerald-500/50 bg-emerald-500/5"
          )}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            id="import-file"
            onChange={handleSelectFile}
          />
          {file ? (
            <div className="space-y-2">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>Quitar</Button>
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Importar
                </Button>
              </div>
            </div>
          ) : (
            <label htmlFor="import-file" className="cursor-pointer block">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">Arrastra un archivo aquí o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground mt-1">CSV o Excel</p>
            </label>
          )}
        </div>

        {importing && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Importando…</p>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {lastImportTipo && lastImportResumen && (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm text-emerald-800 dark:text-emerald-200">Datos importados correctamente.</span>
            <span className="text-xs text-muted-foreground">
              {lastImportResumen.procesados} procesados, {lastImportResumen.nuevos} nuevos, {lastImportResumen.actualizados} actualizados
              {(lastImportResumen.errores ?? 0) > 0 && `, ${lastImportResumen.errores} errores`}.
            </span>
            {(lastImportTipo === "rh_activos" || lastImportTipo === "bajas_rh") ? (
              <Button asChild variant="outline" size="sm" className="border-emerald-600/50 text-emerald-700 dark:text-emerald-300">
                <Link to="/sigua/empleados-rh">Ver en Empleados RH</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="border-emerald-600/50 text-emerald-700 dark:text-emerald-300">
                <Link to="/sigua/cuentas">Ver en Cuentas genéricas</Link>
              </Button>
            )}
            <span className="text-xs text-muted-foreground">Historial actualizado abajo.</span>
          </div>
        )}

        {(previewApi || previewRows.length > 0) && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Vista previa {previewApi ? `(API: ${previewApi.filas} filas, ${previewApi.columnas?.length ?? 0} columnas)` : "(primeras filas)"}
            </h3>
            {previewApi?.errores && previewApi.errores.length > 0 && (
              <div className="mb-2 p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                {previewApi.errores.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
            <div className="rounded border overflow-auto max-h-[240px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {(previewApi?.columnas ?? previewRows[0])?.map((cell, i) => (
                      <TableHead key={i} className="text-xs whitespace-nowrap">{String(cell || `Col ${i + 1}`)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(previewApi?.muestra ?? previewRows.slice(1).map((row) => Object.fromEntries(row.map((c, i) => [`col_${i}`, c])))).slice(0, 10).map((row, ri) => (
                    <TableRow key={ri}>
                      {Object.values(row).slice(0, 8).map((v, ci) => (
                        <TableCell key={ci} className="text-xs max-w-[180px] truncate">{v != null ? String(v) : "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="font-semibold">Historial de importaciones</h2>
        </div>
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="text-right">Procesados</TableHead>
                  <TableHead className="text-right">Nuevos</TableHead>
                  <TableHead className="text-right">Actualizados</TableHead>
                  <TableHead className="text-right">Errores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay importaciones aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  historial.map((row: Importacion) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm">{row.created_at ? new Date(row.created_at).toLocaleString("es-ES") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {TIPO_OPTIONS.find((o) => o.value === row.tipo)?.label ?? row.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">{row.archivo ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.registros_procesados ?? 0}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{row.registros_nuevos ?? 0}</TableCell>
                      <TableCell className="text-right">{row.registros_actualizados ?? 0}</TableCell>
                      <TableCell className="text-right">
                        {(row.errores ?? 0) > 0 ? (
                          <span className="text-destructive flex items-center justify-end gap-1">
                            <XCircle className="h-4 w-4" /> {row.errores}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-4 w-4" /> 0
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {meta && meta.last_page > 1 && (
              <div className="border-t px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pág. {meta.current_page} de {meta.last_page}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={meta.current_page <= 1} onClick={() => refetchHistorial(meta.current_page - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => refetchHistorial(meta.current_page + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
