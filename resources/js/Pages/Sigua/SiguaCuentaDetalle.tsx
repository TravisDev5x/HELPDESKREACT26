import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCuenta, getBitacora, getIncidentes } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { CuentaGenerica, FormatoCA01, RegistroBitacora, Incidente } from "@/types/sigua";
import {
  BookOpen,
  FileCheck,
  AlertTriangle,
  User,
  Building2,
  MapPin,
  Megaphone,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  activa: "Activa",
  suspendida: "Suspendida",
  baja: "Baja",
};

const ESTADO_CLASS: Record<string, string> = {
  activa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  suspendida: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  baja: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

export default function SiguaCuentaDetalle() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canView = can("sigua.cuentas.view");

  const [cuentaData, setCuentaData] = useState<CuentaGenerica | null>(null);
  const [cuentaError, setCuentaError] = useState<string | null>(null);
  const [bitacoraList, setBitacoraList] = useState<RegistroBitacora[]>([]);
  const [incidentesList, setIncidentesList] = useState<Incidente[]>([]);
  const [loadingBitacora, setLoadingBitacora] = useState(false);
  const [loadingIncidentes, setLoadingIncidentes] = useState(false);

  useEffect(() => {
    if (!id || !canView) return;
    setCuentaError(null);
    getCuenta(Number(id)).then((res) => {
      if (res.error) setCuentaError(res.error);
      else if (res.data) setCuentaData(res.data);
    });
  }, [id, canView]);

  useEffect(() => {
    if (!id) return;
    setLoadingBitacora(true);
    getBitacora({ cuenta_generica_id: Number(id) }, 1).then((res) => {
      const list = res.data && "data" in res.data ? (res.data as { data: RegistroBitacora[] }).data : [];
      setBitacoraList(Array.isArray(list) ? list : []);
      setLoadingBitacora(false);
    }).catch(() => setLoadingBitacora(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingIncidentes(true);
    getIncidentes({ cuenta_generica_id: Number(id) }, 1).then((res) => {
      const list = res.data && "data" in res.data ? (res.data as { data: Incidente[] }).data : [];
      setIncidentesList(Array.isArray(list) ? list : []);
      setLoadingIncidentes(false);
    }).catch(() => setLoadingIncidentes(false));
  }, [id]);

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver esta cuenta.</p>
          <Button asChild variant="outline"><Link to="/sigua/cuentas">Volver al listado</Link></Button>
        </Card>
      </div>
    );
  }

  if (cuentaError && !cuentaData) {
    return (
      <div className="p-6">
        <Card className="p-8 flex flex-col items-center gap-4">
          <p className="text-destructive">{cuentaError}</p>
          <Button asChild variant="outline"><Link to="/sigua/cuentas">Volver al listado</Link></Button>
        </Card>
      </div>
    );
  }

  if (!cuentaData) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const formatosCA01 = (cuentaData as unknown as { formatos_ca01?: FormatoCA01[]; formatosCA01?: FormatoCA01[] }).formatos_ca01
    ?? (cuentaData as unknown as { formatosCA01?: FormatoCA01[] }).formatosCA01
    ?? [];
  const ca01Vigente = (cuentaData as unknown as { ca01_vigente?: FormatoCA01[]; ca01Vigente?: FormatoCA01[] }).ca01_vigente
    ?? (cuentaData as unknown as { ca01Vigente?: FormatoCA01[] }).ca01Vigente;
  const vigente = Array.isArray(ca01Vigente) ? ca01Vigente[0] : ca01Vigente;

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs
          items={[
            { label: "Cuentas genéricas", to: "/sigua/cuentas" },
            { label: cuentaData.nombre_cuenta },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sigua/cuentas" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{cuentaData.nombre_cuenta}</h1>
            <Badge variant="outline" className={cn("font-semibold uppercase text-[10px]", ESTADO_CLASS[cuentaData.estado] ?? ESTADO_CLASS.activa)}>
              {ESTADO_LABELS[cuentaData.estado] ?? cuentaData.estado}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Datos de la cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Usuario / Cuenta</span>
              <span className="font-mono font-medium">{cuentaData.usuario_cuenta}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Sistema</span>
              <Badge variant="outline" className="text-xs">{cuentaData.sistema?.name ?? cuentaData.system_id}</Badge>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Sede</span>
              <span>{cuentaData.sede?.name ?? cuentaData.sede_id}</span>
            </div>
            {cuentaData.campaign && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Campaña</span>
                <span>{cuentaData.campaign.name}</span>
              </div>
            )}
            {cuentaData.isla && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Isla</span>
                <span>{cuentaData.isla}</span>
              </div>
            )}
            {cuentaData.perfil && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Perfil</span>
                <span>{cuentaData.perfil}</span>
              </div>
            )}
            {cuentaData.ou_ad && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">OU AD</span>
                <span className="font-mono text-xs">{cuentaData.ou_ad}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4" /> CA-01 vigente
            </CardTitle>
            <CardDescription>Formato actual asociado a esta cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            {vigente ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vigente hasta</span>
                  <span className="font-medium">{new Date(vigente.fecha_vencimiento).toLocaleDateString("es-ES")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firma</span>
                  <span>{new Date(vigente.fecha_firma).toLocaleDateString("es-ES")}</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Vigente</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin formato CA-01 vigente.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> CA-01 históricos
          </CardTitle>
          <CardDescription>Formatos en los que ha participado esta cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          {formatosCA01.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formatosCA01.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">#{f.id}</TableCell>
                    <TableCell>{new Date(f.fecha_firma).toLocaleDateString("es-ES")}</TableCell>
                    <TableCell>{new Date(f.fecha_vencimiento).toLocaleDateString("es-ES")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={f.estado === "vigente" ? "bg-emerald-500/10" : "bg-muted"}>
                        {f.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No hay formatos CA-01 registrados.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Últimos registros de bitácora
          </CardTitle>
          <CardDescription>Registros recientes para esta cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBitacora ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : bitacoraList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bitacoraList.slice(0, 10).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{new Date(b.fecha).toLocaleDateString("es-ES")}</TableCell>
                    <TableCell>{b.turno_label ?? b.turno}</TableCell>
                    <TableCell>{b.agente_nombre}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{b.observaciones ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No hay registros de bitácora.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Incidentes relacionados
          </CardTitle>
          <CardDescription>Incidentes reportados para esta cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIncidentes ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : incidentesList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidentesList.slice(0, 10).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">#{i.id}</TableCell>
                    <TableCell>{new Date(i.fecha_incidente).toLocaleDateString("es-ES")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{i.estado}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">{i.descripcion}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/incidents/${i.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No hay incidentes registrados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
