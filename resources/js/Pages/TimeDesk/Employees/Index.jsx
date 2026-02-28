import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    ArrowLeft,
    Search,
    UserMinus,
    Loader2,
    Briefcase,
    Building2,
    Mail,
    Calendar,
    Tag,
    Eye,
    Phone,
    ShieldCheck,
    AlertOctagon,
    Upload,
    Download,
    FileSpreadsheet,
    AlertCircle,
} from "lucide-react";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";

const TAB_ACTIVOS = "activos";
const TAB_BAJAS = "bajas";

export default function TimeDeskEmployeesIndex() {
    const { can } = useAuth();
    const canProcessBaja = can("users.manage");
    const canImportExport = can("attendances.manage");

    const [tab, setTab] = useState(TAB_ACTIVOS);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 });
    const [perPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [bajaModalOpen, setBajaModalOpen] = useState(false);
    const [bajaTarget, setBajaTarget] = useState(null); // { ids: [id] } or null
    const [terminationReasons, setTerminationReasons] = useState([]);
    const [bajaForm, setBajaForm] = useState({
        termination_reason_id: "",
        termination_date: new Date().toISOString().slice(0, 10),
        reason: "",
        add_to_blacklist: false,
    });
    const [bajaSubmitting, setBajaSubmitting] = useState(false);
    const [viewUser, setViewUser] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [exportActivosLoading, setExportActivosLoading] = useState(false);
    const [exportBajasLoading, setExportBajasLoading] = useState(false);
    const [dropzoneActive, setDropzoneActive] = useState(false);
    const fileInputRef = useRef(null);

    const fetchUsers = useCallback(
        async (page = 1) => {
            setLoading(true);
            try {
                const { data } = await axios.get("/api/timedesk/employees", {
                    params: {
                        page,
                        per_page: perPage,
                        status: tab === TAB_BAJAS ? "only" : "",
                        search: debouncedSearch || undefined,
                        sort: "id",
                        direction: "desc",
                    },
                });
                setUsers(data.data || []);
                setPagination({
                    current: data.current_page,
                    last: data.last_page,
                    total: data.total,
                });
            } catch (err) {
                if (!handleAuthError(err)) {
                    notify.error(getApiErrorMessage(err, "No se pudo cargar el listado"));
                }
            } finally {
                setLoading(false);
            }
        },
        [tab, debouncedSearch, perPage]
    );

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        fetchUsers(1);
    }, [fetchUsers]);

    const fetchTerminationReasons = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/timedesk/termination-reasons", {
                params: { active: 1 },
            });
            setTerminationReasons(Array.isArray(data) ? data : []);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudieron cargar los motivos"));
            }
        }
    }, []);

    const openBajaModal = (userOrIds) => {
        const ids = Array.isArray(userOrIds) ? userOrIds : [userOrIds?.id ?? userOrIds];
        setBajaTarget({ ids });
        setBajaForm({
            termination_reason_id: "",
            termination_date: new Date().toISOString().slice(0, 10),
            reason: "",
            add_to_blacklist: false,
        });
        fetchTerminationReasons();
        setBajaModalOpen(true);
    };

    const openViewModal = (user) => {
        setViewUser(user);
        setViewModalOpen(true);
    };

    const handleImportSubmit = async () => {
        if (!importFile || !canImportExport) return;
        setImportLoading(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append("file", importFile);
            const { data } = await axios.post("/api/timedesk/employees/import", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setImportResult(data);
            setImportFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            const totalFailures = (data.failures || []).length;
            if (totalFailures > 0) {
                notify.warning(
                    `Importación finalizada con ${data.processed} procesados. ${totalFailures} fila(s) con error. Descargue el reporte si desea corregirlas.`
                );
            } else {
                notify.success(
                    `Importación correcta: ${data.created} creados, ${data.updated} actualizados.`
                );
            }
            if ((data.warnings || []).length > 0) {
                notify.info(`${data.warnings.length} advertencia(s) (p. ej. jefe no encontrado).`);
            }
            fetchUsers(pagination.current);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "Error al importar el archivo"));
            }
        } finally {
            setImportLoading(false);
        }
    };

    const downloadErrorReport = async () => {
        if (!importResult?.failures?.length) return;
        try {
            const { data } = await axios.post(
                "/api/timedesk/employees/import-errors-report",
                { failures: importResult.failures },
                { responseType: "blob" }
            );
            const url = URL.createObjectURL(new Blob([data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `errores_importacion_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo descargar el reporte"));
            }
        }
    };

    const handleExportActivos = async () => {
        if (!canImportExport) return;
        setExportActivosLoading(true);
        try {
            const response = await axios.get("/api/timedesk/employees/export/activos", {
                responseType: "blob",
            });
            const data = response.data;
            const contentType = response.headers["content-type"] || "";
            const looksLikeError =
                data instanceof Blob &&
                data.size < 500 &&
                (contentType.includes("json") || contentType.includes("text/html"));
            if (looksLikeError) {
                const text = await data.text();
                const msg = text.startsWith("{") ? (JSON.parse(text).message || text) : text.slice(0, 200);
                notify.error(msg || "La respuesta no es un archivo Excel válido.");
                return;
            }
            const excelType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            const blob =
                data instanceof Blob
                    ? new Blob([data], { type: data.type || excelType })
                    : new Blob([data], { type: excelType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `directorio_activos_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            notify.success("Exportación descargada correctamente");
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "Error al exportar"));
            }
        } finally {
            setExportActivosLoading(false);
        }
    };

    const handleExportBajas = async () => {
        if (!canImportExport) return;
        setExportBajasLoading(true);
        try {
            const response = await axios.get("/api/timedesk/employees/export/bajas", {
                responseType: "blob",
            });
            const data = response.data;
            const contentType = response.headers["content-type"] || "";
            const looksLikeErrorBajas =
                data instanceof Blob &&
                data.size < 500 &&
                (contentType.includes("json") || contentType.includes("text/html"));
            if (looksLikeErrorBajas) {
                const text = await data.text();
                const msg = text.startsWith("{") ? (JSON.parse(text).message || text) : text.slice(0, 200);
                notify.error(msg || "La respuesta no es un archivo Excel válido.");
                return;
            }
            const excelTypeBajas = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            const blobBajas =
                data instanceof Blob
                    ? new Blob([data], { type: data.type || excelTypeBajas })
                    : new Blob([data], { type: excelTypeBajas });
            const urlBajas = URL.createObjectURL(blobBajas);
            const aBajas = document.createElement("a");
            aBajas.href = urlBajas;
            aBajas.download = `directorio_bajas_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(aBajas);
            aBajas.click();
            document.body.removeChild(aBajas);
            URL.revokeObjectURL(urlBajas);
            notify.success("Exportación descargada correctamente");
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "Error al exportar"));
            }
        } finally {
            setExportBajasLoading(false);
        }
    };

    const closeBajaModal = () => {
        if (!bajaSubmitting) {
            setBajaModalOpen(false);
            setBajaTarget(null);
        }
    };

    const canSubmitBaja =
        bajaForm.termination_reason_id && bajaForm.termination_date && bajaForm.reason.trim().length >= 5;

    const submitBaja = async () => {
        if (!canSubmitBaja || !bajaTarget?.ids?.length) return;
        setBajaSubmitting(true);
        try {
            const reason = bajaForm.reason.trim();
            if (bajaTarget.ids.length === 1) {
                await axios.delete(`/api/users/${bajaTarget.ids[0]}`, {
                    data: {
                        termination_reason_id: Number(bajaForm.termination_reason_id),
                        termination_date: bajaForm.termination_date,
                        reason,
                    },
                });
                notify.success("Baja procesada correctamente");
            } else {
                await axios.post("/api/users/mass-delete", {
                    ids: bajaTarget.ids,
                    reason,
                    termination_reason_id: Number(bajaForm.termination_reason_id),
                    termination_date: bajaForm.termination_date,
                });
                notify.success("Bajas procesadas correctamente");
            }
            if (bajaForm.add_to_blacklist) {
                await axios.post("/api/users/blacklist", {
                    ids: bajaTarget.ids,
                    reason,
                    action: "add",
                });
                notify.success("Usuarios añadidos a la lista negra");
            }
            setBajaModalOpen(false);
            setBajaTarget(null);
            setSelectedIds([]);
            fetchUsers(pagination.current);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(err?.response?.data?.message || getApiErrorMessage(err, "Error al procesar la baja"));
            }
        } finally {
            setBajaSubmitting(false);
        }
    };

    const columns = useMemo(() => {
        const base = [
            ...(canProcessBaja && tab === TAB_ACTIVOS
                ? [
                      {
                          id: "select",
                          header: () => (
                              <Checkbox
                                  checked={users.length > 0 && selectedIds.length === users.length}
                                  onCheckedChange={(c) =>
                                      setSelectedIds(c ? users.map((u) => u.id) : [])
                                  }
                              />
                          ),
                          cell: ({ row }) => (
                              <Checkbox
                                  checked={selectedIds.includes(row.original.id)}
                                  onCheckedChange={() =>
                                      setSelectedIds((prev) =>
                                          prev.includes(row.original.id)
                                              ? prev.filter((i) => i !== row.original.id)
                                              : [...prev, row.original.id]
                                      )
                                  }
                              />
                          ),
                          meta: { headerClassName: "w-[40px]", className: "w-[40px]" },
                      },
                  ]
                : []),
            {
                id: "identidad",
                header: "Empleado",
                cell: ({ row }) => {
                    const u = row.original;
                    return (
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm">{u.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                                #{u.employee_number}
                            </span>
                            {u.email && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Mail className="h-3 w-3" /> {u.email}
                                </span>
                            )}
                        </div>
                    );
                },
                meta: { headerClassName: "font-bold text-xs uppercase" },
            },
            {
                id: "ubicacion",
                header: "Campaña / Área",
                cell: ({ row }) => {
                    const u = row.original;
                    return (
                        <div className="flex flex-col gap-0.5 text-xs">
                            <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3 opacity-70" /> {u.campaign}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Building2 className="h-3 w-3 opacity-70" /> {u.area}
                            </span>
                            {u.position && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <Tag className="h-3 w-3 opacity-70" /> {u.position}
                                </span>
                            )}
                        </div>
                    );
                },
                meta: {
                    headerClassName: "font-bold text-xs uppercase hidden md:table-cell",
                    className: "hidden md:table-cell",
                },
            },
        ];

        if (tab === TAB_BAJAS) {
            base.push({
                id: "baja",
                header: "Motivo / Fecha baja",
                cell: ({ row }) => {
                    const u = row.original;
                    const ep = u.employee_profile;
                    return (
                        <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-medium">
                                {ep?.termination_reason ?? "—"}
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {ep?.termination_date
                                    ? new Date(ep.termination_date).toLocaleDateString("es-MX", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                      })
                                    : "—"}
                            </span>
                        </div>
                    );
                },
                meta: { headerClassName: "font-bold text-xs uppercase" },
            });
        }

        base.push({
            id: "acciones",
            header: "Acciones",
            cell: ({ row }) => {
                const u = row.original;
                return (
                    <div className="flex items-center justify-end gap-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            onClick={() => openViewModal(u)}
                        >
                            <Eye className="h-4 w-4" />
                            Ver
                        </Button>
                        {canProcessBaja && tab === TAB_ACTIVOS && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                onClick={() => openBajaModal(u)}
                            >
                                <UserMinus className="h-4 w-4" />
                                Procesar Baja
                            </Button>
                        )}
                    </div>
                );
            },
            meta: { headerClassName: "text-right font-bold text-xs uppercase" },
        });

        return base;
    }, [tab, canProcessBaja, users, selectedIds]);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/timedesk">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                            <Users className="h-8 w-8 text-primary" />
                            Directorio de Empleados
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Listado de personal activo y bajas para RH.
                        </p>
                    </div>
                </div>
            </div>

            {canImportExport && (
                <Card className="border-border p-4">
                    <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-stretch sm:items-center">
                        <div className="flex-1 min-w-[280px]">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                                Importar archivo maestro (Excel / CSV)
                            </Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-4 transition-colors flex flex-col sm:flex-row items-center gap-3 ${
                                    dropzoneActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDropzoneActive(true);
                                }}
                                onDragLeave={() => setDropzoneActive(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDropzoneActive(false);
                                    const f = e.dataTransfer?.files?.[0];
                                    if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) setImportFile(f);
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 shrink-0"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4" />
                                    Seleccionar archivo
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    {importFile ? importFile.name : "Arrastre aquí o haga clic"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Button
                                    size="sm"
                                    disabled={!importFile || importLoading}
                                    onClick={handleImportSubmit}
                                    className="gap-2"
                                >
                                    {importLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Importar
                                </Button>
                                {importResult?.failures?.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                        onClick={downloadErrorReport}
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        Descargar reporte de errores
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                Exportar
                            </Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    disabled={exportActivosLoading}
                                    onClick={handleExportActivos}
                                >
                                    {exportActivosLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="h-4 w-4" />
                                    )}
                                    Exportar Activos (Excel)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    disabled={exportBajasLoading}
                                    onClick={handleExportBajas}
                                >
                                    {exportBajasLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    Exportar Bajas (Excel)
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="border-border overflow-hidden">
                <div className="p-4 flex flex-wrap items-center gap-4 border-b border-border">
                    <div className="flex rounded-md border border-border overflow-hidden bg-background">
                        <button
                            type="button"
                            onClick={() => setTab(TAB_ACTIVOS)}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                tab === TAB_ACTIVOS
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                        >
                            Activos
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab(TAB_BAJAS)}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                tab === TAB_BAJAS
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                        >
                            Bajas
                        </button>
                    </div>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, número o correo..."
                            className="pl-9 h-10 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canProcessBaja && tab === TAB_ACTIVOS && selectedIds.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openBajaModal(selectedIds)}
                            className="gap-2"
                        >
                            <UserMinus className="h-4 w-4" />
                            Procesar Baja ({selectedIds.length})
                        </Button>
                    )}
                </div>

                <DataTable
                    columns={columns}
                    data={users}
                    loading={loading}
                    getRowId={(row) => row.id}
                    selectedIds={selectedIds}
                    emptyMessage="No se encontraron empleados"
                    emptyColSpan={columns.length}
                />

                <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        {pagination.total === 0
                            ? "0 registros"
                            : `${(pagination.current - 1) * perPage + 1}–${Math.min(
                                  pagination.current * perPage,
                                  pagination.total
                              )} de ${pagination.total}`}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current <= 1 || loading}
                            onClick={() => fetchUsers(pagination.current - 1)}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current >= pagination.last || loading}
                            onClick={() => fetchUsers(pagination.current + 1)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </Card>

            <Dialog open={bajaModalOpen} onOpenChange={closeBajaModal}>
                <DialogContent className="sm:max-w-md border-border bg-background">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserMinus className="h-5 w-5 text-amber-500" />
                            Procesar Baja
                        </DialogTitle>
                        <DialogDescription>
                            Registre el motivo y la fecha de baja para el expediente de RH. Esta
                            acción dará de baja al usuario en el sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Motivo de baja</Label>
                            <Select
                                value={bajaForm.termination_reason_id}
                                onValueChange={(v) =>
                                    setBajaForm((f) => ({ ...f, termination_reason_id: v }))
                                }
                            >
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Seleccione un motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {terminationReasons.map((r) => (
                                        <SelectItem key={r.id} value={String(r.id)}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de baja</Label>
                            <Input
                                type="date"
                                value={bajaForm.termination_date}
                                onChange={(e) =>
                                    setBajaForm((f) => ({ ...f, termination_date: e.target.value }))
                                }
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo (texto, mín. 5 caracteres)</Label>
                            <Textarea
                                placeholder="Detalle o comentario para el expediente..."
                                value={bajaForm.reason}
                                onChange={(e) =>
                                    setBajaForm((f) => ({ ...f, reason: e.target.value }))
                                }
                                rows={3}
                                className="bg-background resize-none"
                            />
                        </div>
                        {canProcessBaja && (
                            <div className="flex items-center gap-2 pt-1">
                                <Checkbox
                                    id="baja-blacklist"
                                    checked={bajaForm.add_to_blacklist}
                                    onCheckedChange={(c) =>
                                        setBajaForm((f) => ({ ...f, add_to_blacklist: !!c }))
                                    }
                                />
                                <Label
                                    htmlFor="baja-blacklist"
                                    className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                                >
                                    <AlertOctagon className="h-4 w-4 text-amber-500" />
                                    Añadir a lista negra (impedir acceso al sistema)
                                </Label>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={closeBajaModal} disabled={bajaSubmitting}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={submitBaja}
                            disabled={!canSubmitBaja || bajaSubmitting}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {bajaSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirmar Baja
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal consulta usuario */}
            <Dialog
                open={viewModalOpen}
                onOpenChange={(o) => {
                    if (!o) {
                        setViewModalOpen(false);
                        setViewUser(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden border-border bg-background p-0 gap-0">
                    <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-4 border-b border-border space-y-1.5 text-left">
                        <DialogTitle className="text-xl flex items-center gap-2 text-foreground">
                            <Eye className="h-5 w-5 shrink-0 text-blue-500 dark:text-blue-400" />
                            Ver empleado (solo consulta)
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            Información del colaborador. No se pueden editar datos desde esta vista.
                        </DialogDescription>
                    </DialogHeader>
                    {viewUser && (
                        <>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                <div className="px-6 py-5 space-y-5">
                                    <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
                                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                            <span className="font-bold text-lg text-foreground break-words">
                                                {viewUser.name}
                                            </span>
                                            <span className="text-sm text-muted-foreground font-mono">
                                                #{viewUser.employee_number}
                                            </span>
                                        </div>
                                        {viewUser.is_blacklisted && (
                                            <Badge variant="destructive" className="gap-1">
                                                <AlertOctagon className="h-3 w-3" /> VETADO
                                            </Badge>
                                        )}
                                        {viewUser.status && !viewUser.is_blacklisted && (
                                            <Badge variant="secondary">{viewUser.status}</Badge>
                                        )}
                                    </div>
                                    <dl className="grid grid-cols-1 gap-4 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Correo
                                            </dt>
                                            <dd className="flex items-center gap-2 text-foreground">
                                                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{" "}
                                                {viewUser.email || "—"}
                                            </dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Teléfono
                                            </dt>
                                            <dd className="flex items-center gap-2 text-foreground">
                                                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{" "}
                                                {viewUser.phone || "—"}
                                            </dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Campaña
                                            </dt>
                                            <dd className="flex items-center gap-2 text-foreground">
                                                <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{" "}
                                                {viewUser.campaign || "—"}
                                            </dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Área
                                            </dt>
                                            <dd className="flex items-center gap-2 text-foreground">
                                                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{" "}
                                                {viewUser.area || "—"}
                                            </dd>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Puesto
                                            </dt>
                                            <dd className="flex items-center gap-2 text-foreground">
                                                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{" "}
                                                {viewUser.position || "—"}
                                            </dd>
                                        </div>
                                        {viewUser.sede && (
                                            <div className="flex flex-col gap-1">
                                                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Sede
                                                </dt>
                                                <dd className="flex items-center gap-2 text-foreground">
                                                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{" "}
                                                    {viewUser.sede}
                                                </dd>
                                            </div>
                                        )}
                                        {viewUser.ubicacion && (
                                            <div className="flex flex-col gap-1">
                                                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Ubicación
                                                </dt>
                                                <dd className="flex items-center gap-2 text-foreground">
                                                    {viewUser.ubicacion}
                                                </dd>
                                            </div>
                                        )}
                                        {viewUser.roles?.length > 0 && (
                                            <div className="flex flex-col gap-1">
                                                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Rol(es)
                                                </dt>
                                                <dd className="flex flex-wrap gap-1.5">
                                                    {viewUser.roles.map((r) => (
                                                        <Badge key={r.id} variant="secondary" className="text-xs">
                                                            {r.name}
                                                        </Badge>
                                                    ))}
                                                </dd>
                                            </div>
                                        )}
                                        {tab === TAB_BAJAS && viewUser.employee_profile && (
                                            <div className="flex flex-col gap-1 pt-2 border-t border-border">
                                                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Baja (expediente RH)
                                                </dt>
                                                <dd className="flex flex-col gap-1 text-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {viewUser.employee_profile.termination_reason ?? "—"}
                                                    </span>
                                                    {viewUser.employee_profile.termination_date && (
                                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {new Date(
                                                                viewUser.employee_profile.termination_date
                                                            ).toLocaleDateString("es-MX", {
                                                                day: "2-digit",
                                                                month: "long",
                                                                year: "numeric",
                                                            })}
                                                        </span>
                                                    )}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            </div>
                            <DialogFooter className="shrink-0 flex flex-row gap-3 px-6 py-4 border-t border-border bg-muted/30">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setViewModalOpen(false);
                                        setViewUser(null);
                                    }}
                                >
                                    Cerrar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
