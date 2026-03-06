import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { TablePagination } from "@/components/ui/table-pagination";
import { CheckCircle2, Pencil } from "lucide-react";
import { clearCatalogCache } from "@/lib/catalogCache";
import { getApiErrorMessage } from "@/lib/apiErrors";

const PER_PAGE_OPTIONS = ["10", "15", "25", "50", "100"];

export default function IncidentEstados() {
    const [list, setList] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [isFinal, setIsFinal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", code: "", is_final: false });
    const [savingEdit, setSavingEdit] = useState(false);
    const [perPage, setPerPage] = useState(() => localStorage.getItem("incidentEstados.perPage") || "10");
    const [page, setPage] = useState(1);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/incident-statuses");
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
            const { data } = await axios.post("/api/incident-statuses", { name, code, is_final: isFinal });
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
            const { data } = await axios.put(`/api/incident-statuses/${item.id}`, { ...item, is_active: !item.is_active });
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
            const { data } = await axios.put(`/api/incident-statuses/${editing.id}`, { name: editForm.name.trim(), code: editForm.code.trim(), is_final: editForm.is_final, is_active: editing.is_active });
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
    useEffect(() => { localStorage.setItem("incidentEstados.perPage", perPage); }, [perPage]);
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
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Estados de Incidencia</h1>
                        <p className="text-muted-foreground text-sm">Ciclo de vida configurable.</p>
                    </div>
                </div>
            </div>

            <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Nuevo estado</CardTitle>
                    <CardDescription className="text-xs">Define estados para el flujo de incidencias.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto_auto] gap-3 items-end">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Nombre</Label>
                            <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Codigo</Label>
                            <Input placeholder="Codigo" value={code} onChange={(e) => setCode(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                            <Switch checked={isFinal} onCheckedChange={setIsFinal} />
                            <Label className="text-xs text-muted-foreground">Final</Label>
                        </div>
                        <Button type="submit" disabled={saving || !name.trim() || !code.trim()} className="h-9">
                            Agregar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-3"><CardTitle>Listado</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-b border-border/50 hover:bg-transparent">
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Nombre</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Codigo</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Final</TableHead>
                                <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Activa</TableHead>
                                <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-16">
                                        <div className="flex items-center gap-4 px-4">
                                            <Skeleton className="h-4 w-40" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : list.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Sin registros</TableCell></TableRow>
                            ) : paginatedList.map((st) => (
                                <TableRow key={st.id}>
                                    <TableCell>{st.name}</TableCell>
                                    <TableCell>{st.code}</TableCell>
                                    <TableCell>{st.is_final ? "Si" : "No"}</TableCell>
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
                    <DialogHeader><DialogTitle>Editar estado de incidencia</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Nombre</Label><Input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre" /></div>
                        <div className="grid gap-2"><Label>Código</Label><Input value={editForm.code} onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="Código" /></div>
                        <div className="flex items-center gap-2"><Switch id="edit-final-inc" checked={editForm.is_final} onCheckedChange={(v) => setEditForm((prev) => ({ ...prev, is_final: !!v }))} /><Label htmlFor="edit-final-inc">Final</Label></div>
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
