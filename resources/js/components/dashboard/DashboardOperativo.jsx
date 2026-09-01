import { useCallback, useEffect, useMemo, useState } from "react";
import NavLink from "@/components/NavLink";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { kpiCardSurface, hintWarning } from "@/lib/badgeStyles";
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Flame,
    RefreshCw,
    Ticket,
    User,
    UserCheck,
    Users,
} from "lucide-react";

const LIST_BASE = "/resolbeb/tickets";
const PER_PAGE = 40;

const COPY = {
    supervisor: {
        title: "Panel de supervisión",
        subtitle: "Todos los tickets del sistema y quién los está atendiendo.",
        listTitle: "Tickets en general",
        listHint: "Vista global para gerentes y supervisores.",
    },
    soporte: {
        title: "Panel de soporte",
        subtitle: "Solicitudes de usuarios en tu ámbito (área / sede asignada).",
        listTitle: "Cola de solicitudes",
        listHint: "Tickets de solicitantes que puedes atender o escalar.",
    },
};

/**
 * Dashboard operativo: gerentes, supervisores y soporte (L1–L3).
 */
export function DashboardOperativo({ variant = "soporte" }) {
    const { user } = useAuth();
    const copy = COPY[variant] ?? COPY.soporte;
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [queue, setQueue] = useState("action");

    const loadTickets = useCallback(() => {
        setLoading(true);
        const params = { per_page: PER_PAGE };
        if (variant === "supervisor") {
            // manage_all: sin filtro → todos los tickets visibles por policy
        } else {
            // soporte: API aplica alcance por área (view_area)
        }
        axios
            .get("/api/tickets", { params })
            .then((res) => setTickets(res.data?.data ?? []))
            .catch(() => setTickets([]))
            .finally(() => setLoading(false));
    }, [variant]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const stats = useMemo(() => {
        const open = tickets.filter((t) => {
            const code = (t.state?.code ?? "").toLowerCase();
            return !["cerrado", "resuelto", "cancelado"].includes(code);
        });
        const unassigned = open.filter((t) => !(t.assigned_user || t.assignedUser));
        const mine = open.filter((t) => Number((t.assigned_user || t.assignedUser)?.id) === Number(user?.id));
        const atRisk = open.filter((t) => t.is_overdue || t.is_burned);
        const waiting = open.filter((t) => /espera|waiting/.test((t.state?.code ?? "").toLowerCase()));
        return { total: tickets.length, open: open.length, unassigned: unassigned.length, mine: mine.length, atRisk: atRisk.length, waiting: waiting.length };
    }, [tickets, user?.id]);

    const queueTickets = useMemo(() => {
        const open = tickets.filter((t) => !["cerrado", "resuelto", "cancelado"].includes((t.state?.code ?? "").toLowerCase()));
        const visible = {
            action: open.filter((t) => !(t.assigned_user || t.assignedUser)),
            mine: open.filter((t) => Number((t.assigned_user || t.assignedUser)?.id) === Number(user?.id)),
            risk: open.filter((t) => t.is_overdue || t.is_burned),
            waiting: open.filter((t) => /espera|waiting/.test((t.state?.code ?? "").toLowerCase())),
        }[queue] ?? open;

        return [...visible].sort((a, b) => {
            const riskA = Number(Boolean(a.is_overdue || a.is_burned));
            const riskB = Number(Boolean(b.is_overdue || b.is_burned));
            if (riskA !== riskB) return riskB - riskA;
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });
    }, [queue, tickets, user?.id]);

    const queueMeta = {
        action: { label: "Para tomar", count: stats.unassigned, href: `${LIST_BASE}?assignment=unassigned`, icon: UserCheck, tone: "text-primary" },
        mine: { label: "Mis tickets", count: stats.mine, href: `${LIST_BASE}?assignment=me`, icon: User, tone: "text-sky-600 dark:text-sky-400" },
        risk: { label: "SLA en riesgo", count: stats.atRisk, href: `${LIST_BASE}?sla=overdue`, icon: Flame, tone: "text-destructive" },
        waiting: { label: "En espera", count: stats.waiting, href: LIST_BASE, icon: Clock3, tone: "text-amber-600 dark:text-amber-400" },
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
                    {user?.name && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Hola, <span className="font-medium text-foreground">{user.name}</span>
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={loadTickets} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Actualizar
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                        <NavLink href="/resolbeb/tickets">Ver listado completo</NavLink>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <NavLink href="/calendar">
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Calendario
                        </NavLink>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Ticket className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">En esta vista</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", kpiCardSurface.warning.icon)}>
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Abiertos</p>
                            <p className="text-2xl font-bold">{stats.open}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Sin asignar</p>
                            <p className="text-2xl font-bold">{stats.unassigned}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <Flame className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">SLA en riesgo</p>
                            <p className="text-2xl font-bold">{stats.atRisk}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{copy.listTitle}</CardTitle>
                    <CardDescription className="text-xs">{copy.listHint} Elige una cola para decidir qué atender ahora.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={queue} onValueChange={setQueue} className="mb-4">
                        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/70 p-1">
                            {Object.entries(queueMeta).map(([key, item]) => {
                                const Icon = item.icon;
                                return (
                                    <TabsTrigger key={key} value={key} className="shrink-0 gap-1.5 px-2.5 text-xs">
                                        <Icon className={cn("h-3.5 w-3.5", item.tone)} />
                                        {item.label}
                                        <Badge variant="secondary" className="h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums">{item.count}</Badge>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-md" />
                            ))}
                        </div>
                    ) : queueTickets.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No hay tickets en esta cola.
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {queueTickets.slice(0, 8).map((t) => {
                                const assigned = t.assigned_user || t.assignedUser;
                                const requester =
                                    t.requester ||
                                    t.requester_user ||
                                    t.created_by_user ||
                                    t.user;
                                return (
                                    <li key={t.id} className="py-3 first:pt-0">
                                        <NavLink
                                            href={`${LIST_BASE}/${t.id}`}
                                            className="block rounded-md hover:bg-muted/40 -mx-1 px-2 py-1 transition-colors"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="font-medium text-sm">
                                                    #{String(t.id).padStart(5, "0")} — {t.subject}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {t.state?.name ?? "—"}
                                                </Badge>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    Solicitante:{" "}
                                                    <span className="text-foreground/90 font-medium">
                                                        {requester?.name ?? "—"}
                                                    </span>
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    Atiende:{" "}
                                                    <span
                                                        className={cn(
                                                            "font-medium",
                                                            assigned
                                                                ? "text-foreground/90"
                                                                : hintWarning
                                                        )}
                                                    >
                                                        {assigned?.name ?? "Sin asignar"}
                                                    </span>
                                                </span>
                                                {t.priority?.name && (
                                                    <span>Prioridad: {t.priority.name}</span>
                                                )}
                                                {(t.is_overdue || t.is_burned) && (
                                                    <span className="inline-flex items-center gap-1 text-destructive font-medium">
                                                        <Flame className="h-3 w-3" /> SLA en riesgo
                                                    </span>
                                                )}
                                            </div>
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {!loading && queueTickets.length > 0 && (
                        <div className="mt-4 flex justify-end">
                            <Button asChild variant="outline" size="sm">
                                <NavLink href={queueMeta[queue].href}>
                                    Ver cola completa
                                    <CheckCircle2 className="ml-2 h-4 w-4" />
                                </NavLink>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
