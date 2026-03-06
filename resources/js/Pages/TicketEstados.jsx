import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { clearCatalogCache } from "@/lib/catalogCache";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { TablePagination } from "@/components/ui/table-pagination";
import { Pencil } from "lucide-react";

const PER_PAGE_OPTIONS = ["10", "15", "25", "50", "100"];

export default function TicketEstados() {
    const [list, setList] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [isFinal, setIsFinal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", code: "", is_final: false });
    const [savingEdit, setSavingEdit] = useState(false);
    const [perPage, setPerPage] = useState(() => localStorage.getItem("ticketEstados.perPage") || "10");
    const [page, setPage] = useState(1);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/ticket-states");
            setList(data);
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudieron cargar"));
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const create = async (e) => {
        e.preventDefault();
        if (!name.trim() || !code.trim()) return;
        setSaving(true);
        try {
            const { data } = await axios.post("/api/ticket-states", { name, code, is_final: isFinal });
            setList((prev) => [data, ...prev]);
            clearCatalogCache();
            setName(""); setCode(""); setIsFinal(false);
            notify.success("Estado creado");
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo crear"));
        } finally { setSaving(false); }
    };

    const toggle = async (item) => {
        try {
            const { data } = await axios.put(`/api/ticket-states/${item.id}`, { ...item, is_active: !item.is_active });
            setList((prev) => prev.map((s) => s.id === data.id ? data : s));
            clearCatalogCache();
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        }
    };

    const openEdit = (item) => { setEditing(item); setEditForm({ name: item.name || "", code: item.code || "", is_final: Boolean(item.is_final) }); };
    const saveEdit = async () => {
        if (!editing || !editForm.name.trim() || !editForm.code.trim()) return;
        setSavingEdit(true);
        try {
            const { data } = await axios.put(`/api/ticket-states/${editing.id}`, { name: editForm.name.trim(), code: editForm.code.trim(), is_final: editForm.is_final, is_active: editing.is_active });
            setList((prev) => prev.map((s) => s.id === data.id ? data : s));
            clearCatalogCache(); setEditing(null); notify.success("Estado actualizado");
        } catch (err) { notify.error(getApiErrorMessage(err, "No se pudo actualizar")); }
        finally { setSavingEdit(false); }
    };

    const total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / Number(perPage)));
    const currentPage = Math.min(page, lastPage);
    const paginatedList = useMemo(() => list.slice((currentPage - 1) * Number(perPage), currentPage * Number(perPage)), [list, currentPage, perPage]);
    useEffect(() => { if (currentPage !== page) setPage(currentPage); }, [currentPage, page]);
    useEffect(() => { localStorage.setItem("ticketEstados.perPage", perPage); }, [perPage]);
    const goToPage = (p) => setPage(Math.max(1, Math.min(p, lastPage)));
    const from = total === 0 ? 0 : (currentPage - 1) * Number(perPage) + 1;
    const to = Math.min(currentPage * Number(perPage), total);
    const pageNumbers = useMemo(() => {
        if (lastPage <= 7) return Array.from({ length: lastPage }, (_, i) => i + 1);
        const pages = [1]; if (currentPage > 3) pages.push("…");
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(lastPage - 1, currentPage + 1); i++) { if (!pages.includes(i)) pages.push(i); }
        if (currentPage < lastPage - 2) pages.push("…"); if (lastPage > 1) pages.push(lastPage);
        return pages;
    }, [lastPage, currentPage]);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Estados de Ticket</h1>
                    <p className="text-muted-foreground text-sm">Ciclo de vida configurable.</p>
                </div>
                <form onSubmit={create} className="flex flex-wrap gap-2">
                    <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
                    <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={isFinal} onCheckedChange={setIsFinal} />
                        Final
                    </label>
                    <Button type="submit" disabled={saving || !name.trim() || !code.trim()}>Agregar</Button>
                </form>
            </div>
            <Card>
                <CardHeader><CardTitle>Listado</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Final</TableHead>
                                <TableHead className="text-right">Activa</TableHead>
                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>
                            ) : list.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : paginatedList.map((st) => (
                                <TableRow key={st.id}>
                                    <TableCell>{st.name}</TableCell>
                                    <TableCell>{st.code}</TableCell>
                                    <TableCell>{st.is_final ? "Sí" : "No"}</TableCell>
                                    <TableCell className="text-right"><Switch checked={st.is_active} onCheckedChange={() => toggle(st)} /></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEdit(st)}><Pencil className="h-3.5 w-3.5" /> Editar</Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {!loading && list.length > 0 && (
                        <TablePagination
                            total={total}
                            from={from}
                            to={to}
                            currentPage={currentPage}
                            lastPage={lastPage}
                            perPage={perPage}
                            perPageOptions={PER_PAGE_OPTIONS}
                            onPerPageChange={setPerPage}
                            onPageChange={(p) => setPage(p)}
                        />
                    )}
                </CardContent>
            </Card>
            <Dialog open={!!editing} onOpenChange={(open) => { if (!savingEdit) setEditing(open ? editing : null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Editar estado</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Nombre</Label><Input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre" /></div>
                        <div className="grid gap-2"><Label>Código</Label><Input value={editForm.code} onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="Código" /></div>
                        <div className="flex items-center gap-2"><Switch id="edit-final-te" checked={editForm.is_final} onCheckedChange={(v) => setEditForm((prev) => ({ ...prev, is_final: !!v }))} /><Label htmlFor="edit-final-te">Final</Label></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancelar</Button>
                        <Button onClick={saveEdit} disabled={savingEdit || !editForm.name.trim() || !editForm.code.trim()}>{savingEdit ? "Guardando…" : "Guardar"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
