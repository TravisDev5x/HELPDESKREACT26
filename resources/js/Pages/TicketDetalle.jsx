import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "@/lib/axios";
import { loadCatalogs } from "@/lib/catalogCache";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notify } from "@/lib/notify";
import { Loader2 } from "lucide-react";

export default function TicketDetalle() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [catalogs, setCatalogs] = useState({ areas: [], priorities: [], ticket_states: [], area_users: [], positions: [] });
    const [note, setNote] = useState("");
    const [updating, setUpdating] = useState(false);
    const [assigneeId, setAssigneeId] = useState("none");
    const [dueAtLocal, setDueAtLocal] = useState("");

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
            const { data } = await axios.put(`/api/tickets/${id}`, { ...payload, note });
            setTicket(data);
            setNote("");
            setAssigneeId("none");
            setDueAtLocal(data?.due_at ? new Date(data.due_at).toISOString().slice(0, 16) : "");
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

    if (!ticket) return <div className="p-6">Cargando...</div>;

    const abilities = ticket.abilities || {};
    const canChangeArea = Boolean(abilities.change_area);
    const canChangeStatus = Boolean(abilities.change_status);
    const canComment = Boolean(abilities.comment);
    const canAssign = Boolean(abilities.assign);

    const canEdit = canChangeArea || canChangeStatus || canComment;
    const hasAssignee = Boolean(ticket.assigned_user_id);
    const assignedUser = ticket.assigned_user || ticket.assignedUser;

    const histories = ticket.histories || [];
    const withDiff = histories.map((h, idx) => {
        const next = histories[idx + 1];
        if (!next) return { ...h, diff: null };
        const current = new Date(h.created_at);
        const nextDate = new Date(next.created_at);
        const diffMs = current - nextDate;
        const diffHours = Math.round((diffMs / 3600000) * 10) / 10;
        return { ...h, diff: diffHours };
    });

    const assignmentEvents = histories.filter(h => ["assigned", "reassigned", "unassigned"].includes(h.action));
    const areaUsers = catalogs.area_users || [];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Ticket #{ticket.id} — {ticket.subject}</span>
                        <Badge>{ticket.state?.name}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div><strong>Área actual:</strong> {ticket.area_current?.name}</div>
                    <div><strong>Área origen:</strong> {ticket.area_origin?.name}</div>
                    <div><strong>Tipo:</strong> {ticket.ticket_type?.name}</div>
                    <div><strong>Prioridad:</strong> {ticket.priority?.name}</div>
                    <div><strong>Sede:</strong> {ticket.sede?.name}</div>
                    {ticket.ubicacion && <div><strong>Ubicación:</strong> {ticket.ubicacion?.name}</div>}
                    <div><strong>Solicitante:</strong> {ticket.requester?.name}</div>
                    <div><strong>Responsable:</strong> {assignedUser ? `${assignedUser.name}${assignedUser.position?.name ? " - " + assignedUser.position.name : ""}` : "Sin asignar"}</div>
                    <div><strong>Fecha límite:</strong> {ticket.due_at ? new Date(ticket.due_at).toLocaleString() : "—"}</div>
                    {ticket.sla_status_text && (
                        <div><strong>SLA:</strong> <span className={ticket.is_overdue ? "text-destructive font-medium" : "text-muted-foreground"}>{ticket.sla_status_text}</span></div>
                    )}
                    <div className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</div>
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
                            <Textarea placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} disabled={!canComment || updating} />
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
                            <Button onClick={assignTicket} disabled={updating || assigneeId === "none"}>
                                Reasignar
                            </Button>
                            <div className="flex gap-2">
                                <Button onClick={takeTicket} disabled={updating || hasAssignee}>
                                    Tomar
                                </Button>
                                <Button variant="outline" onClick={unassignTicket} disabled={updating || !hasAssignee}>
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
                                if (h.action === "unassigned") text = `Liberado (antes ${fromName})`;

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
                <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
                <CardContent>
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
                            {withDiff.length ? withDiff.map((h) => (
                                <TableRow key={h.id}>
                                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                                    <TableCell className="text-xs">{h.actor?.name}</TableCell>
                                    <TableCell className="text-xs">{h.from_area?.name || '—'} → {h.to_area?.name || '—'}</TableCell>
                                    <TableCell className="text-xs">{h.state?.name || '—'}</TableCell>
                                    <TableCell className="text-xs">{h.note || '—'}</TableCell>
                                    <TableCell className="text-[11px] text-muted-foreground">{h.diff ? `${h.diff} h desde el evento anterior` : '—'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin historial</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

