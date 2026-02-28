import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/lib/axios";
import { notify } from "@/lib/notify";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { Clock, Loader2, User, Building2, Megaphone } from "lucide-react";

const ENTITY_TYPES = [
    { value: "User", label: "Usuario", icon: User },
    { value: "Area", label: "Área", icon: Building2 },
    { value: "Campaign", label: "Campaña", icon: Megaphone },
];

function entityTypeLabel(type) {
    if (!type) return "—";
    const last = type.split("\\").pop();
    return ENTITY_TYPES.find((e) => e.value === last)?.label ?? last;
}

export default function ScheduleAssignmentManager() {
    const { can } = useAuth();
    const navigate = useNavigate();
    const [catalogs, setCatalogs] = useState({
        schedules: [],
        areas: [],
        campaigns: [],
        users: [],
    });
    const [assignments, setAssignments] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        scheduleable_type: "",
        scheduleable_id: "",
        schedule_id: "",
        valid_from: "",
        valid_until: "",
    });

    useEffect(() => {
        if (!can("attendances.manage")) {
            navigate("/", { replace: true });
            return;
        }
    }, [can, navigate]);

    const loadCatalogs = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/schedule-manager/catalogs");
            setCatalogs({
                schedules: data.schedules ?? [],
                areas: data.areas ?? [],
                campaigns: data.campaigns ?? [],
                users: data.users ?? [],
            });
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudieron cargar los catálogos"));
            }
        } finally {
            setLoadingCatalogs(false);
        }
    }, []);

    const loadAssignments = useCallback(async () => {
        setLoadingAssignments(true);
        try {
            const { data } = await axios.get("/api/schedule-manager/assignments");
            setAssignments(data.assignments ?? []);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudieron cargar las asignaciones"));
            }
        } finally {
            setLoadingAssignments(false);
        }
    }, []);

    useEffect(() => {
        if (can("attendances.manage")) {
            loadCatalogs();
            loadAssignments();
        }
    }, [can, loadCatalogs, loadAssignments]);

    const entityOptions = useMemo(() => {
        const type = form.scheduleable_type;
        if (!type) return [];
        if (type === "User") return catalogs.users;
        if (type === "Area") return catalogs.areas;
        if (type === "Campaign") return catalogs.campaigns;
        return [];
    }, [form.scheduleable_type, catalogs.users, catalogs.areas, catalogs.campaigns]);

    const canSubmit =
        form.schedule_id &&
        form.scheduleable_type &&
        form.scheduleable_id &&
        form.valid_from;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit || saving) return;
        setSaving(true);
        try {
            const payload = {
                schedule_id: Number(form.schedule_id),
                scheduleable_type: form.scheduleable_type,
                scheduleable_id: Number(form.scheduleable_id),
                valid_from: form.valid_from,
                valid_until: form.valid_until || null,
            };
            await axios.post("/api/schedule-manager/assign", payload);
            notify.success("Horario asignado correctamente");
            setForm((prev) => ({
                ...prev,
                scheduleable_id: "",
                schedule_id: "",
                valid_from: "",
                valid_until: "",
            }));
            loadAssignments();
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(err?.response?.data?.message ?? getApiErrorMessage(err, "Error al asignar horario"));
            }
        } finally {
            setSaving(false);
        }
    };

    const onEntityTypeChange = (value) => {
        setForm((prev) => ({
            ...prev,
            scheduleable_type: value,
            scheduleable_id: "",
        }));
    };

    if (!can("attendances.manage")) return null;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary" />
                    Gestión de asignaciones de horarios
                </h1>
                <p className="text-muted-foreground font-medium text-sm mt-1">
                    Asigna horarios a usuarios, áreas o campañas. La vigencia es opcional (vacío = sin fecha fin).
                </p>
            </div>

            <Card className="border-border">
                <CardHeader>
                    <CardTitle>Nueva asignación</CardTitle>
                    <CardDescription>
                        Elige el tipo de entidad, la entidad, el horario y el rango de vigencia.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingCatalogs ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo de entidad</Label>
                                    <Select
                                        value={form.scheduleable_type}
                                        onValueChange={onEntityTypeChange}
                                    >
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccionar tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ENTITY_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        {form.scheduleable_type === "User"
                                            ? "Usuario"
                                            : form.scheduleable_type === "Area"
                                            ? "Área"
                                            : form.scheduleable_type === "Campaign"
                                            ? "Campaña"
                                            : "Entidad"}
                                    </Label>
                                    <Select
                                        value={form.scheduleable_id ? String(form.scheduleable_id) : ""}
                                        onValueChange={(v) =>
                                            setForm((prev) => ({ ...prev, scheduleable_id: v }))
                                        }
                                        disabled={!form.scheduleable_type}
                                    >
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {entityOptions.map((opt) => (
                                                <SelectItem
                                                    key={opt.id}
                                                    value={String(opt.id)}
                                                >
                                                    {opt.name}
                                                    {opt.email ? ` (${opt.email})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Horario</Label>
                                <Select
                                    value={form.schedule_id ? String(form.schedule_id) : ""}
                                    onValueChange={(v) =>
                                        setForm((prev) => ({ ...prev, schedule_id: v }))
                                    }
                                >
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Seleccionar horario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(catalogs.schedules || []).map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Válido desde</Label>
                                    <Input
                                        type="date"
                                        value={form.valid_from}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                valid_from: e.target.value,
                                            }))
                                        }
                                                                            />
                                </div>
                                <div className="space-y-2">
                                    <Label>Válido hasta (opcional)</Label>
                                    <Input
                                        type="date"
                                        value={form.valid_until}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                valid_until: e.target.value || "",
                                            }))
                                        }
                                        min={form.valid_from || undefined}
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={!canSubmit || saving}>
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                ) : null}
                                {saving ? " Guardando…" : "Guardar asignación"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border">
                <CardHeader>
                    <CardTitle>Asignaciones vigentes hoy</CardTitle>
                    <CardDescription>
                        Listado de asignaciones activas (vigentes a la fecha actual).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingAssignments ? (
                        <Skeleton className="h-48 w-full rounded-md" />
                    ) : assignments.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">
                            No hay asignaciones vigentes.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Entidad</TableHead>
                                    <TableHead>Horario</TableHead>
                                    <TableHead>Desde</TableHead>
                                    <TableHead>Hasta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-medium">
                                            {entityTypeLabel(a.scheduleable_type)}
                                        </TableCell>
                                        <TableCell>{a.scheduleable_label ?? "—"}</TableCell>
                                        <TableCell>{a.schedule_name ?? "—"}</TableCell>
                                        <TableCell>{a.valid_from ?? "—"}</TableCell>
                                        <TableCell>{a.valid_until ?? "Sin fin"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
