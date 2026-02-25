import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { loadCatalogs, clearCatalogCache } from "@/lib/catalogCache";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { notify } from "@/lib/notify";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MessageSquare, Lock, History, Paperclip, Trash2, ArrowLeft, ChevronDown, ChevronUp, UserCheck, AlertTriangle, XCircle } from "lucide-react";

export default function TicketDetalle() {
    const { id } = useParams();
    const { user, can } = useAuth();
    const backToListLink = (can("tickets.manage_all") || can("tickets.view_area")) ? "/tickets" : "/";
    const [ticket, setTicket] = useState(null);
    const [catalogs, setCatalogs] = useState({ areas: [], priorities: [], ticket_states: [], area_users: [], positions: [] });
    const [note, setNote] = useState("");
    const [updating, setUpdating] = useState(false);
    const [assigneeId, setAssigneeId] = useState("none");
    const [dueAtLocal, setDueAtLocal] = useState("");
    const [isInternalNote, setIsInternalNote] = useState(true);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [sendingAlert, setSendingAlert] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const load = async () => {
        try {
            const [catalogData, ticketRes] = await Promise.all([
                loadCatalogs(),
                axios.get(`/api/tickets/${id}`),
            ]);
            setCatalogs({
                areas: catalogData.areas || [],
                priorities: catalogData.priorities || [],
                ticket_states: catalogData.ticket_states || [],
                area_users: catalogData.area_users || [],
                positions: catalogData.positions || [],
            });
            setTicket(ticketRes.data);
            const t = ticketRes.data;
            setDueAtLocal(t?.due_at ? new Date(t.due_at).toISOString().slice(0, 16) : "");
        } catch (err) {
            notify.error("No se pudo cargar el ticket");
        }
    };

    useEffect(() => { load(); }, [id]);

    const update = async (payload) => {
        setUpdating(true);
        try {
            const { data } = await axios.put(`/api/tickets/${id}`, { ...payload, note, is_internal: isInternalNote });
            setTicket(data);
            setNote("");
            setAssigneeId("none");
            setDueAtLocal(data?.due_at ? new Date(data.due_at).toISOString().slice(0, 16) : "");
            clearCatalogCache();
            notify.success("Ticket actualizado");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo actualizar");
        } finally { setUpdating(false); }
    };

    const takeTicket = async () => {
        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/tickets/${id}/take`);
            setTicket(data);
            notify.success("Ticket tomado");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo tomar");
        } finally { setUpdating(false); }
    };

    const assignTicket = async () => {
        if (assigneeId === "none") return;
        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/tickets/${id}/assign`, { assigned_user_id: Number(assigneeId) });
            setTicket(data);
            setAssigneeId("none");
            notify.success("Responsable asignado");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo reasignar");
        } finally { setUpdating(false); }
    };

    const unassignTicket = async () => {
        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/tickets/${id}/unassign`);
            setTicket(data);
            notify.success("Ticket liberado");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo liberar");
        } finally { setUpdating(false); }
    };

    const sendAlert = async () => {
        setSendingAlert(true);
        try {
            const { data } = await axios.post(`/api/tickets/${id}/alert`, { message: alertMessage.trim() || undefined });
            if (data.ticket) setTicket(data.ticket);
            setAlertMessage("");
            notify.success("Alerta enviada. Se ha notificado al responsable y a supervisores.");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo enviar la alerta");
        } finally { setSendingAlert(false); }
    };

    const cancelTicket = async () => {
        if (!window.confirm("¿Estás seguro de que deseas cancelar este ticket? Esta acción no se puede deshacer.")) return;
        setCancelling(true);
        try {
            const { data } = await axios.post(`/api/tickets/${id}/cancel`);
            setTicket(data);
            notify.success("Ticket cancelado");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudo cancelar el ticket");
        } finally { setCancelling(false); }
    };

    const uploadAttachments = async () => {
        if (!attachmentFiles.length) return;
        setUploadingAttachments(true);
        try {
            const payload = new FormData();
            attachmentFiles.forEach((f) => payload.append("attachments[]", f));
            const { data } = await axios.post(`/api/tickets/${id}/attachments`, payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setTicket((prev) => ({ ...prev, attachments: [...(prev?.attachments || []), ...(data || [])] }));
            setAttachmentFiles([]);
            notify.success("Adjuntos cargados");
        } catch (err) {
            notify.error(err?.response?.data?.message || "No se pudieron cargar los adjuntos");
        } finally {
            setUploadingAttachments(false);
        }
    };

    const removeAttachment = async (att) => {
        try {
            await axios.delete(`/api/tickets/${id}/attachments/${att.id}`);
            setTicket((prev) => ({ ...prev, attachments: (prev?.attachments || []).filter((a) => a.id !== att.id) }));
            notify.success("Adjunto eliminado");
        } catch (err) {
            notify.error("No se pudo eliminar el adjunto");
        }
    };

    const attendedBy = useMemo(() => {
        if (!ticket) return [];
        const assigned = ticket.assigned_user || ticket.assignedUser;
        const raw = ticket.histories ?? ticket.histories_list ?? [];
        const hist = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : (raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.values(raw) : []));
        const ids = new Set();
        const names = [];
        if (assigned?.id) {
            ids.add(assigned.id);
            names.push({ id: assigned.id, name: assigned.name });
        }
        hist.forEach((h) => {
            if (h.actor_id && h.actor_id !== ticket.requester_id && !ids.has(h.actor_id)) {
                ids.add(h.actor_id);
                names.push({ id: h.actor_id, name: h.actor?.name || "—" });
            }
        });
        return names;
    }, [ticket]);

    if (!ticket) {
        return (
            <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Card>
                    <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                    <CardContent className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    const abilities = ticket.abilities || {};
    const canChangeArea = Boolean(abilities.change_area);
    const canChangeStatus = Boolean(abilities.change_status);
    const canComment = Boolean(abilities.comment);
    const canAssign = Boolean(abilities.assign);
    const canRelease = Boolean(abilities.release);
    const canAlert = Boolean(abilities.alert);
    const canCancel = Boolean(abilities.cancel);

    const canEdit = canChangeArea || canChangeStatus || canComment;
    const hasAssignee = Boolean(ticket.assigned_user_id);
    const assignedUser = ticket.assigned_user || ticket.assignedUser;

    const rawHist = ticket.histories ?? [];
    const histories = Array.isArray(rawHist) ? rawHist : (Array.isArray(rawHist?.data) ? rawHist.data : (rawHist && typeof rawHist === 'object' && !Array.isArray(rawHist) ? Object.values(rawHist) : []));
    const assignmentEvents = histories.filter(h => ["assigned", "reassigned", "unassigned"].includes(h.action));
    const commentEntries = histories.filter(h => h.action === "comment" && !h.is_internal);
    const internalNoteEntries = histories.filter(h => h.action === "comment" && h.is_internal);
    const stateChangeEntries = histories.filter(h => h.action && h.action !== "comment" && ["escalated", "state_change", "assigned", "reassigned", "unassigned"].includes(h.action));
    const alertEntries = histories.filter(h => h.action === "requester_alert");
    const stateChangeWithDiff = stateChangeEntries.map((h, idx) => {
        const next = stateChangeEntries[idx + 1];
        if (!next) return { ...h, diff: null };
        const current = new Date(h.created_at);
        const nextDate = new Date(next.created_at);
        const diffHours = Math.round((current - nextDate) / 3600000 * 10) / 10;
        return { ...h, diff: diffHours };
    });
    const areaUsers = catalogs.area_users || [];

    const descLong = (ticket.description || "").length > 280;

    const isRequester = user && Number(user.id) === Number(ticket.requester_id);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
                    <Link to={backToListLink}><ArrowLeft className="h-4 w-4 mr-1" /> Volver al listado</Link>
                </Button>
            </div>

            {isRequester && attendedBy.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <UserCheck className="h-4 w-4" /> Quién ha atendido este ticket
                        </CardTitle>
                        <CardDescription className="text-xs">Personas que han intervenido en la atención de tu solicitud.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="flex flex-wrap gap-2">
                            {attendedBy.map((p) => (
                                <li key={p.id}>
                                    <Badge variant="secondary" className="font-normal">{p.name}</Badge>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {(canAlert || canCancel) && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Acciones como solicitante
                        </CardTitle>
                        <CardDescription className="text-xs">
                            No puedes editar ni añadir notas al ticket. Para añadir observaciones o avisar de falta de atención, usa <strong>Enviar alerta</strong>: se notifica al responsable y supervisores y el mensaje queda registrado como observación en el historial del ticket.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {canAlert && (
                            <div className="space-y-2">
                                <Label className="text-xs">Mensaje (observación que quedará en el ticket y en la notificación)</Label>
                                <Textarea
                                    placeholder="Ej: Llevo varios días sin respuesta..."
                                    value={alertMessage}
                                    onChange={(e) => setAlertMessage(e.target.value)}
                                    disabled={sendingAlert}
                                    className="min-h-[80px] resize-y"
                                    maxLength={1000}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={sendAlert}
                                    disabled={sendingAlert}
                                >
                                    {sendingAlert ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                                    Enviar alerta
                                </Button>
                            </div>
                        )}
                        {canCancel && (
                            <div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={cancelTicket}
                                    disabled={cancelling}
                                >
                                    {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                                    Cancelar ticket
                                </Button>
                                <p className="text-xs text-muted-foreground mt-1">Solo puedes cancelar tickets que no estén resueltos o cerrados.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className={ticket.is_overdue ? "border-l-4 border-l-destructive" : ""}>
                <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-lg md:text-xl">Ticket #{ticket.id} — {ticket.subject}</span>
                        <Badge variant={ticket.is_overdue ? "destructive" : "secondary"}>{ticket.state?.name}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div><strong className="text-muted-foreground">Área actual:</strong> {ticket.area_current?.name}</div>
                        <div><strong className="text-muted-foreground">Área origen:</strong> {ticket.area_origin?.name}</div>
                        <div><strong className="text-muted-foreground">Tipo:</strong> {ticket.ticket_type?.name}</div>
                        <div><strong className="text-muted-foreground">Prioridad:</strong> {ticket.priority?.name}</div>
                        <div><strong className="text-muted-foreground">Sede:</strong> {ticket.sede?.name}</div>
                        {ticket.ubicacion && <div><strong className="text-muted-foreground">Ubicación:</strong> {ticket.ubicacion?.name}</div>}
                        <div><strong className="text-muted-foreground">Solicitante:</strong> {ticket.requester?.name}</div>
                        <div><strong className="text-muted-foreground">Responsable:</strong> {assignedUser ? `${assignedUser.name}${assignedUser.position?.name ? " — " + assignedUser.position.name : ""}` : "Sin asignar"}</div>
                        <div><strong className="text-muted-foreground">Fecha límite:</strong> {ticket.due_at ? new Date(ticket.due_at).toLocaleString() : "—"}</div>
                        {ticket.sla_status_text && (
                            <div><strong className="text-muted-foreground">SLA:</strong> <span className={ticket.is_overdue ? "text-destructive font-medium" : "text-muted-foreground"}>{ticket.sla_status_text}</span></div>
                        )}
                    </div>
                    <div>
                        <strong className="text-muted-foreground text-sm block mb-1">Descripción</strong>
                        <div className="text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm">
                            {descLong && !descExpanded ? (
                                <>
                                    {(ticket.description || "").slice(0, 280)}…
                                    <button type="button" onClick={() => setDescExpanded(true)} className="ml-2 text-primary hover:underline inline-flex items-center gap-0.5 text-xs font-medium">Ver más <ChevronDown className="h-3 w-3" /></button>
                                </>
                            ) : descLong && descExpanded ? (
                                <>
                                    {ticket.description}
                                    <button type="button" onClick={() => setDescExpanded(false)} className="ml-2 text-primary hover:underline inline-flex items-center gap-0.5 text-xs font-medium">Ver menos <ChevronUp className="h-3 w-3" /></button>
                                </>
                            ) : (
                                ticket.description || "—"
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {canEdit && (
                <Card>
                    <CardHeader>
                        <CardTitle>Actualizar</CardTitle>
                        <p className="text-sm text-muted-foreground">Cambios de estado, prioridad o área quedan registrados en el historial.</p>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        <Select value={String(ticket.area_current_id)} onValueChange={(v) => update({ area_current_id: Number(v) })} disabled={!canChangeArea || updating}>
                            <SelectTrigger><SelectValue placeholder="Área actual" /></SelectTrigger>
                            <SelectContent>{catalogs.areas.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={String(ticket.priority_id)} onValueChange={(v) => update({ priority_id: Number(v) })} disabled={!canChangeStatus || updating}>
                            <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                            <SelectContent>{catalogs.priorities.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={String(ticket.ticket_state_id)} onValueChange={(v) => update({ ticket_state_id: Number(v) })} disabled={!canChangeStatus || updating}>
                            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                            <SelectContent>{catalogs.ticket_states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="md:col-span-3 flex flex-wrap items-end gap-2">
                            <div className="flex-1 min-w-[200px] space-y-1">
                                <Label className="text-xs">Fecha límite (opcional)</Label>
                                <Input
                                    type="datetime-local"
                                    value={dueAtLocal}
                                    onChange={(e) => setDueAtLocal(e.target.value)}
                                    disabled={!canChangeStatus || updating}
                                    className="h-9"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canChangeStatus || updating}
                                onClick={() => update({ due_at: dueAtLocal ? new Date(dueAtLocal).toISOString() : null })}
                            >
                                Actualizar fecha
                            </Button>
                        </div>
                        <div className="md:col-span-3 space-y-2">
                            <Textarea placeholder="Nota o comentario (opcional)" value={note} onChange={(e) => setNote(e.target.value)} disabled={!canComment || updating} />
                            {canComment && (
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox checked={isInternalNote} onCheckedChange={(v) => setIsInternalNote(!!v)} disabled={updating} />
                                        <span className="text-muted-foreground">Nota interna (no visible para el solicitante)</span>
                                    </label>
                                    <Button onClick={() => update({})} disabled={updating}>
                                        {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Guardar nota / cambio
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">Adjuntos</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{(ticket.attachments || []).length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                    {canEdit && (
                        <div className="flex flex-wrap items-end gap-2">
                            <Input
                                type="file"
                                multiple
                                className="max-w-xs"
                                onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
                            />
                            <Button
                                size="sm"
                                onClick={uploadAttachments}
                                disabled={uploadingAttachments || attachmentFiles.length === 0}
                            >
                                {uploadingAttachments ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Paperclip className="h-4 w-4 mr-2" />}
                                Subir
                            </Button>
                        </div>
                    )}
                    {(ticket.attachments || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin adjuntos.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Archivo</TableHead>
                                    <TableHead className="text-xs">Tamaño</TableHead>
                                    {canEdit && <TableHead className="text-right text-xs">Acciones</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(ticket.attachments || []).map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell>
                                            <a
                                                href={`/api/tickets/${id}/attachments/${a.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline text-sm"
                                            >
                                                {a.original_name}
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{Math.round((a.size || 0) / 1024)} KB</TableCell>
                                        {canEdit && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAttachment(a)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {canAssign && (
                <Card>
                    <CardHeader>
                        <CardTitle>Responsable</CardTitle>
                        <p className="text-sm text-muted-foreground">Tomar, reasignar o liberar el ticket.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-sm">
                            <strong>Actual:</strong>{" "}
                            {assignedUser ? `${assignedUser.name}${assignedUser.position?.name ? " - " + assignedUser.position.name : ""}` : "Sin asignar"}
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={updating}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Seleccionar responsable</SelectItem>
                                    {areaUsers.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={assignTicket} disabled={updating || assigneeId === "none" || (hasAssignee && !canAssign)}>
                                Reasignar
                            </Button>
                            <div className="flex gap-2">
                                <Button onClick={takeTicket} disabled={updating || hasAssignee || !canAssign}>
                                    Tomar
                                </Button>
                                <Button variant="outline" onClick={unassignTicket} disabled={updating || !hasAssignee || !canRelease} title={hasAssignee && !canRelease ? "Solo el responsable actual puede liberar el ticket" : ""}>
                                    Liberar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle>Asignaciones</CardTitle></CardHeader>
                <CardContent>
                    {assignmentEvents.length ? (
                        <div className="space-y-2">
                            {assignmentEvents.map((h) => {
                                const fromName = h.from_assignee?.name || "-";
                                const toName = h.to_assignee?.name || "-";
                                let text = "Movimiento de asignación";
                                if (h.action === "assigned") text = `Asignado a ${toName}`;
                                if (h.action === "reassigned") text = `Reasignado de ${fromName} a ${toName}`;
                                if (h.action === "unassigned") text = h.note ? `${h.note} (antes ${fromName})` : `Liberado (antes ${fromName})`;

                                return (
                                    <div key={h.id} className="text-sm">
                                        <div className="font-medium">{text}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(h.created_at).toLocaleString()} • {h.actor?.name || "—"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">Sin asignaciones</div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Historial y comentarios</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4" /> Comentarios (visibles para el solicitante)
                        </h4>
                        {commentEntries.length ? (
                            <div className="space-y-3">
                                {commentEntries.map((h) => (
                                    <div key={h.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                                        <div className="text-muted-foreground text-xs mb-1">{h.actor?.name} · {new Date(h.created_at).toLocaleString()}</div>
                                        <div className="whitespace-pre-wrap">{h.note || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Sin comentarios visibles para el solicitante.</p>
                        )}
                    </div>
                    {canEdit && (
                        <div>
                            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                <Lock className="h-4 w-4" /> Notas internas
                            </h4>
                            {internalNoteEntries.length ? (
                                <div className="space-y-3">
                                    {internalNoteEntries.map((h) => (
                                        <div key={h.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                                            <div className="text-muted-foreground text-xs mb-1">{h.actor?.name} · {new Date(h.created_at).toLocaleString()}</div>
                                            <div className="whitespace-pre-wrap">{h.note || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Sin notas internas.</p>
                            )}
                        </div>
                    )}
                    {alertEntries.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" /> Alertas y observaciones del solicitante
                            </h4>
                            <div className="space-y-3">
                                {alertEntries.map((h) => (
                                    <div key={h.id} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm">
                                        <div className="text-muted-foreground text-xs mb-1">{h.actor?.name} · {new Date(h.created_at).toLocaleString()}</div>
                                        <div className="whitespace-pre-wrap">{h.note || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                            <History className="h-4 w-4" /> Cambios de estado
                        </h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Actor</TableHead>
                                    <TableHead>De → A</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Nota</TableHead>
                                    <TableHead>Δ tiempo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stateChangeWithDiff.length ? stateChangeWithDiff.map((h) => (
                                    <TableRow key={h.id}>
                                        <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                                        <TableCell className="text-xs">{h.actor?.name}</TableCell>
                                        <TableCell className="text-xs">{h.from_area?.name || '—'} → {h.to_area?.name || '—'}</TableCell>
                                        <TableCell className="text-xs">{h.state?.name || '—'}</TableCell>
                                        <TableCell className="text-xs">{h.note || '—'}</TableCell>
                                        <TableCell className="text-[11px] text-muted-foreground">{h.diff ? `${h.diff} h desde el evento anterior` : '—'}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Sin cambios de estado</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

