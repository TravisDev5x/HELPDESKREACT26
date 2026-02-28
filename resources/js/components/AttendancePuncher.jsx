import { useEffect, useState, useCallback } from "react";
import axios from "@/lib/axios";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Loader2, LogIn, UtensilsCrossed, LogOut, Briefcase, Building2, BadgeCheck } from "lucide-react";

const ACTION_CONFIG = {
    clock_in: {
        label: "Registrar entrada",
        shortLabel: "Entrada",
        variant: "default",
        className: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700",
        icon: LogIn,
    },
    lunch_start: {
        label: "Inicio de comida",
        shortLabel: "Inicio comida",
        variant: "secondary",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25",
        icon: UtensilsCrossed,
    },
    lunch_end: {
        label: "Fin de comida",
        shortLabel: "Fin comida",
        variant: "secondary",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25",
        icon: UtensilsCrossed,
    },
    clock_out: {
        label: "Registrar salida",
        shortLabel: "Salida",
        variant: "destructive",
        className: "bg-red-600 hover:bg-red-700 text-white border-red-700 dark:bg-red-700 dark:hover:bg-red-800",
        icon: LogOut,
    },
};

function formatTime(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "—";
    }
}

export function AttendancePuncher() {
    const [state, setState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [punching, setPunching] = useState(false);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/attendance/status");
            setState(data);
        } catch (err) {
            notify.error(err.response?.data?.message || "Error al cargar estado de asistencia");
            setState(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handlePunch = async (actionOverride = null) => {
        if (!state?.next_action || punching) return;
        if (actionOverride && state.next_action !== "lunch_start") return;
        setPunching(true);
        try {
            const body = actionOverride ? { action: actionOverride } : {};
            const { data } = await axios.post("/api/attendance/punch", body);
            notify.success(data.message || "Registro guardado");
            setState((prev) => ({
                ...prev,
                attendance: data.attendance,
                next_action: data.next_action,
                can_skip_lunch: data.can_skip_lunch ?? false,
            }));
        } catch (err) {
            notify.error(err.response?.data?.message || "Error al registrar");
        } finally {
            setPunching(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Control de asistencia
                    </CardTitle>
                    <CardDescription>Cargando...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    const nextAction = state?.next_action ?? null;
    const config = nextAction ? ACTION_CONFIG[nextAction] : null;
    const IconComponent = config?.icon ?? Clock;

    return (
        <Card className="border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Control de asistencia
                </CardTitle>
                <CardDescription>
                    {state?.schedule?.today && !state.schedule.today.is_working_day && (
                        <span className="text-amber-600 dark:text-amber-400">Día no laboral</span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Horario asignado + Campaña, Área, Puesto */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu asignación</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <span className="text-muted-foreground block text-xs">Horario</span>
                                <span className="font-medium text-foreground truncate block">
                                    {state?.schedule?.name ?? "—"}
                                    {state?.schedule?.is_default && (
                                        <span className="text-muted-foreground font-normal"> (por defecto)</span>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <span className="text-muted-foreground block text-xs">Campaña</span>
                                <span className="font-medium text-foreground truncate block">{state?.campaign ?? "—"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <span className="text-muted-foreground block text-xs">Área</span>
                                <span className="font-medium text-foreground truncate block">{state?.area ?? "—"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <BadgeCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <span className="text-muted-foreground block text-xs">Puesto</span>
                                <span className="font-medium text-foreground truncate block">{state?.position ?? "—"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/50 p-2 border border-border">
                        <span className="text-muted-foreground block text-xs font-medium">Entrada</span>
                        <span className="font-mono font-medium">{formatTime(state?.attendance?.clock_in)}</span>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 border border-border">
                        <span className="text-muted-foreground block text-xs font-medium">Inicio comida <span className="text-muted-foreground/70 font-normal">(opcional)</span></span>
                        <span className="font-mono font-medium">{formatTime(state?.attendance?.lunch_start)}</span>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 border border-border">
                        <span className="text-muted-foreground block text-xs font-medium">Fin comida <span className="text-muted-foreground/70 font-normal">(opcional)</span></span>
                        <span className="font-mono font-medium">{formatTime(state?.attendance?.lunch_end)}</span>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 border border-border">
                        <span className="text-muted-foreground block text-xs font-medium">Salida</span>
                        <span className="font-mono font-medium">{formatTime(state?.attendance?.clock_out)}</span>
                    </div>
                </div>

                {config ? (
                    <div className="space-y-2">
                        <Button
                            type="button"
                            onClick={() => handlePunch()}
                            disabled={punching}
                            className={`w-full h-12 text-base font-semibold gap-2 ${config.className}`}
                        >
                            {punching ? (
                                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                            ) : (
                                <IconComponent className="h-5 w-5 shrink-0" />
                            )}
                            {punching ? "Registrando..." : config.label}
                        </Button>
                        {state?.can_skip_lunch && nextAction === "lunch_start" && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-foreground"
                                onClick={() => handlePunch("clock_out")}
                                disabled={punching}
                            >
                                Registrar salida sin comida
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-3 px-4 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Jornada completada para hoy
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
