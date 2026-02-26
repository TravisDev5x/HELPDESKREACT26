import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useImportaciones } from "@/hooks/sigua";
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
import type { TipoImportacion, Importacion } from "@/types/sigua";
import {
  Upload,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";

const TIPO_OPTIONS: { value: TipoImportacion; label: string }[] = [
  { value: "rh_activos", label: "RH Activos" },
  { value: "ad_usuarios", label: "AD Usuarios" },
  { value: "neotel_isla2", label: "Neotel Isla 2" },
  { value: "neotel_isla3", label: "Neotel Isla 3" },
  { value: "neotel_isla4", label: "Neotel Isla 4" },
  { value: "bajas_rh", label: "Bajas RH" },
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
  const canImport = can("sigua.importar.upload");

  const [tipo, setTipo] = useState<TipoImportacion>("rh_activos");
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const { historial, meta, loading, error, refetchHistorial, importar, importing } = useImportaciones({ per_page: 20 });

  useEffect(() => {
    if (!file) {
      setPreviewRows([]);
      return;
    }
    parsePreview(file)
      .then(setPreviewRows)
      .catch(() => setPreviewRows([]));
  }, [file]);

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
    setProgress(0);
    const id = setInterval(() => setProgress((p) => Math.min(p + 8, 90)), 200);
    const result = await importar(file, tipo);
    clearInterval(id);
    setProgress(100);
    if (result.error) {
      notify.error(result.error);
    } else {
      notify.success("Importación completada.");
      setFile(null);
      setPreviewRows([]);
    }
    setTimeout(() => setProgress(0), 800);
  }, [file, tipo, canImport, importar]);

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
      </div>

      <Card className="border-border/60 overflow-hidden p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de importación</label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoImportacion)}>
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

        {previewRows.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Vista previa (primeras filas)</h3>
            <div className="rounded border overflow-auto max-h-[240px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {previewRows[0]?.map((cell, i) => (
                      <TableHead key={i} className="text-xs whitespace-nowrap">{cell || `Col ${i + 1}`}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(1).map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell key={ci} className="text-xs max-w-[180px] truncate">{cell}</TableCell>
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
