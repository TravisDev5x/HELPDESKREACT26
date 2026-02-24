/**
 * Calendario único de tickets. Visible para todos los roles desde la sidebar (/calendario).
 * Contenido según permisos (RBAC):
 * - Solicitante (solo view_own): histórico = tickets creados por el usuario. Fecha base: created_at.
 * - Operativo/soporte/admin (view_area o manage_all): por defecto = asignados a mí; filtros: Creados por mí, Todos los que puedo ver.
 * Diseño preparado para futuras vistas por updated_at o due_date sin romper lo actual.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarDays, Ticket, AlertCircle, ShieldOff } from "lucide-react";

const CALENDAR_PER_PAGE = 500;

function toDateKey(d) {
    if (!d) return "";
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

/** Fecha base para marcar días en el calendario (documentado: created_at; extensible a updated_at / due_date). */
function getCalendarDate(ticket) {
    return ticket?.created_at ?? null;
}

export default function Calendario() {
    const { user, can } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(undefined);
    const [sortOrder, setSortOrder] = useState("recent");
    const [stateFilter, setStateFilter] = useState("all");

    // Rol/permisos: solicitante solo view_own; operativo tiene view_area o manage_all
    const isOperativo = useMemo(() => can("tickets.view_area") || can("tickets.manage_all"), [can]);
    const isSolicitante = useMemo(() => !isOperativo && can("tickets.view_own"), [isOperativo, can]);

    // Scope para operativos: assigned (default) | created | all. Solicitante siempre "created" (implícito).
    const [scope, setScope] = useState("assigned");

    const buildParams = useCallback(() => {
        const params = { per_page: CALENDAR_PER_PAGE };
        if (isSolicitante) {
            // Policy ya restringe a requester_id = user.id
            return params;
        }
        if (isOperativo) {
            if (scope === "assigned") params.assigned_to = "me";
            else if (scope === "created") params.created_by = "me";
            // scope === "all" → no params extra
        }
        return params;
    }, [isSolicitante, isOperativo, scope]);

    const loadTickets = useCallback(() => {
        if (!can("tickets.view_own") && !can("tickets.view_area") && !can("tickets.manage_all")) {
            setTickets([]);
            setLoading(false);
            setError("no_permission");
            return;
        }
        setLoading(true);
        setError(null);
        axios
            .get("/api/tickets", { params: buildParams() })
            .then((res) => setTickets(res.data?.data ?? []))
            .catch((err) => {
                if (err?.response?.status === 403) {
                    setError("no_permission");
                    setTickets([]);
                } else {
                    setError("load_failed");
                    setTickets([]);
                }
            })
            .finally(() => setLoading(false));
    }, [can, buildParams]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const ticketDatesSet = useMemo(() => {
        const set = new Set();
        (tickets || []).forEach((t) => {
            const at = getCalendarDate(t);
            if (at) set.add(toDateKey(at));
        });
        return set;
    }, [tickets]);

    const modifiers = useMemo(
        () => ({
            hasTicket: (date) => ticketDatesSet.has(toDateKey(date)),
        }),
        [ticketDatesSet]
    );

    const modifiersClassNames = useMemo(
        () => ({
            hasTicket: "bg-primary/20 text-primary font-semibold ring-1 ring-primary/40",
        }),
        []
    );

    const ticketsToShow = useMemo(() => {
        if (!selectedDate) return tickets;
        const key = toDateKey(selectedDate);
        return tickets.filter((t) => {
            const at = getCalendarDate(t);
            return at && toDateKey(at) === key;
        });
    }, [tickets, selectedDate]);

    const ticketsFilteredByState = useMemo(() => {
        if (stateFilter === "all") return ticketsToShow;
        return ticketsToShow.filter((t) => {
            const code = (t.state?.code ?? "").toLowerCase();
            if (stateFilter === "open") return code === "abierto";
            if (stateFilter === "progress") return ["en_progreso", "en progreso", "en_espera"].includes(code);
            if (stateFilter === "resolved") return code === "cerrado" || code === "resuelto";
            return true;
        });
    }, [ticketsToShow, stateFilter]);

    const sortedTicketsToShow = useMemo(() => {
        const list = [...ticketsFilteredByState];
        list.sort((a, b) => {
            const da = new Date(a.created_at || 0).getTime();
            const db = new Date(b.created_at || 0).getTime();
            return sortOrder === "recent" ? db - da : da - db;
        });
        return list;
    }, [ticketsFilteredByState, sortOrder]);

    const scopeLabel = useMemo(() => {
        if (isSolicitante) return "Mis tickets (creados por mí)";
        if (scope === "assigned") return "Asignados a mí";
        if (scope === "created") return "Creados por mí";
        return "Todos los que puedo ver";
    }, [isSolicitante, scope]);

    if (!user) return null;

    if (error === "no_permission") {
        return (
            <div className="w-full max-w-2xl mx-auto p-6">
                <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10">
                    <CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-4">
                        <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-4">
                            <ShieldOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground">Sin acceso al calendario de tickets</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Necesitas permiso para ver tickets para usar esta vista. Contacta al administrador si crees que deberías tener acceso.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" /> Calendario de tickets
                    </CardTitle>
                    <CardDescription>
                        {isSolicitante
                            ? "Días en los que creaste tickets. Clic en un día para ver el detalle abajo."
                            : "Días con tickets según el criterio elegido. Clic en un día para filtrar la lista."}
                        {" "}
                        <span className="text-muted-foreground/80">(Fecha base: fecha de creación del ticket.)</span>
                    </CardDescription>
                    {isOperativo && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {[
                                { value: "assigned", label: "Asignados a mí" },
                                { value: "created", label: "Creados por mí" },
                                { value: "all", label: "Todos los que puedo ver" },
                            ].map((opt) => (
                                <Button
                                    key={opt.value}
                                    type="button"
                                    variant={scope === opt.value ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setScope(opt.value)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="flex justify-center">
                    {loading ? (
                        <Skeleton className="h-[280px] w-[320px] rounded-lg" />
                    ) : (
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            modifiers={modifiers}
                            modifiersClassNames={modifiersClassNames}
                            className="rounded-lg border border-border/50 p-3 bg-muted/20"
                        />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Ticket className="h-4 w-4" /> {scopeLabel}
                            {selectedDate && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                    {selectedDate.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {selectedDate
                                ? "Tickets del día seleccionado."
                                : "Listado según el criterio activo. Haz clic en un día del calendario para filtrar."}
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {!selectedDate && ticketsToShow.length > 0 && (
                            <Select value={sortOrder} onValueChange={setSortOrder}>
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Más recientes primero</SelectItem>
                                    <SelectItem value="oldest">Más antiguos primero</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        {selectedDate && (
                            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>
                                Ver todos
                            </Button>
                        )}
                    </div>
                </CardHeader>
                {!selectedDate && ticketsToShow.length > 0 && (
                    <div className="px-6 pb-2 flex flex-wrap gap-1">
                        {[
                            { value: "all", label: "Todos" },
                            { value: "open", label: "Abiertos" },
                            { value: "progress", label: "En progreso" },
                            { value: "resolved", label: "Resueltos" },
                        ].map((tab) => (
                            <Button
                                key={tab.value}
                                type="button"
                                variant={stateFilter === tab.value ? "secondary" : "ghost"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setStateFilter(tab.value)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                )}
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : error === "load_failed" ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No se pudieron cargar los tickets. Vuelve a intentarlo más tarde.
                        </p>
                    ) : tickets.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            {isSolicitante
                                ? "Aún no has creado ningún ticket. Cuando lo hagas, aparecerán aquí y en el calendario."
                                : "No hay tickets que coincidan con el criterio seleccionado."}
                        </p>
                    ) : sortedTicketsToShow.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            {selectedDate ? "No hay tickets en esta fecha." : "Ningún ticket coincide con el filtro."}
                            {selectedDate && (
                                <Button variant="link" className="ml-1 h-auto p-0" onClick={() => setSelectedDate(undefined)}>
                                    Ver todos
                                </Button>
                            )}
                            {!selectedDate && stateFilter !== "all" && (
                                <Button variant="link" className="ml-1 h-auto p-0" onClick={() => setStateFilter("all")}>
                                    Quitar filtro
                                </Button>
                            )}
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {sortedTicketsToShow.map((t) => {
                                const assigned = t.assigned_user || t.assignedUser;
                                const unassigned = !assigned;
                                const overdue = Boolean(t.is_overdue);
                                const lastAt = t.updated_at || t.created_at;
                                return (
                                    <li
                                        key={t.id}
                                        className={cn(
                                            "py-3 first:pt-0",
                                            (unassigned || overdue) && "border-l-2 border-l-transparent",
                                            unassigned && "border-l-amber-500/50",
                                            overdue && "border-l-destructive/50"
                                        )}
                                    >
                                        <Link
                                            to={`/tickets/${t.id}`}
                                            className="flex flex-wrap items-center justify-between gap-2 hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded transition-colors block"
                                        >
                                            <span className="font-medium text-foreground">
                                                #{String(t.id).padStart(5, "0")} — {t.subject}
                                            </span>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {unassigned && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400" title="Sin asignar">
                                                        <AlertCircle className="h-3.5 w-3.5" /> Sin asignar
                                                    </span>
                                                )}
                                                {assigned && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {assigned.name}
                                                    </span>
                                                )}
                                                {t.state?.name && (
                                                    <Badge variant="outline" className="text-[10px] font-normal">
                                                        {t.state.name}
                                                    </Badge>
                                                )}
                                                {lastAt && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Actualizado: {new Date(lastAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
