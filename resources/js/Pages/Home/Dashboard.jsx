import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getHubSummary } from "@/services/hubApi";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  LayoutDashboard,
  FileCheck,
  Ticket,
  UserX,
  Users,
  AlertTriangle,
  ArrowRight,
  Shield,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

function getSaludo() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const CHART_COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4"];

function HubTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-card-foreground">
      {label != null && label !== "" && (
        <p className="mb-2 border-b border-border pb-1 text-sm font-medium text-muted-foreground">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            {entry.color && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            )}
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold" style={entry.color ? { color: entry.color } : {}}>
              {typeof entry.value === "number" ? entry.value : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HubSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, variant = "default", hint }) {
  const variants = {
    default: "border-border bg-card shadow-sm",
    danger: "border-destructive/50 bg-card shadow-sm",
    warning: "border-amber-500/50 bg-card shadow-sm",
  };
  return (
    <Card className={cn("transition-all text-card-foreground", variants[variant] || variants.default)}>
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className="h-11 w-11 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clock, setClock] = useState({ dateLabel: "", timeLabel: "", saludo: getSaludo() });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock({
        dateLabel: now.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        timeLabel: now.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        saludo: getSaludo(),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchHub = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await getHubSummary();
    if (err) {
      setError(err);
      setData(null);
    } else {
      setData(res);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHub();
  }, [fetchHub]);

  const sigua = data?.sigua || {};
  const resolbeb = data?.resolbeb || {};
  const atencion = data?.atencion_inmediata || [];
  const agentes = data?.agentes_disponibles ?? 0;

  const pieCa01 = [
    { name: "Vigentes", value: sigua.ca01_vigentes ?? 0, color: CHART_COLORS[0] },
    { name: "Vencidos", value: sigua.ca01_vencidos ?? 0, color: CHART_COLORS[1] },
  ].filter((d) => d.value > 0);

  const barPrioridad = resolbeb.tickets_por_prioridad || [];

  const userName = user?.name || user?.first_name || "Usuario";

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4 pb-20 md:p-6">
        {/* Cabecera: bienvenida + reloj a la izquierda, Actualizar a la derecha */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={userName}
              avatarUrl={user?.avatar_url}
              avatarPath={user?.avatar_path}
              size={48}
              className="h-12 w-12 shrink-0 border-2 border-border"
            />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {clock.saludo}, {userName}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {clock.dateLabel}
              </p>
              <p className="text-base font-mono font-medium text-muted-foreground tabular-nums">
                {clock.timeLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHub()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
            Panel principal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vista consolidada de accesos (SIGUA) y tickets (RESOLBEB).
          </p>
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </CardContent>
          </Card>
        )}

        {loading && <HubSkeleton />}

        {!loading && data && (
          <>
            {/* KPIs superiores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="% Cumplimiento CA-01"
                value={sigua.porcentaje_ca01_firmados != null ? `${sigua.porcentaje_ca01_firmados}%` : "—"}
                icon={FileCheck}
                hint="Formatos de acceso firmados"
              />
              <KpiCard
                title="Tickets críticos activos"
                value={resolbeb.tickets_sla_vencido ?? 0}
                icon={Ticket}
                variant={resolbeb.tickets_sla_vencido > 0 ? "danger" : "default"}
                hint="SLA vencido"
              />
              <KpiCard
                title="Cuentas sin vincular"
                value={sigua.alertas_cuentas_sin_dueño ?? 0}
                icon={UserX}
                variant={sigua.alertas_cuentas_sin_dueño > 0 ? "warning" : "default"}
                hint="Sin responsable asignado"
              />
              <KpiCard
                title="Agentes disponibles"
                value={agentes}
                icon={Users}
                hint="Con área asignada"
              />
            </div>

            {/* Gráficas */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Salud formatos de acceso
                  </CardTitle>
                  <CardDescription>CA-01 vigentes vs vencidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {pieCa01.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieCa01}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieCa01.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<HubTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sin datos de CA-01
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    Tickets por prioridad
                  </CardTitle>
                  <CardDescription>Abiertos / en proceso</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {barPrioridad.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barPrioridad} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="prioridad" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<HubTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                          <Bar dataKey="total" name="Tickets" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sin tickets abiertos
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Atención inmediata */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Atención inmediata
                </CardTitle>
                <CardDescription>Los 5 riesgos más altos detectados hoy</CardDescription>
              </CardHeader>
              <CardContent>
                {atencion.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-muted-foreground">Título</TableHead>
                        <TableHead className="text-muted-foreground">Detalle</TableHead>
                        <TableHead className="w-[100px] text-right text-muted-foreground">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atencion.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {item.tipo === "acceso" ? "Acceso" : "Ticket"}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {item.titulo}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.detalle}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              to={item.enlace || "#"}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                            >
                              Ver <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No hay elementos que requieran atención inmediata.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!loading && !data && !error && (
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              No se pudieron cargar los datos del panel.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
