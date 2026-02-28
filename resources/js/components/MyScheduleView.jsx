import { useCallback, useEffect, useState } from "react";
import axios from "@/lib/axios";
import { notify } from "@/lib/notify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Clock } from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatTime(t) {
    if (!t) return "—";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
}

export function MyScheduleView() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: res } = await axios.get("/api/my-schedule");
            setData(res);
        } catch (err) {
            const msg = err?.response?.data?.message || "No se pudo cargar tu horario.";
            setError(msg);
            notify.error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    if (loading) {
        return (
            <Card className="border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Mi horario
                    </CardTitle>
                    <CardDescription>Cargando…</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data?.schedule) {
        return (
            <Card className="border-border border-destructive/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                        <Clock className="h-5 w-5" />
                        Mi horario
                    </CardTitle>
                    <CardDescription>
                        {error || "No se encontró un horario asignado."}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const schedule = data.schedule;
    const days = schedule.schedule_days ?? [];

    return (
        <Card className="border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Horario: {schedule.name}
                    {schedule.is_default && (
                        <span className="text-muted-foreground font-normal text-sm">(por defecto)</span>
                    )}
                </CardTitle>
                <CardDescription>
                    Vigente para hoy. Entrada, comida y salida por día de la semana.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Día</TableHead>
                            <TableHead>Entrada</TableHead>
                            <TableHead>Inicio comida</TableHead>
                            <TableHead>Fin comida</TableHead>
                            <TableHead>Salida</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {days.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-muted-foreground text-center py-4">
                                    Sin días configurados
                                </TableCell>
                            </TableRow>
                        ) : (
                            days.map((day) => (
                                <TableRow
                                    key={day.day_of_week}
                                    className={!day.is_working_day ? "opacity-60 bg-muted/30" : ""}
                                >
                                    <TableCell className="font-medium">
                                        {day.day_name ?? DAY_NAMES[day.day_of_week]}
                                        {!day.is_working_day && (
                                            <span className="text-muted-foreground text-xs ml-1">(no laboral)</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {formatTime(day.expected_clock_in)}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {formatTime(day.expected_lunch_start)}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {formatTime(day.expected_lunch_end)}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {formatTime(day.expected_clock_out)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
