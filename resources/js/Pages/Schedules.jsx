import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";
import { clearCatalogCache } from "@/lib/catalogCache";
import { Clock, Loader2 } from "lucide-react";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const emptyDay = (dayOfWeek) => ({
    day_of_week: dayOfWeek,
    is_working_day: dayOfWeek >= 1 && dayOfWeek <= 5,
    expected_clock_in: "09:00",
    expected_lunch_start: "14:00",
    expected_lunch_end: "15:00",
    expected_clock_out: "18:00",
    tolerance_minutes: 15,
});

const emptyForm = {
    name: "",
    is_active: true,
    days: [0, 1, 2, 3, 4, 5, 6].map(emptyDay),
};

function timeToInput(value) {
    if (!value) return "";
    const s = String(value);
    return s.length >= 5 ? s.substring(0, 5) : s;
}

export default function Schedules() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);

    const canSave = useMemo(() => form.name.trim().length >= 2, [form.name]);

    useEffect(() => {
        axios
            .get("/api/schedules")
            .then((res) => setSchedules(res.data))
            .catch((err) => {
                if (!handleAuthError(err)) {
                    notify.error(getApiErrorMessage(err, "No se pudieron cargar los horarios"));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditing(null);
    };

    const openCreate = () => {
        resetForm();
        setOpen(true);
    };

    const openEdit = async (schedule) => {
        try {
            const { data } = await axios.get(`/api/schedules/${schedule.id}`);
            const days = (data.schedule_days || [])
                .sort((a, b) => a.day_of_week - b.day_of_week)
                .map((d) => ({
                    day_of_week: d.day_of_week,
                    is_working_day: d.is_working_day,
                    expected_clock_in: timeToInput(d.expected_clock_in),
                    expected_lunch_start: timeToInput(d.expected_lunch_start),
                    expected_lunch_end: timeToInput(d.expected_lunch_end),
                    expected_clock_out: timeToInput(d.expected_clock_out),
                    tolerance_minutes: d.tolerance_minutes ?? 15,
                }));
            while (days.length < 7) {
                days.push(emptyDay(days.length));
            }
            setForm({
                name: data.name,
                is_active: data.is_active,
                days,
            });
            setEditing(data);
            setOpen(true);
        } catch (err) {
            if (!handleAuthError(err)) notify.error(getApiErrorMessage(err, "No se pudo cargar el horario"));
        }
    };

    const setDay = (index, field, value) => {
        setForm((f) => ({
            ...f,
            days: f.days.map((d, i) =>
                i === index ? { ...d, [field]: value } : d
            ),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSave) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                is_active: form.is_active,
                days: form.days.map((d) => ({
                    ...d,
                    expected_clock_in: d.is_working_day ? d.expected_clock_in || null : null,
                    expected_lunch_start: d.is_working_day ? d.expected_lunch_start || null : null,
                    expected_lunch_end: d.is_working_day ? d.expected_lunch_end || null : null,
                    expected_clock_out: d.is_working_day ? d.expected_clock_out || null : null,
                })),
            };
            if (editing) {
                const { data } = await axios.put(`/api/schedules/${editing.id}`, payload);
                setSchedules((prev) => prev.map((s) => (s.id === data.id ? { ...s, ...data } : s)));
                clearCatalogCache();
                notify.success("Horario actualizado");
            } else {
                const { data } = await axios.post("/api/schedules", payload);
                setSchedules((prev) => [data, ...prev]);
                clearCatalogCache();
                notify.success("Horario creado");
            }
            setOpen(false);
            resetForm();
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo guardar el horario"));
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (schedule) => {
        const next = !schedule.is_active;
        try {
            const { data } = await axios.put(`/api/schedules/${schedule.id}`, {
                name: schedule.name,
                is_active: next,
            });
            setSchedules((prev) => prev.map((s) => (s.id === data.id ? { ...s, is_active: data.is_active } : s)));
            clearCatalogCache();
        } catch (err) {
            if (!handleAuthError(err)) notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        }
    };

    const handleDelete = async (schedule) => {
        if (schedule.name === "Por defecto") {
            notify.error("No se puede eliminar el horario Por defecto.");
            return;
        }
        const ok = confirm(`¿Eliminar el horario "${schedule.name}"?`);
        if (!ok) return;
        try {
            await axios.delete(`/api/schedules/${schedule.id}`);
            setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
            clearCatalogCache();
            notify.success("Horario eliminado");
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(err.response?.data?.message || getApiErrorMessage(err, "No se pudo eliminar"));
            }
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <Clock className="h-6 w-6 text-primary" />
                        Horarios
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Catálogo de horarios para control de asistencia. Asignables a usuarios, áreas o campañas.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate}>Nuevo horario</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                        <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-4 border-b border-border">
                            <DialogTitle>{editing ? "Editar horario" : "Nuevo horario"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="shrink-0 px-6 py-4 space-y-4 overflow-y-auto">
                                <div className="space-y-2">
                                    <Label htmlFor="schedule-name">Nombre</Label>
                                    <Input
                                        id="schedule-name"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="Ej. Oficina, Turno noche"
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium">Activo</p>
                                        <p className="text-xs text-muted-foreground">Disponible para asignar.</p>
                                    </div>
                                    <Switch
                                        checked={form.is_active}
                                        onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 flex flex-col px-6 pb-4">
                                <p className="text-sm font-medium mb-2 shrink-0">Días de la semana</p>
                                <div className="border border-border rounded-lg overflow-auto shrink min-h-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="w-[72px] min-w-[72px] px-3 py-3 text-left align-middle">Día</TableHead>
                                                <TableHead className="w-[88px] min-w-[88px] px-3 py-3 text-center align-middle">Laboral</TableHead>
                                                <TableHead className="w-[100px] min-w-[100px] px-3 py-3 whitespace-nowrap align-middle">Entrada</TableHead>
                                                <TableHead className="w-[100px] min-w-[100px] px-3 py-3 whitespace-nowrap align-middle">Comida inicio</TableHead>
                                                <TableHead className="w-[100px] min-w-[100px] px-3 py-3 whitespace-nowrap align-middle">Comida fin</TableHead>
                                                <TableHead className="w-[100px] min-w-[100px] px-3 py-3 align-middle">Salida</TableHead>
                                                <TableHead className="w-[90px] min-w-[90px] px-3 py-3 text-left align-middle">Tolerancia (min)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {form.days.map((day, i) => (
                                                <TableRow key={day.day_of_week} className="align-middle">
                                                    <TableCell className="font-medium px-3 py-2.5 w-[72px] min-w-[72px] align-middle text-left">
                                                        {DAY_NAMES[day.day_of_week]}
                                                    </TableCell>
                                                    <TableCell className="px-3 py-2.5 w-[88px] min-w-[88px] align-middle text-center">
                                                        <div className="flex items-center justify-center">
                                                            <Switch
                                                                checked={day.is_working_day}
                                                                onCheckedChange={(v) => setDay(i, "is_working_day", v)}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-3 py-2.5 w-[100px] min-w-[100px] align-middle">
                                                        <Input
                                                            type="time"
                                                            className="h-9 w-full min-w-[80px] text-sm"
                                                            value={day.expected_clock_in || ""}
                                                            onChange={(e) => setDay(i, "expected_clock_in", e.target.value)}
                                                            disabled={!day.is_working_day}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-2.5 w-[100px] min-w-[100px] align-middle">
                                                        <Input
                                                            type="time"
                                                            className="h-9 w-full min-w-[80px] text-sm"
                                                            value={day.expected_lunch_start || ""}
                                                            onChange={(e) => setDay(i, "expected_lunch_start", e.target.value)}
                                                            disabled={!day.is_working_day}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-2.5 w-[100px] min-w-[100px] align-middle">
                                                        <Input
                                                            type="time"
                                                            className="h-9 w-full min-w-[80px] text-sm"
                                                            value={day.expected_lunch_end || ""}
                                                            onChange={(e) => setDay(i, "expected_lunch_end", e.target.value)}
                                                            disabled={!day.is_working_day}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-2.5 w-[100px] min-w-[100px] align-middle">
                                                        <Input
                                                            type="time"
                                                            className="h-9 w-full min-w-[80px] text-sm"
                                                            value={day.expected_clock_out || ""}
                                                            onChange={(e) => setDay(i, "expected_clock_out", e.target.value)}
                                                            disabled={!day.is_working_day}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-2.5 w-[90px] min-w-[90px] align-middle">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={120}
                                                            className="h-9 w-[72px] min-w-[72px] text-sm tabular-nums"
                                                            value={day.tolerance_minutes}
                                                            onChange={(e) => setDay(i, "tolerance_minutes", parseInt(e.target.value, 10) || 0)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
                                <Button type="button" variant="secondary" onClick={() => { setOpen(false); resetForm(); }}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={!canSave || saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editing ? "Actualizar" : "Crear"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="w-[100px]">Días</TableHead>
                            <TableHead className="w-[140px]">Estado</TableHead>
                            <TableHead className="w-[120px]">Creado</TableHead>
                            <TableHead className="text-right w-[180px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : schedules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                    No hay horarios. Crea uno o ejecuta el seeder para el horario "Por defecto".
                                </TableCell>
                            </TableRow>
                        ) : (
                            schedules.map((schedule) => (
                                <TableRow key={schedule.id}>
                                    <TableCell className="font-medium">{schedule.id}</TableCell>
                                    <TableCell>
                                        <span className="font-medium">{schedule.name}</span>
                                        {schedule.name === "Por defecto" && (
                                            <Badge variant="secondary" className="ml-2 text-[10px]">Sistema</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{schedule.schedule_days_count ?? schedule.schedule_days?.length ?? 0} días</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={schedule.is_active}
                                                onCheckedChange={() => toggleActive(schedule)}
                                            />
                                            <Badge variant={schedule.is_active ? "default" : "secondary"}>
                                                {schedule.is_active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {schedule.created_at ? new Date(schedule.created_at).toLocaleDateString() : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(schedule)}>
                                                Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(schedule)}
                                                disabled={schedule.name === "Por defecto"}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
