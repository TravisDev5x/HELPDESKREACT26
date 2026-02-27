import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useIncidentes } from "@/hooks/sigua";
import { getCuentas, getBitacora } from "@/services/siguaApi";
import { getSistemas } from "@/services/siguaApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
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
import type { Incidente, CuentaGenerica, SiguaFilters, Sistema } from "@/types/sigua";
import {
  Plus,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Eye,
  UserCheck,
  CheckCircle2,
  ArrowUpCircle,
} from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  abierto: "Abierto",
  investigando: "Investigando",
  resuelto: "Resuelto",
  escalado: "Escalado",
};

const ESTADO_VARIANTS: Record<string, string> = {
  abierto: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  investigando: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  resuelto: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  escalado: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
};

export default function SiguaIncidentes() {
  const { can } = useAuth();
  const canView = can("sigua.incidentes.view");
  const canManage = can("sigua.incidentes.manage");

  const [filters, setFilters] = useState<SiguaFilters>({ estado: null, sistema_id: null });
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [investigarId, setInvestigarId] = useState<number | null>(null);
  const [resolverId, setResolverId] = useState<number | null>(null);
  const [asignadoId, setAsignadoId] = useState("");
  const [resolucionText, setResolucionText] = useState("");
  const [agenteIdentificado, setAgenteIdentificado] = useState("");

  const [nuevoCuentaId, setNuevoCuentaId] = useState<number | null>(null);
  const [nuevoFecha, setNuevoFecha] = useState("");
  const [nuevoDescripcion, setNuevoDescripcion] = useState("");
  const [cuentasList, setCuentasList] = useState<CuentaGenerica[]>([]);
  const [bitacoraPreview, setBitacoraPreview] = useState<unknown[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);

  const { data, meta, loading, error, refetch, create, investigar, resolver, escalar, mutating } = useIncidentes(filters);

  useEffect(() => {
    getSistemas().then((r) => r.data && setSistemas(r.data));
    axios.get("/api/users", { params: { per_page: 300, user_status: "active" } }).then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setUsers(Array.isArray(list) ? list.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name })) : []);
    }).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!formOpen) return;
    getCuentas(null, 1).then((r) => {
      const list = r.data && "data" in r.data ? (r.data as { data: CuentaGenerica[] }).data : [];
      setCuentasList(Array.isArray(list) ? list : []);
    }).catch(() => setCuentasList([]));
  }, [formOpen]);

  useEffect(() => {
    if (!nuevoCuentaId) {
      setBitacoraPreview([]);
      return;
    }
    setLoadingCuentas(true);
    getBitacora({ cuenta_generica_id: nuevoCuentaId }, 1)
      .then((r) => {
        setBitacoraPreview(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => setBitacoraPreview([]))
      .finally(() => setLoadingCuentas(false));
  }, [nuevoCuentaId]);

  const cuentaOptions = useMemo(() => cuentasList, [cuentasList]);

  const handleCreate = useCallback(async () => {
    if (!nuevoCuentaId || !nuevoFecha || !nuevoDescripcion.trim()) {
      notify.error("Completa cuenta, fecha y descripción.");
      return;
    }
    const res = await create({
      cuenta_generica_id: nuevoCuentaId,
      fecha_incidente: nuevoFecha,
      descripcion: nuevoDescripcion.trim(),
    });
    if (res.error) {
      notify.error(res.error);
      return;
    }
    notify.success("Incidente registrado.");
    setFormOpen(false);
    setNuevoCuentaId(null);
    setNuevoFecha("");
    setNuevoDescripcion("");
    refetch(1);
  }, [nuevoCuentaId, nuevoFecha, nuevoDescripcion, create, refetch]);

  const handleInvestigar = useCallback(async () => {
    if (!investigarId || !asignadoId) return;
    const res = await investigar(investigarId, { asignado_a: Number(asignadoId) });
    setInvestigarId(null);
    setAsignadoId("");
    if (res.error) notify.error(res.error);
    else {
      notify.success("Incidente en investigación.");
      refetch(meta?.current_page ?? 1);
    }
  }, [investigarId, asignadoId, investigar, refetch, meta?.current_page]);

  const handleResolver = useCallback(async () => {
    if (!resolverId || !resolucionText.trim()) return;
    const res = await resolver(resolverId, { resolucion: resolucionText.trim(), agente_identificado: agenteIdentificado.trim() || null });
    setResolverId(null);
    setResolucionText("");
    setAgenteIdentificado("");
    if (res.error) notify.error(res.error);
    else {
      notify.success("Incidente resuelto.");
      refetch(meta?.current_page ?? 1);
    }
  }, [resolverId, resolucionText, agenteIdentificado, resolver, refetch, meta?.current_page]);

  const handleEscalar = useCallback(async (id: number) => {
    const res = await escalar(id);
    if (res.error) notify.error(res.error);
    else {
      notify.success("Incidente escalado.");
      refetch(meta?.current_page ?? 1);
    }
  }, [escalar, refetch, meta?.current_page]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver incidentes SIGUA.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Incidentes" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Incidentes SIGUA</h1>
            <p className="text-sm text-muted-foreground">Investigación sobre cuentas genéricas</p>
          </div>
          {canManage && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo incidente
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-2 border-b bg-muted/20">
          <Select value={filters.estado ?? "all"} onValueChange={(v) => setFilters((p) => ({ ...p, estado: v === "all" ? null : v }))}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.sistema_id != null ? String(filters.sistema_id) : "all"} onValueChange={(v) => setFilters((p) => ({ ...p, sistema_id: v === "all" ? null : Number(v) }))}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sistemas.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Agente identificado</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No hay incidentes.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row: Incidente) => {
                    const cuenta = row.cuenta;
                    const sistema = (row as unknown as { sistema?: { name?: string } }).sistema;
                    const asignado = row.asignado ?? (row as unknown as { asignadoA?: { name?: string } }).asignadoA;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">{row.fecha_incidente ? new Date(row.fecha_incidente).toLocaleDateString("es-ES") : "—"}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{cuenta?.usuario_cuenta ?? row.account_id}</span>
                          <span className="text-muted-foreground text-xs block">{cuenta?.nombre_cuenta ?? ""}</span>
                        </TableCell>
                        <TableCell>{sistema?.name ?? `#${row.system_id}`}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={row.descripcion}>{row.descripcion}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] font-semibold", ESTADO_VARIANTS[row.estado] ?? ESTADO_VARIANTS.abierto)}>
                            {ESTADO_LABELS[row.estado] ?? row.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{row.agente_identificado ?? "—"}</TableCell>
                        <TableCell className="text-xs">{asignado?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8" asChild title="Ver detalle">
                            <Link to={`/sigua/incidentes/${row.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          {canManage && row.estado === "abierto" && (
                            <Button variant="ghost" size="sm" className="h-8" onClick={() => setInvestigarId(row.id)}>
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {canManage && (row.estado === "abierto" || row.estado === "investigando") && (
                            <>
                              <Button variant="ghost" size="sm" className="h-8" onClick={() => setResolverId(row.id)}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8" onClick={() => handleEscalar(row.id)}>
                                <ArrowUpCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {meta && meta.last_page > 1 && (
              <div className="border-t px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pág. {meta.current_page} de {meta.last_page}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={meta.current_page <= 1 || loading} onClick={() => refetch(meta.current_page - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page || loading} onClick={() => refetch(meta.current_page + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal nuevo incidente */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nuevo incidente</DialogTitle>
            <DialogDescription>Selecciona la cuenta y describe el incidente. La bitácora de la cuenta se consulta automáticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cuenta genérica</Label>
              <Select value={nuevoCuentaId != null ? String(nuevoCuentaId) : ""} onValueChange={(v) => setNuevoCuentaId(v ? Number(v) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentaOptions.length === 0 && !nuevoCuentaId && (
                    <SelectItem value="_load" disabled>Cargando…</SelectItem>
                  )}
                  {cuentaOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.usuario_cuenta} — {c.nombre_cuenta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {nuevoCuentaId && loadingCuentas && <p className="text-xs text-muted-foreground">Cargando bitácora…</p>}
            {nuevoCuentaId && bitacoraPreview.length > 0 && (
              <div className="rounded border bg-muted/20 p-2 max-h-24 overflow-auto">
                <p className="text-xs font-medium text-muted-foreground mb-1">Últimos registros de bitácora (referencia)</p>
                <ul className="text-xs space-y-0.5">
                  {bitacoraPreview.slice(0, 5).map((b: unknown, i: number) => (
                    <li key={i}>{(b as { fecha?: string; agente_nombre?: string })?.fecha} — {(b as { agente_nombre?: string })?.agente_nombre}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <Label>Fecha incidente</Label>
              <Input type="date" value={nuevoFecha} onChange={(e) => setNuevoFecha(e.target.value)} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={nuevoDescripcion} onChange={(e) => setNuevoDescripcion(e.target.value)} placeholder="Describe el incidente..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={mutating || !nuevoCuentaId || !nuevoFecha || !nuevoDescripcion.trim()}>
              {mutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal investigar (asignar) */}
      <Dialog open={!!investigarId} onOpenChange={(o) => !o && setInvestigarId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pasar a investigación</DialogTitle>
            <DialogDescription>Asigna un responsable para investigar.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Asignado a</Label>
            <Select value={asignadoId} onValueChange={setAsignadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvestigarId(null)}>Cancelar</Button>
            <Button onClick={handleInvestigar} disabled={!asignadoId || mutating}>
              {mutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar e investigar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal resolver */}
      <Dialog open={!!resolverId} onOpenChange={(o) => !o && (setResolverId(null), setResolucionText(""), setAgenteIdentificado(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver incidente</DialogTitle>
            <DialogDescription>Indica la resolución y opcionalmente el agente identificado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Resolución *</Label>
              <Textarea value={resolucionText} onChange={(e) => setResolucionText(e.target.value)} placeholder="Descripción de la resolución..." rows={4} />
            </div>
            <div>
              <Label>Agente identificado (opcional)</Label>
              <Input value={agenteIdentificado} onChange={(e) => setAgenteIdentificado(e.target.value)} placeholder="Nombre del agente" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResolverId(null); setResolucionText(""); setAgenteIdentificado(""); }}>Cancelar</Button>
            <Button onClick={handleResolver} disabled={!resolucionText.trim() || mutating}>
              {mutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
