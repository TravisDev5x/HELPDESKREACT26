import { useCallback, useEffect, useMemo, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { BellOff, CheckCheck, ChevronRight, CircleAlert, Info, ShieldAlert } from "lucide-react";
import axios from "@/lib/axios";
import AuthenticatedLayout from "@/Inertia/Layouts/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const FILTERS = [
    { value: "all", label: "Todas" },
    { value: "unread", label: "No leídas" },
    { value: "action_required", label: "Requieren atención" },
    { value: "critical", label: "Importantes" },
    { value: "security", label: "Seguridad" },
];

function metaFor(notification) {
    const data = notification.data || {};
    const kind = notification.meta?.kind || data.kind || "general";
    const ticketId = data.ticket_id;
    const severity = notification.meta?.severity || (
        ["ticket_escalated", "tenant_boundary_violation"].includes(kind)
            ? "critical"
            : ["ticket_assigned", "ticket_reassigned", "ticket_requester_alert", "ticket_requester_comment", "pending_ticket_request", "client_self_service_request", "oauth_auto_link"].includes(kind)
                ? "action_required"
                : "information"
    );

    return {
        severity,
        href: notification.meta?.href || data.href || (ticketId ? `/resolbeb/tickets/${ticketId}` : null),
        actionLabel: notification.meta?.action_label || (ticketId ? "Ver ticket" : "Abrir"),
    };
}

function titleFor(notification) {
    const data = notification.data || {};
    if (data.message) return data.message;
    if (data.subject && data.action) return `${data.action === "created" ? "Creado" : "Actualizado"}: ${data.subject}`;
    if (data.ticket_id) return `Ticket #${data.ticket_id}`;
    return "Notificación";
}

function relativeTime(value) {
    if (!value) return "";
    const date = new Date(value);
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `Hace ${minutes} min`;
    if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)} h`;
    return date.toLocaleDateString();
}

function Severity({ severity }) {
    const config = {
        critical: { label: "Importante", icon: ShieldAlert, className: "bg-destructive/10 text-destructive border-destructive/20" },
        action_required: { label: "Requiere atención", icon: CircleAlert, className: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400" },
        information: { label: "Información", icon: Info, className: "bg-primary/10 text-primary border-primary/20" },
    }[severity] || {};
    const Icon = config.icon || Info;

    return (
        <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium", config.className)}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </span>
    );
}

export default function NotificationsIndex() {
    const { auth, realtime } = usePage().props;
    const [filter, setFilter] = useState("all");
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState(() => ({
        realtime: auth?.user?.notification_preferences?.realtime ?? true,
        informational: auth?.user?.notification_preferences?.informational ?? true,
    }));

    const load = useCallback(async (activeFilter = filter) => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/notifications", {
                params: { limit: 100, filter: activeFilter },
            });
            setNotifications(data?.notifications || []);
            setUnreadCount(data?.unread_count || 0);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { load(filter); }, [filter, load]);

    const markRead = async (id) => {
        const item = notifications.find((notification) => notification.id === id);
        if (!item || item.read_at) return;

        await axios.post(`/api/notifications/${id}/read`);
        setNotifications((current) => current.map((notification) => (
            notification.id === id ? { ...notification, read_at: new Date().toISOString() } : notification
        )));
        setUnreadCount((current) => Math.max(0, current - 1));
    };

    const markAllRead = async () => {
        await axios.post("/api/notifications/read-all");
        setNotifications((current) => current.map((notification) => ({ ...notification, read_at: new Date().toISOString() })));
        setUnreadCount(0);
    };

    const savePreference = async (key, value) => {
        const previous = preferences;
        const next = { ...preferences, [key]: value };
        setPreferences(next);

        try {
            await axios.put("/api/profile/preferences", {
                notification_preferences: next,
            });
        } catch {
            setPreferences(previous);
        }
    };

    const emptyText = useMemo(() => (
        filter === "unread" ? "Ya revisaste todo." : "No hay notificaciones para este filtro."
    ), [filter]);

    return (
        <>
            <Head title="Notificaciones" />
            <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
                <Card className="border-border/70 shadow-sm">
                    <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle>Centro de notificaciones</CardTitle>
                            <CardDescription className="mt-1">
                                Prioriza lo que requiere tu atención y conserva el contexto de cada aviso.
                            </CardDescription>
                        </div>
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={markAllRead}>
                                <CheckCheck className="h-4 w-4" />
                                Marcar {unreadCount} como leídas
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Tabs value={filter} onValueChange={setFilter}>
                            <TabsList className="h-auto w-full justify-start overflow-x-auto bg-muted/60 p-1">
                                {FILTERS.map((item) => (
                                    <TabsTrigger key={item.value} value={item.value} className="shrink-0 text-xs">
                                        {item.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2">
                            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                                <span>
                                    <span className="block text-sm font-medium">Avisos en tiempo real</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {realtime?.enabled ? "Actualiza la campana al instante." : "Se activarán cuando Reverb esté configurado."}
                                    </span>
                                </span>
                                <Switch checked={preferences.realtime} onCheckedChange={(value) => savePreference("realtime", value)} />
                            </label>
                            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                                <span>
                                    <span className="block text-sm font-medium">Actualizaciones informativas</span>
                                    <span className="block text-xs text-muted-foreground">Puedes ocultar cambios generales de tickets.</span>
                                </span>
                                <Switch checked={preferences.informational} onCheckedChange={(value) => savePreference("informational", value)} />
                            </label>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/70 shadow-sm">
                    {loading ? (
                        <div className="space-y-3 p-5">
                            {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />)}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
                            <BellOff className="h-10 w-10 text-muted-foreground/40" />
                            <p className="text-sm font-medium">{emptyText}</p>
                            <p className="max-w-sm text-sm text-muted-foreground">Las actualizaciones de tickets, seguridad y solicitudes aparecerán aquí.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/70">
                            {notifications.map((notification) => {
                                const meta = metaFor(notification);
                                const content = (
                                    <div className={cn(
                                        "flex gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5",
                                        !notification.read_at && "border-l-2 border-l-primary bg-muted/10",
                                        !notification.read_at && meta.severity === "critical" && "border-l-destructive",
                                        !notification.read_at && meta.severity === "action_required" && "border-l-amber-500"
                                    )}>
                                        <Severity severity={meta.severity} />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-sm font-medium leading-5">{titleFor(notification)}</p>
                                                <time className="shrink-0 text-xs text-muted-foreground">{relativeTime(notification.created_at)}</time>
                                            </div>
                                            {meta.href && <span className="inline-flex items-center text-xs font-medium text-primary">{meta.actionLabel}<ChevronRight className="h-3.5 w-3.5" /></span>}
                                            {!notification.read_at && !meta.href && <span className="text-xs text-muted-foreground">Selecciona para marcar como leída</span>}
                                        </div>
                                    </div>
                                );

                                return meta.href ? (
                                    <Link key={notification.id} href={meta.href} onClick={() => markRead(notification.id)} className="block">
                                        {content}
                                    </Link>
                                ) : (
                                    <button key={notification.id} type="button" className="block w-full" onClick={() => markRead(notification.id)}>
                                        {content}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}

NotificationsIndex.layout = (page) => <AuthenticatedLayout title="Notificaciones">{page}</AuthenticatedLayout>;
