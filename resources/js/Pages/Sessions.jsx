import { useEffect, useState, useCallback } from "react";
import axios from "@/lib/axios";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Monitor, RefreshCw, UserCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 60 * 1000; // 1 minuto

export default function Sessions() {
    const [sessions, setSessions] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetchedAt, setLastFetchedAt] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get("/api/sessions");
            setSessions(data.sessions ?? []);
            setTotal(data.total ?? 0);
            setLastFetchedAt(Date.now());
        } catch (err) {
            setError(err?.response?.data?.message || "No se pudieron cargar las sesiones.");
            setSessions([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!lastFetchedAt) return;
        const t = setInterval(load, REFRESH_INTERVAL_MS);
        return () => clearInterval(t);
    }, [load, lastFetchedAt]);

    const formatLastActivity = (timestamp, iso = null) => {
        if (!timestamp) return { relative: "—", exact: "" };
        try {
            const date = new Date(timestamp * 1000);
            const relative = formatDistanceToNow(date, { addSuffix: true, locale: es });
            const exact = format(date, "dd/MM/yyyy HH:mm:ss", { locale: es });
            return { relative, exact };
        } catch {
            return { relative: "—", exact: "" };
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <Monitor className="h-8 w-8" />
                    Monitor de sesiones
                </h1>
                <p className="text-muted-foreground text-sm">
                    Sesiones con actividad reciente (cada petición al servidor actualiza la marca de tiempo). IP y navegador; no se almacenan datos sensibles.
                </p>
            </div>

            <Card className="border-border/60 bg-card/10 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle className="text-base uppercase font-bold">Sesiones activas</CardTitle>
                        <CardDescription>
                            {total} sesión{total !== 1 ? "es" : ""} (última petición al servidor dentro del tiempo de vida configurado)
                            {lastFetchedAt && (
                                <span className="block mt-0.5 text-muted-foreground/80">
                                    Lista actualizada {formatDistanceToNow(lastFetchedAt, { addSuffix: true, locale: es })}
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Actualizar
                    </Button>
                </CardHeader>
                <CardContent>
                    {error && (
                        <p className="text-destructive text-sm mb-4" role="alert">
                            {error}
                        </p>
                    )}
                    {loading && sessions.length === 0 ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <UserCircle className="h-12 w-12 mb-2 opacity-50" />
                            <p className="text-sm">No hay sesiones activas en este momento.</p>
                        </div>
                    ) : (
                        <TooltipProvider delayDuration={300}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[220px]">Usuario</TableHead>
                                        <TableHead>Última actividad (servidor)</TableHead>
                                        <TableHead>IP</TableHead>
                                        <TableHead>Navegador</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((s) => {
                                        const { relative, exact } = formatLastActivity(s.last_activity);
                                        return (
                                            <TableRow key={`${s.user_id}-${s.last_activity}-${s.ip_address}`}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar name={s.name} avatarPath={s.avatar_path} size={36} status="online" />
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <span className="font-medium truncate">{s.name}</span>
                                                            <span className="text-xs text-muted-foreground truncate">
                                                                {s.email || s.employee_number}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50">
                                                                {relative}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="font-normal">
                                                            {exact || "—"}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{s.ip_address || "—"}</TableCell>
                                                <TableCell>{s.browser || "—"}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TooltipProvider>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
