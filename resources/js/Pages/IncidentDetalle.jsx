
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "@/lib/axios";
import { loadCatalogs } from "@/lib/catalogCache";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { Loader2, Paperclip, Trash2, AlertTriangle, Building2, CalendarDays, User } from "lucide-react";

export default function IncidentDetalle() {
    const { id } = useParams();
    const [incident, setIncident] = useState(null);
    const [catalogs, setCatalogs] = useState({
        areas: [],
        sedes: [],
        incident_types: [],
        incident_severities: [],
        incident_statuses: [],
        area_users: [],
    });
    const [note, setNote] = useState("");
    const [updating, setUpdating] = useState(false);
    const [assigneeId, setAssigneeId] = useState("none");
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const load = async () => {
        try {
            const [catalogData, incidentRes] = await Promise.all([
                loadCatalogs(),
                axios.get(`/api/incidents/${id}`),
            ]);
            setCatalogs({
                areas: catalogData.areas || [],
                sedes: catalogData.sedes || [],
                incident_types: catalogData.incident_types || [],
                incident_severities: catalogData.incident_severities || [],
                incident_statuses: catalogData.incident_statuses || [],
                area_users: catalogData.area_users || [],
            });
            setIncident(incidentRes.data);
        } catch (err) {
            notify.error("No se pudo cargar la incidencia");
        }
    };

    useEffect(() => { load(); }, [id]);

    const update = async (payload) => {
        setUpdating(true);
        try {
            const { data } = await axios.put(`/api/incidents/${id}`, { ...payload, note });
            setIncident(data);
            setNote("");
            setAssigneeId("none");
            notify.success("Incidencia actualizada");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo actualizar");
        } finally { setUpdating(false); }
    };

    const takeIncident = async () => {
        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/incidents/${id}/take`);
            setIncident(data);
            notify.success("Incidencia tomada");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo tomar");
        } finally { setUpdating(false); }
    };

    const assignIncident = async () => {
        if (assigneeId === "none") return;
        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/incidents/${id}/assign`, { assigned_user_id: Number(assigneeId) });
            setIncident(data);
            setAssigneeId("none");
            notify.success("Responsable asignado");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo reasignar");
        } finally { setUpdating(false); }
    };

    const unassignIncident = async () => {
        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/incidents/${id}/unassign`);
            setIncident(data);
            notify.success("Incidencia liberada");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo liberar");
        } finally { setUpdating(false); }
    };

    const uploadAttachments = async () => {
        if (!files.length) return;
        setUploading(true);
        try {
            const payload = new FormData();
            files.forEach((f) => payload.append("attachments[]", f));
            const { data } = await axios.post(`/api/incidents/${id}/attachments`, payload, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setIncident((prev) => ({
                ...prev,
                attachments: [...(prev?.attachments || []), ...(data || [])],
            }));
            setFiles([]);
            notify.success("Adjuntos cargados");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudieron cargar los adjuntos");
        } finally { setUploading(false); }
    };

    const removeAttachment = async (attachment) => {
        try {
            await axios.delete(`/api/incidents/${id}/attachments/${attachment.id}`);
            setIncident((prev) => ({
                ...prev,
                attachments: (prev?.attachments || []).filter((a) => a.id !== attachment.id),
            }));
        } catch (err) {
            notify.error("No se pudo eliminar el adjunto");
        }
    };

    if (!incident) {
        return (
            <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    const abilities = incident.abilities || {};
    const canChangeStatus = Boolean(abilities.change_status);
    const canComment = Boolean(abilities.comment);
    const canAssign = Boolean(abilities.assign);

    const assignedUser = incident.assigned_user || incident.assignedUser;
    const histories = incident.histories || [];
    const attachments = incident.attachments || [];
    const areaUsers = catalogs.area_users || [];
    const status = incident.incident_status || incident.incidentStatus;
    const severity = incident.incident_severity || incident.incidentSeverity;
    const type = incident.incident_type || incident.incidentType;

    const resolveSeverityStyles = (item) => {
        const level = Number(item?.level);
        let styles = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
        if (Number.isFinite(level)) {
            if (level >= 4) styles = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
            else if (level >= 3) styles = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
            else if (level >= 2) styles = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
        }
        return styles;
    };

    const resolveStatusStyles = (item) => {
        const code = (item?.code || "").toLowerCase();
        if (item?.is_final) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        if (code.includes("cancel") || code.includes("rechaz")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    };

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Incidencia #{incident.id}
                        </h1>
                        <p className="text-sm text-muted-foreground">Detalle y seguimiento de la incidencia.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] font-semibold border ${resolveStatusStyles(status)}`}>
                        {status?.name || "Estado"}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] font-semibold border ${resolveSeverityStyles(severity)}`}>
                        {severity?.name || "Severidad"}
                    </Badge>
                </div>
            </div>

            <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold">{incident.subject}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">Folio #{incident.id}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <Separator className="mx-6 opacity-50" />
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Tipo</Label>
                        <div className="font-medium">{type?.name || "-"}</div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Severidad</Label>
                        <div className="font-medium">{severity?.name || "-"}</div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Area</Label>
                        <div className="font-medium">{incident.area?.name || "-"}</div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Sede</Label>
                        <div className="font-medium flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {incident.sede?.name || "-"}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Reporta</Label>
                        <div className="font-medium flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {incident.reporter?.name || "-"}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Involucrado</Label>
                        <div className="font-medium">{incident.involved_user?.name || incident.involvedUser?.name || "Sin involucrado"}</div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Responsable</Label>
                        <div className="font-medium">{assignedUser ? assignedUser.name : "Sin asignar"}</div>
                    </div>
                    {incident.occurred_at && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Fecha incidente</Label>
                            <div className="font-medium flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                {new Date(incident.occurred_at).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                    {incident.enabled_at && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Fecha de habilitacion</Label>
                            <div className="font-medium flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                {new Date(incident.enabled_at).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                    <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Descripcion</Label>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/10 border border-border/50 rounded-lg p-3">
                            {incident.description || "Sin descripcion."}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {(canChangeStatus || canComment) && (
                <Card className="border border-border/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle>Actualizar</CardTitle>
                        <CardDescription className="text-xs">Cambios de estado o severidad quedan registrados en el historial.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Estado</Label>
                            <Select value={String(incident.incident_status_id)} onValueChange={(v) => update({ incident_status_id: Number(v) })} disabled={!canChangeStatus || updating}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                                <SelectContent>{catalogs.incident_statuses.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Severidad</Label>
                            <Select value={String(incident.incident_severity_id)} onValueChange={(v) => update({ incident_severity_id: Number(v) })} disabled={!canChangeStatus || updating}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Severidad" /></SelectTrigger>
                                <SelectContent>{catalogs.incident_severities.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-3 space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Nota</Label>
                            <Textarea
                                placeholder="Nota (opcional)"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={!canComment || updating}
                                className="min-h-[100px] bg-muted/10"
                            />
                            {canComment && (
                                <Button onClick={() => update({})} disabled={updating}>
                                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar nota / cambio
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {canAssign && (
                <Card className="border border-border/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle>Responsable</CardTitle>
                        <CardDescription className="text-xs">Tomar, reasignar o liberar la incidencia.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Actual:</span>{" "}
                            <span className="font-medium">{assignedUser ? assignedUser.name : "Sin asignar"}</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Responsable</Label>
                                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={updating}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Seleccionar responsable</SelectItem>
                                        {areaUsers.map((u) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={assignIncident} disabled={updating || assigneeId === "none"} className="self-end">
                                Reasignar
                            </Button>
                            <div className="flex gap-2 self-end">
                                <Button onClick={takeIncident} disabled={updating || Boolean(incident.assigned_user_id)}>
                                    Tomar
                                </Button>
                                <Button variant="outline" onClick={unassignIncident} disabled={updating || !incident.assigned_user_id}>
                                    Liberar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Evidencias</CardTitle>
                            <CardDescription className="text-xs">Adjunta archivos de soporte.</CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{attachments.length} adjuntos</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Archivos</Label>
                            <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                        </div>
                        <Button onClick={uploadAttachments} disabled={uploading || files.length === 0} className="h-9">
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
                            Subir
                        </Button>
                    </div>

                    {attachments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin adjuntos.</p>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b border-border/50 hover:bg-transparent">
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Archivo</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Tamano</TableHead>
                                    <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attachments.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell>
                                            <a href={a.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                {a.original_name}
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{Math.round((a.size || 0) / 1024)} KB</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => removeAttachment(a)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Historial</CardTitle>
                    <CardDescription className="text-xs">Bitacora de cambios y comentarios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {histories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin movimientos.</p>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b border-border/50 hover:bg-transparent">
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Actor</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Cambio</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Nota</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {histories.map((h) => (
                                    <TableRow key={h.id}>
                                        <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                                        <TableCell className="text-xs">{h.actor?.name}</TableCell>
                                        <TableCell className="text-xs space-y-1">
                                            {h.from_status?.name && h.to_status?.name && (
                                                <div>Estado: {h.from_status.name} -&gt; {h.to_status.name}</div>
                                            )}
                                            {h.from_assignee?.name || h.to_assignee?.name ? (
                                                <div>Responsable: {h.from_assignee?.name || "-"} -&gt; {h.to_assignee?.name || "-"}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{h.note || "-"}</TableCell>
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
