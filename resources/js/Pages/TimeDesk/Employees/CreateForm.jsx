import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "@/lib/axios";
import { notify } from "@/lib/notify";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileUp, Loader2, Shield, UserPlus } from "lucide-react";

const ACCEPT_FILES = ".pdf,.jpg,.jpeg,.png";
const MAX_FILE_MB = 5;

const DEFAULT_FORM = {
    first_name: "",
    paternal_last_name: "",
    maternal_last_name: "",
    email: "",
    employee_number: "",
    phone: "",
    sede_id: "",
    area_id: "",
    campaign_id: "",
    position_id: "",
    employee_status_id: "",
    hire_type_id: "",
    recruitment_source_id: "",
    manager_id: "",
    hire_date: "",
    schedule_id: "",
    curp: "",
    nss: "",
    address: "",
    has_csf: false,
};

const DEFAULT_FILES = {
    ine_file: null,
    csf_file: null,
    address_proof_file: null,
    studies_proof_file: null,
};

export default function TimeDeskEmployeesCreateForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [files, setFiles] = useState(DEFAULT_FILES);
    const [catalogs, setCatalogs] = useState({
        sedes: [],
        areas: [],
        campaigns: [],
        positions: [],
        schedules: [],
        employee_statuses: [],
        hire_types: [],
        recruitment_sources: [],
        managers: [],
    });
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const fetchCatalogs = useCallback(async () => {
        setLoadingCatalogs(true);
        try {
            const { data } = await axios.get("/api/timedesk/employees/catalogs");
            setCatalogs({
                sedes: data.sedes ?? [],
                areas: data.areas ?? [],
                campaigns: data.campaigns ?? [],
                positions: data.positions ?? [],
                schedules: data.schedules ?? [],
                employee_statuses: data.employee_statuses ?? [],
                hire_types: data.hire_types ?? [],
                recruitment_sources: data.recruitment_sources ?? [],
                managers: data.managers ?? [],
            });
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudieron cargar los catálogos"));
            }
        } finally {
            setLoadingCatalogs(false);
        }
    }, []);

    useEffect(() => {
        fetchCatalogs();
    }, [fetchCatalogs]);

    const update = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const setFile = (field, file) => {
        if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
            notify.warning(`El archivo no debe superar ${MAX_FILE_MB} MB`);
            return;
        }
        setFiles((prev) => ({ ...prev, [field]: file || null }));
    };

    const showRecruitmentSource = useMemo(() => {
        const nuevoIngreso = catalogs.hire_types.find(
            (t) => t.name && t.name.toLowerCase().includes("nuevo ingreso")
        );
        return nuevoIngreso && form.hire_type_id === String(nuevoIngreso.id);
    }, [catalogs.hire_types, form.hire_type_id]);

    const buildFormData = () => {
        const fd = new FormData();
        fd.append("first_name", form.first_name.trim());
        fd.append("paternal_last_name", form.paternal_last_name.trim());
        fd.append("maternal_last_name", form.maternal_last_name.trim() || "");
        fd.append("email", form.email.trim() || "");
        fd.append("employee_number", form.employee_number.trim());
        fd.append("phone", form.phone.trim() || "");
        fd.append("sede_id", form.sede_id ? String(form.sede_id) : "");
        fd.append("area_id", form.area_id ? String(form.area_id) : "");
        fd.append("campaign_id", form.campaign_id ? String(form.campaign_id) : "");
        fd.append("position_id", form.position_id ? String(form.position_id) : "");
        fd.append("employee_status_id", form.employee_status_id && form.employee_status_id !== "__empty__" ? String(form.employee_status_id) : "");
        fd.append("hire_type_id", form.hire_type_id && form.hire_type_id !== "__empty__" ? String(form.hire_type_id) : "");
        fd.append("manager_id", form.manager_id ? String(form.manager_id) : "");
        fd.append("hire_date", form.hire_date || "");
        fd.append("schedule_id", form.schedule_id ? String(form.schedule_id) : "");
        if (form.curp.trim()) fd.append("curp", form.curp.trim());
        if (form.nss.trim()) fd.append("nss", form.nss.trim());
        if (form.address.trim()) fd.append("address", form.address.trim());
        fd.append("has_csf", form.has_csf ? "1" : "0");

        if (showRecruitmentSource && form.recruitment_source_id && form.recruitment_source_id !== "__empty__") {
            fd.append("recruitment_source_id", form.recruitment_source_id);
        }

        if (files.ine_file) fd.append("ine_file", files.ine_file);
        if (files.csf_file) fd.append("csf_file", files.csf_file);
        if (files.address_proof_file) fd.append("address_proof_file", files.address_proof_file);
        if (files.studies_proof_file) fd.append("studies_proof_file", files.studies_proof_file);

        return fd;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFieldErrors({});
        if (!form.first_name?.trim() || !form.paternal_last_name?.trim() || !form.employee_number?.trim() || !form.sede_id) {
            notify.error("Completa los campos obligatorios: Nombre(s), Apellido paterno, Número de empleado y Sede.");
            return;
        }
        if (showRecruitmentSource && (!form.recruitment_source_id || form.recruitment_source_id === "__empty__")) {
            notify.error("Para Nuevo Ingreso es obligatorio seleccionar el Medio de contratación (Origen).");
            return;
        }
        setSubmitting(true);
        try {
            const formData = buildFormData();
            await axios.post("/api/timedesk/employees", formData);
            notify.success(
                "Expediente creado con éxito. Se ha notificado a los Administradores de IT para que aprueben la cuenta y le asignen accesos."
            );
            navigate("/timedesk/employees");
        } catch (err) {
            if (!handleAuthError(err)) {
                const errors = err.response?.data?.errors;
                if (errors && typeof errors === "object") {
                    setFieldErrors(errors);
                }
                notify.error(getApiErrorMessage(err, "Error al crear el expediente"));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingCatalogs) {
        return (
            <div className="flex items-center justify-center min-h-[320px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/timedesk/employees">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                            <UserPlus className="h-8 w-8 text-primary" />
                            Alta de empleado
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Datos personales y organizacionales. El usuario quedará pendiente de aprobación por IT.
                        </p>
                    </div>
                </div>
            </div>

            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg">Datos del empleado</CardTitle>
                    <p className="text-sm text-muted-foreground font-normal">
                        Los roles técnicos los asigna un Administrador después de aprobar la cuenta.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">Nombre(s) *</Label>
                                <Input
                                    id="first_name"
                                    value={form.first_name}
                                    onChange={(e) => update("first_name", e.target.value)}
                                    placeholder="Ej. Juan"
                                    className="bg-background"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paternal_last_name">Apellido paterno *</Label>
                                <Input
                                    id="paternal_last_name"
                                    value={form.paternal_last_name}
                                    onChange={(e) => update("paternal_last_name", e.target.value)}
                                    placeholder="Ej. García"
                                    className="bg-background"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maternal_last_name">Apellido materno</Label>
                                <Input
                                    id="maternal_last_name"
                                    value={form.maternal_last_name}
                                    onChange={(e) => update("maternal_last_name", e.target.value)}
                                    placeholder="Ej. López"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employee_number">Número de empleado *</Label>
                                <Input
                                    id="employee_number"
                                    value={form.employee_number}
                                    onChange={(e) => update("employee_number", e.target.value)}
                                    placeholder="Ej. EMP001"
                                    className="bg-background font-mono"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => {
                                        update("email", e.target.value);
                                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                    }}
                                    placeholder="correo@ejemplo.com"
                                    className={`bg-background ${fieldErrors.email ? "border-destructive" : ""}`}
                                />
                                {fieldErrors.email && (
                                    <p className="text-sm text-destructive font-medium" role="alert">
                                        {Array.isArray(fieldErrors.email) ? fieldErrors.email[0] : fieldErrors.email}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={(e) => update("phone", e.target.value)}
                                    placeholder="10 dígitos"
                                    className="bg-background"
                                    maxLength={20}
                                />
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <h3 className="text-sm font-semibold text-foreground mb-4">Ubicación y organización</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Sede *</Label>
                                    <Select value={form.sede_id} onValueChange={(v) => update("sede_id", v)} required>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione sede" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.sedes.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Área</Label>
                                    <Select value={form.area_id} onValueChange={(v) => update("area_id", v)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione área" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.areas.map((a) => (
                                                <SelectItem key={a.id} value={String(a.id)}>
                                                    {a.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Campaña</Label>
                                    <Select value={form.campaign_id} onValueChange={(v) => update("campaign_id", v)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione campaña" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.campaigns.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Puesto</Label>
                                    <Select value={form.position_id} onValueChange={(v) => update("position_id", v)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione puesto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.positions.map((p) => (
                                                <SelectItem key={p.id} value={String(p.id)}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <h3 className="text-sm font-semibold text-foreground mb-4">Expediente RH</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Estatus</Label>
                                    <Select value={form.employee_status_id} onValueChange={(v) => update("employee_status_id", v)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione estatus" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.employee_statuses.length === 0 ? (
                                                <SelectItem value="__empty__" disabled>
                                                    Sin opciones (catálogo en BD)
                                                </SelectItem>
                                            ) : (
                                                catalogs.employee_statuses.map((s) => (
                                                    <SelectItem key={s.id} value={String(s.id)}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de ingreso</Label>
                                    <Select value={form.hire_type_id} onValueChange={(v) => update("hire_type_id", v)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.hire_types.length === 0 ? (
                                                <SelectItem value="__empty__" disabled>
                                                    Sin opciones (catálogo en BD)
                                                </SelectItem>
                                            ) : (
                                                catalogs.hire_types.map((t) => (
                                                    <SelectItem key={t.id} value={String(t.id)}>
                                                        {t.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>
                                        Medio de contratación (Origen)
                                        {showRecruitmentSource && " *"}
                                    </Label>
                                    <Select
                                        value={form.recruitment_source_id}
                                        onValueChange={(v) => update("recruitment_source_id", v)}
                                    >
                                        <SelectTrigger className="bg-background max-w-md">
                                            <SelectValue placeholder={showRecruitmentSource ? "Seleccione medio (obligatorio para Nuevo Ingreso)" : "Seleccione medio"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.recruitment_sources.length === 0 ? (
                                                <SelectItem value="__empty__" disabled>
                                                    Sin opciones (ejecute el seeder RecruitmentSourceSeeder)
                                                </SelectItem>
                                            ) : (
                                                catalogs.recruitment_sources.map((r) => (
                                                    <SelectItem key={r.id} value={String(r.id)}>
                                                        {r.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Jefe inmediato</Label>
                                    <Select value={form.manager_id} onValueChange={(v) => update("manager_id", v)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione jefe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.managers.map((m) => (
                                                <SelectItem key={m.id} value={String(m.id)}>
                                                    {m.name}
                                                    {m.email ? ` (${m.email})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hire_date">Fecha de ingreso</Label>
                                    <Input
                                        id="hire_date"
                                        type="date"
                                        value={form.hire_date}
                                        onChange={(e) => update("hire_date", e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Horario</Label>
                                    <Select value={form.schedule_id} onValueChange={(v) => update("schedule_id", v)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Seleccione horario" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs.schedules.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                Datos sensibles (privado para RH)
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                Esta información se guarda solo en el expediente de RH y no es visible para el módulo global de Usuarios (IT).
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="curp">CURP</Label>
                                    <Input
                                        id="curp"
                                        value={form.curp}
                                        onChange={(e) => update("curp", e.target.value.toUpperCase())}
                                        placeholder="18 caracteres"
                                        className="bg-background font-mono"
                                        maxLength={18}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nss">NSS</Label>
                                    <Input
                                        id="nss"
                                        value={form.nss}
                                        onChange={(e) => update("nss", e.target.value.replace(/\D/g, "").slice(0, 11))}
                                        placeholder="11 dígitos"
                                        className="bg-background font-mono"
                                        maxLength={11}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">Dirección</Label>
                                    <Textarea
                                        id="address"
                                        value={form.address}
                                        onChange={(e) => update("address", e.target.value)}
                                        placeholder="Calle, número, colonia, CP, ciudad"
                                        className="bg-background resize-none min-h-[80px]"
                                        maxLength={2000}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                <FileUp className="h-4 w-4 text-muted-foreground" />
                                Expediente digital
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                PDF o JPG, máximo {MAX_FILE_MB} MB por archivo.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ine_file">Copia de INE</Label>
                                    <Input
                                        id="ine_file"
                                        type="file"
                                        accept={ACCEPT_FILES}
                                        onChange={(e) => setFile("ine_file", e.target.files?.[0] ?? null)}
                                        className="bg-background file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:text-sm"
                                    />
                                    {files.ine_file && (
                                        <p className="text-xs text-muted-foreground">
                                            {files.ine_file.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="csf_file">Constancia de Situación Fiscal (CSF)</Label>
                                    <Input
                                        id="csf_file"
                                        type="file"
                                        accept={ACCEPT_FILES}
                                        onChange={(e) => setFile("csf_file", e.target.files?.[0] ?? null)}
                                        className="bg-background file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:text-sm"
                                    />
                                    {files.csf_file && (
                                        <p className="text-xs text-muted-foreground">
                                            {files.csf_file.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address_proof_file">Comprobante de domicilio</Label>
                                    <Input
                                        id="address_proof_file"
                                        type="file"
                                        accept={ACCEPT_FILES}
                                        onChange={(e) => setFile("address_proof_file", e.target.files?.[0] ?? null)}
                                        className="bg-background file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:text-sm"
                                    />
                                    {files.address_proof_file && (
                                        <p className="text-xs text-muted-foreground">
                                            {files.address_proof_file.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studies_proof_file">Comprobante de estudios</Label>
                                    <Input
                                        id="studies_proof_file"
                                        type="file"
                                        accept={ACCEPT_FILES}
                                        onChange={(e) => setFile("studies_proof_file", e.target.files?.[0] ?? null)}
                                        className="bg-background file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:text-sm"
                                    />
                                    {files.studies_proof_file && (
                                        <p className="text-xs text-muted-foreground">
                                            {files.studies_proof_file.name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2 md:col-span-2">
                                    <Checkbox
                                        id="has_csf"
                                        checked={form.has_csf}
                                        onCheckedChange={(checked) => update("has_csf", !!checked)}
                                    />
                                    <Label htmlFor="has_csf" className="font-normal cursor-pointer">
                                        Validó entrega de CSF
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                            <Button type="submit" disabled={submitting} className="gap-2">
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Crear expediente
                            </Button>
                            <Button type="button" variant="outline" asChild disabled={submitting}>
                                <Link to="/timedesk/employees">Cancelar</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
