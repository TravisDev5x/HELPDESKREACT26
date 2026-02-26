import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBitacora } from "@/hooks/sigua";
import { getCuentas, exportarBitacora } from "@/services/siguaApi";
import { loadCatalogs } from "@/lib/catalogCache";
import { getSistemas } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import type { CuentaGenerica, RegistroBitacora, SiguaFilters, Sistema } from "@/types/sigua";
import { Search, Download, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";

const TURNOS = [
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
  { value: "nocturno", label: "Nocturno" },
  { value: "mixto", label: "Mixto" },
] as const;

type TabMode = "registrar" | "consultar";

export default function SiguaBitacora() {
  const { can } = useAuth();
  const canView = can("sigua.bitacora.view");
  const canRegistrar = can("sigua.bitacora.registrar");

  const [tab, setTab] = useState<TabMode>("registrar");
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [catalogs, setCatalogs] = useState<{ sedes: Array<{ id: number; name: string }> }>({ sedes: [] });

  const [regSedeId, setRegSedeId] = useState<number | null>(null);
  const [regFecha, setRegFecha] = useState("");
  const [regTurno, setRegTurno] = useState<"matutino" | "vespertino" | "nocturno" | "mixto">("matutino");
  const [cuentasSede, setCuentasSede] = useState<CuentaGenerica[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [rows, setRows] = useState<Record<number, { agente_nombre: string; agente_num_empleado: string; sinUso: boolean }>>({});
  const [submitting, setSubmitting] = useState(false);

  const [consultarFilters, setConsultarFilters] = useState<SiguaFilters>({
    fecha: null,
    sede_id: null,
    sistema_id: null,
    turno: null,
  });
  const { data: bitacoraData, meta, loading, error, refetch, registrarBulk, registrarSinUso } = useBitacora(consultarFilters);

  useEffect(() => {
    getSistemas().then((r) => r.data && setSistemas(r.data));
    loadCatalogs().then((c: { sedes?: Array<{ id: number; name: string }> }) => setCatalogs({ sedes: c?.sedes ?? [] }));
  }, []);

  useEffect(() => {
    if (!regSedeId || tab !== "registrar") {
      setCuentasSede([]);
      setRows({});
      return;
    }
    setLoadingCuentas(true);
    getCuentas({ sede_id: regSedeId, estado: "activa" }, 1).then((res) => {
      const list = res.data && "data" in res.data ? (res.data as { data: CuentaGenerica[] }).data : [];
      const arr = Array.isArray(list) ? list : [];
      setCuentasSede(arr);
      setRows(arr.reduce((acc, c) => ({ ...acc, [c.id]: { agente_nombre: "", agente_num_empleado: "", sinUso: false } }), {} as Record<number, { agente_nombre: string; agente_num_empleado: string; sinUso: boolean }>));
      setLoadingCuentas(false);
    }).catch(() => setLoadingCuentas(false));
  }, [regSedeId, tab]);

  const updateRow = useCallback((cuentaId: number, field: "agente_nombre" | "agente_num_empleado" | "sinUso", value: string | boolean) => {
    setRows((prev) => ({
      ...prev,
      [cuentaId]: { ...prev[cuentaId], [field]: value },
    }));
  }, []);

  const handleRegistrarTurno = useCallback(async () => {
    if (!regSedeId || !regFecha || !regTurno) {
      notify.error("Completa sede, fecha y turno.");
      return;
    }
    const registros: Array<{ cuenta_generica_id: number; fecha: string; turno: typeof regTurno; agente_nombre: string; agente_num_empleado?: string | null }> = [];
    const sinUsoList: Array<{ cuenta_generica_id: number; fecha: string; turno: typeof regTurno; motivo?: string | null }> = [];
    cuentasSede.forEach((c) => {
      const r = rows[c.id];
      if (!r) return;
      if (r.sinUso) {
        sinUsoList.push({ cuenta_generica_id: c.id, fecha: regFecha, turno: regTurno });
      } else if (r.agente_nombre.trim()) {
        registros.push({
          cuenta_generica_id: c.id,
          fecha: regFecha,
          turno: regTurno,
          agente_nombre: r.agente_nombre.trim(),
          agente_num_empleado: r.agente_num_empleado?.trim() || null,
        });
      }
    });
    if (registros.length === 0 && sinUsoList.length === 0) {
      notify.error("Completa al menos un registro (agente o marcar Sin uso).");
      return;
    }
    setSubmitting(true);
    try {
      if (registros.length > 0) {
        const res = await registrarBulk(registros);
        if (res.error) {
          notify.error(res.error);
          setSubmitting(false);
          return;
        }
      }
      for (const payload of sinUsoList) {
        const res = await registrarSinUso(payload);
        if (res.error) notify.error(res.error);
      }
      notify.success("Turno registrado correctamente.");
      setRegFecha("");
      setRows(cuentasSede.reduce((acc, c) => ({ ...acc, [c.id]: { agente_nombre: "", agente_num_empleado: "", sinUso: false } }), {}));
    } finally {
      setSubmitting(false);
    }
  }, [regSedeId, regFecha, regTurno, rows, cuentasSede, registrarBulk, registrarSinUso]);

  const handleExport = useCallback(async () => {
    const res = await exportarBitacora(consultarFilters);
    if (res.error || !res.data) {
      notify.error(res.error ?? "Error al exportar");
      return;
    }
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitacora_${consultarFilters.fecha ?? "reporte"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success("Exportado correctamente");
  }, [consultarFilters]);

  if (!canView && !canRegistrar) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para bitácora SIGUA.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Bitácora" }]} />
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Bitácora</h1>
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            <button
              type="button"
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", tab === "registrar" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setTab("registrar")}
            >
              Registrar
            </button>
            <button
              type="button"
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", tab === "consultar" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setTab("consultar")}
            >
              Consultar
            </button>
          </div>
        </div>
      </div>

      {tab === "registrar" && (
        <Card className="border-border/60 overflow-hidden">
          <div className="p-4 border-b bg-muted/20 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sede</Label>
                <Select value={regSedeId != null ? String(regSedeId) : ""} onValueChange={(v) => setRegSedeId(v ? Number(v) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs.sedes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={regFecha} onChange={(e) => setRegFecha(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={regTurno} onValueChange={(v) => setRegTurno(v as typeof regTurno)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TURNOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="p-4">
            {!regSedeId ? (
              <p className="text-muted-foreground text-sm">Selecciona una sede para cargar las cuentas.</p>
            ) : loadingCuentas ? (
              <div className="flex items-center gap-2 py-8"><Loader2 className="h-5 w-5 animate-spin" /> Cargando cuentas…</div>
            ) : cuentasSede.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay cuentas activas en esta sede.</p>
            ) : (
              <>
                <div className="max-h-[400px] overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Cuenta</TableHead>
                        <TableHead>Agente (nombre)</TableHead>
                        <TableHead>No. empleado</TableHead>
                        <TableHead className="w-24">Sin uso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentasSede.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <span className="font-mono text-sm">{c.usuario_cuenta}</span>
                            <span className="text-muted-foreground text-xs block">{c.nombre_cuenta}</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-9"
                              placeholder="Nombre del agente"
                              value={rows[c.id]?.agente_nombre ?? ""}
                              onChange={(e) => updateRow(c.id, "agente_nombre", e.target.value)}
                              disabled={rows[c.id]?.sinUso}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-9"
                              placeholder="Opcional"
                              value={rows[c.id]?.agente_num_empleado ?? ""}
                              onChange={(e) => updateRow(c.id, "agente_num_empleado", e.target.value)}
                              disabled={rows[c.id]?.sinUso}
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={rows[c.id]?.sinUso ?? false}
                              onCheckedChange={(v) => updateRow(c.id, "sinUso", Boolean(v))}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleRegistrarTurno} disabled={submitting || !regFecha}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar turno completo
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {tab === "consultar" && (
        <Card className="border-border/60 overflow-hidden">
          <div className="p-4 flex flex-wrap gap-2 items-center border-b bg-muted/20">
            <Input
              type="date"
              className="w-[140px]"
              value={consultarFilters.fecha ?? ""}
              onChange={(e) => setConsultarFilters((p) => ({ ...p, fecha: e.target.value || null }))}
            />
            <Select
              value={consultarFilters.sede_id != null ? String(consultarFilters.sede_id) : "all"}
              onValueChange={(v) => setConsultarFilters((p) => ({ ...p, sede_id: v === "all" ? null : Number(v) }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {catalogs.sedes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={consultarFilters.sistema_id != null ? String(consultarFilters.sistema_id) : "all"}
              onValueChange={(v) => setConsultarFilters((p) => ({ ...p, sistema_id: v === "all" ? null : Number(v) }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sistemas.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={consultarFilters.turno ?? "all"}
              onValueChange={(v) => setConsultarFilters((p) => ({ ...p, turno: v === "all" ? null : v }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TURNOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch(1)} disabled={loading}>
              <Search className="h-4 w-4 mr-2" /> Buscar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Exportar Excel
            </Button>
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
                    <TableHead>Turno</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>No. Emp</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bitacoraData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No hay registros con los filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bitacoraData.map((b: RegistroBitacora) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.fecha ? new Date(b.fecha).toLocaleDateString("es-ES") : "—"}</TableCell>
                        <TableCell>{b.turno_label ?? b.turno}</TableCell>
                        <TableCell>{(b as RegistroBitacora & { sede?: { name?: string } }).sede?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{(b as RegistroBitacora & { sistema?: { name?: string } }).sistema?.name ?? `#${b.system_id}`}</TableCell>
                        <TableCell className="font-mono text-xs">{b.cuenta?.usuario_cuenta ?? b.account_id}</TableCell>
                        <TableCell>{b.agente_nombre}</TableCell>
                        <TableCell>{b.agente_num_empleado ?? "—"}</TableCell>
                        <TableCell>{b.supervisor?.name ?? "—"}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-muted-foreground">{b.observaciones ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {meta && meta.last_page > 1 && (
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Pág. {meta.current_page} de {meta.last_page}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={meta.current_page <= 1 || loading} onClick={() => refetch(meta.current_page - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page || loading} onClick={() => refetch(meta.current_page + 1)}>
                      Siguiente <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
