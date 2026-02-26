import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBitacora } from "@/hooks/sigua";
import { getCuentas, registrarBitacoraBulk, registrarSinUso } from "@/services/siguaApi";
import { loadCatalogs } from "@/lib/catalogCache";
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
import type { CuentaGenerica, RegistroBitacora } from "@/types/sigua";
import { Loader2, AlertTriangle, BookOpen } from "lucide-react";

const TURNOS = [
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
  { value: "nocturno", label: "Nocturno" },
  { value: "mixto", label: "Mixto" },
] as const;

function last7DaysFilters(): { fecha_desde: string; fecha_hasta: string } {
  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hace7.getDate() - 7);
  return {
    fecha_desde: hace7.toISOString().slice(0, 10),
    fecha_hasta: hoy.toISOString().slice(0, 10),
  };
}

export default function SiguaBitacoraSede() {
  const { user, can } = useAuth();
  const canSede = can("sigua.bitacora.sede");
  const canRegistrar = can("sigua.bitacora.registrar");

  const sedeId = user?.sede_id ?? (user as { sede?: { id?: number } })?.sede?.id ?? null;
  const sedeIdNum = sedeId != null ? Number(sedeId) : null;

  const [catalogs, setCatalogs] = useState<{ sedes: Array<{ id: number; name: string }> }>({ sedes: [] });
  const [regFecha, setRegFecha] = useState("");
  const [regTurno, setRegTurno] = useState<"matutino" | "vespertino" | "nocturno" | "mixto">("matutino");
  const [cuentasSede, setCuentasSede] = useState<CuentaGenerica[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [rows, setRows] = useState<Record<number, { agente_nombre: string; agente_num_empleado: string; sinUso: boolean }>>({});
  const [submitting, setSubmitting] = useState(false);

  const filters7 = useMemo(() => (sedeIdNum ? { sede_id: sedeIdNum, ...last7DaysFilters() } : null), [sedeIdNum]);
  const { data: bitacoraData, loading, error, refetch } = useBitacora(filters7);
  const dataList = Array.isArray(bitacoraData) ? bitacoraData : [];

  useEffect(() => {
    loadCatalogs().then((c: { sedes?: Array<{ id: number; name: string }> }) => setCatalogs({ sedes: c?.sedes ?? [] }));
  }, []);

  useEffect(() => {
    if (!sedeIdNum) {
      setCuentasSede([]);
      setRows({});
      return;
    }
    setLoadingCuentas(true);
    getCuentas({ sede_id: sedeIdNum, estado: "activa" }, 1).then((res) => {
      const list = res.data && "data" in res.data ? (res.data as { data: CuentaGenerica[] }).data : [];
      const arr = Array.isArray(list) ? list : [];
      setCuentasSede(arr);
      setRows(arr.reduce((acc, c) => ({ ...acc, [c.id]: { agente_nombre: "", agente_num_empleado: "", sinUso: false } }), {} as Record<number, { agente_nombre: string; agente_num_empleado: string; sinUso: boolean }>));
      setLoadingCuentas(false);
    }).catch(() => setLoadingCuentas(false));
  }, [sedeIdNum]);

  const updateRow = useCallback((cuentaId: number, field: "agente_nombre" | "agente_num_empleado" | "sinUso", value: string | boolean) => {
    setRows((prev) => ({ ...prev, [cuentaId]: { ...prev[cuentaId], [field]: value } }));
  }, []);

  const handleRegistrarTurno = useCallback(async () => {
    if (!sedeIdNum || !regFecha) {
      notify.error("Completa la fecha.");
      return;
    }
    const registros: Array<{ cuenta_generica_id: number; fecha: string; turno: typeof regTurno; agente_nombre: string; agente_num_empleado?: string | null }> = [];
    const sinUsoList: Array<{ cuenta_generica_id: number; fecha: string; turno: typeof regTurno; motivo?: string | null }> = [];
    cuentasSede.forEach((c) => {
      const r = rows[c.id];
      if (!r) return;
      if (r.sinUso) sinUsoList.push({ cuenta_generica_id: c.id, fecha: regFecha, turno: regTurno });
      else if (r.agente_nombre.trim())
        registros.push({
          cuenta_generica_id: c.id,
          fecha: regFecha,
          turno: regTurno,
          agente_nombre: r.agente_nombre.trim(),
          agente_num_empleado: r.agente_num_empleado?.trim() || null,
        });
    });
    if (registros.length === 0 && sinUsoList.length === 0) {
      notify.error("Completa al menos un registro (agente o Sin uso).");
      return;
    }
    setSubmitting(true);
    try {
      if (registros.length > 0) {
        const res = await registrarBitacoraBulk(registros);
        if (res.error) {
          notify.error(res.error);
          setSubmitting(false);
          return;
        }
      }
      for (const payload of sinUsoList) {
        await registrarSinUso(payload);
      }
      notify.success("Turno registrado.");
      setRegFecha("");
      setRows(cuentasSede.reduce((acc, c) => ({ ...acc, [c.id]: { agente_nombre: "", agente_num_empleado: "", sinUso: false } }), {}));
      refetch();
    } finally {
      setSubmitting(false);
    }
  }, [sedeIdNum, regFecha, regTurno, rows, cuentasSede, refetch]);

  const sedeName = useMemo(() => catalogs.sedes.find((s) => s.id === sedeIdNum)?.name ?? `Sede #${sedeIdNum}`, [catalogs.sedes, sedeIdNum]);

  if (!canSede && !canRegistrar) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para bitácora por sede.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  if (sedeIdNum == null) {
    return (
      <div className="p-6">
        <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-amber-600" />
          <p className="text-center text-muted-foreground">No tienes sede asignada. Contacta al administrador para usar la bitácora por sede.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs
          items={[
            { label: "Bitácora", to: "/sigua/bitacora" },
            { label: `Bitácora · ${sedeName}` },
          ]}
        />
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Bitácora — {sedeName}
        </h1>
        <p className="text-sm text-muted-foreground">Registro y consulta de los últimos 7 días.</p>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="text-sm font-semibold mb-3">Registrar turno</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          {loadingCuentas ? (
            <div className="flex items-center gap-2 py-8"><Loader2 className="h-5 w-5 animate-spin" /> Cargando cuentas…</div>
          ) : cuentasSede.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay cuentas activas en esta sede.</p>
          ) : (
            <>
              <div className="max-h-[320px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Agente</TableHead>
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
                            placeholder="Nombre agente"
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
              <div className="mt-4">
                <Button onClick={handleRegistrarTurno} disabled={submitting || !regFecha}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar turno completo
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="text-sm font-semibold">Últimos 7 días</h2>
        </div>
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Fecha</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Supervisor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay registros en los últimos 7 días.
                  </TableCell>
                </TableRow>
              ) : (
                dataList.map((b: RegistroBitacora) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.fecha ? new Date(b.fecha).toLocaleDateString("es-ES") : "—"}</TableCell>
                    <TableCell>{b.turno_label ?? b.turno}</TableCell>
                    <TableCell className="font-mono text-xs">{b.cuenta?.usuario_cuenta ?? b.account_id}</TableCell>
                    <TableCell>{b.agente_nombre}</TableCell>
                    <TableCell>{b.supervisor?.name ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
