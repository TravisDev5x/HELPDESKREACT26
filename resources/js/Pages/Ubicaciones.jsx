import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { notify } from "@/lib/notify";
import { Switch } from "@/components/ui/switch";
import { clearCatalogCache } from "@/lib/catalogCache";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { TablePagination } from "@/components/ui/table-pagination";
import { Pencil } from "lucide-react";

const PER_PAGE_OPTIONS = ["10", "15", "25", "50", "100"];

export default function Ubicaciones() {
    const [sedes, setSedes] = useState([]);
    const [list, setList] = useState([]);
    const [sedeId, setSedeId] = useState("all");
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [sedeForNew, setSedeForNew] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingUbic, setEditingUbic] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", code: "", sede_id: "", is_active: true });
    const [savingEdit, setSavingEdit] = useState(false);
    const [perPage, setPerPage] = useState(() => localStorage.getItem("ubicaciones.perPage") || "10");
    const [page, setPage] = useState(1);

    const load = async () => {
        setLoading(true);
        try {
            const [{ data: sedesData }, { data: ubis }] = await Promise.all([
                axios.get("/api/sedes"),
                axios.get("/api/ubicaciones"),
            ]);
            setSedes(sedesData);
            setList(ubis);
            if (!sedeForNew && sedesData.length) setSedeForNew(String(sedesData[0].id));
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudieron cargar ubicaciones"));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        if (sedeId === "all") return list;
        return list.filter((u) => String(u.sede_id) === String(sedeId));
    }, [list, sedeId]);

    const create = async (e) => {
        e.preventDefault();
        if (!name.trim() || !sedeForNew) return;
        setSaving(true);
        try {
            const { data } = await axios.post("/api/ubicaciones", {
                name,
                code: code || null,
                sede_id: sedeForNew,
            });
            setList((prev) => [data, ...prev]);
            clearCatalogCache();
            setName(""); setCode("");
            notify.success("Ubicación creada");
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo crear"));
        } finally { setSaving(false); }
    };

    const toggle = async (ubic) => {
        try {
            const { data } = await axios.put(`/api/ubicaciones/${ubic.id}`, {
                ...ubic,
                sede_id: ubic.sede_id,
                is_active: !ubic.is_active,
            });
            setList((prev) => prev.map((u) => u.id === data.id ? data : u));
            clearCatalogCache();
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        }
    };

    const openEdit = (u) => {
        setEditingUbic(u);
        setEditForm({ name: u.name || "", code: u.code || "", sede_id: String(u.sede_id || ""), is_active: Boolean(u.is_active) });
    };

    const saveEdit = async () => {
        if (!editingUbic || !editForm.name.trim() || !editForm.sede_id) return;
        setSavingEdit(true);
        try {
            const { data } = await axios.put(`/api/ubicaciones/${editingUbic.id}`, {
                name: editForm.name.trim(),
                code: editForm.code.trim() || null,
                sede_id: Number(editForm.sede_id),
                is_active: editForm.is_active,
            });
            setList((prev) => prev.map((u) => u.id === data.id ? data : u));
            clearCatalogCache();
            setEditingUbic(null);
            notify.success("Ubicación actualizada");
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        } finally { setSavingEdit(false); }
    };

    const total = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / Number(perPage)));
    const currentPage = Math.min(page, lastPage);
    const paginatedList = useMemo(() => filtered.slice((currentPage - 1) * Number(perPage), currentPage * Number(perPage)), [filtered, currentPage, perPage]);
    useEffect(() => { if (currentPage !== page) setPage(currentPage); }, [currentPage, page]);
    useEffect(() => { localStorage.setItem("ubicaciones.perPage", perPage); }, [perPage]);
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
                    <h1 className="text-2xl font-semibold">Ubicaciones</h1>
                    <p className="text-muted-foreground">Asigna ubicaciones a sedes.</p>
                </div>
                <form onSubmit={create} className="flex flex-wrap gap-2">
                    <Select value={sedeForNew} onValueChange={setSedeForNew}>
                        <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Sede" /></SelectTrigger>
                        <SelectContent>
                            {sedes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
                    <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
                    <Button type="submit" disabled={saving || !name.trim() || !sedeForNew}>{saving ? "Guardando" : "Agregar"}</Button>
                </form>
            </div>

            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <CardTitle>Listado</CardTitle>
                    <Select value={sedeId} onValueChange={setSedeId}>
                        <SelectTrigger className="w-48 h-10">
                            <SelectValue placeholder="Filtrar por sede" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {sedes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Sede</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead className="text-right">Activa</TableHead>
                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : paginatedList.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.name}</TableCell>
                                    <TableCell>{u.sede?.name || u.sede_name || "-"}</TableCell>
                                    <TableCell>{u.code || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <Switch checked={u.is_active} onCheckedChange={() => toggle(u)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {!loading && filtered.length > 0 && (
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

            <Dialog open={!!editingUbic} onOpenChange={(open) => { if (!savingEdit) setEditingUbic(open ? editingUbic : null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Editar ubicación</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Sede</Label>
                            <Select value={editForm.sede_id} onValueChange={(v) => setEditForm((prev) => ({ ...prev, sede_id: v }))}>
                                <SelectTrigger><SelectValue placeholder="Sede" /></SelectTrigger>
                                <SelectContent>{sedes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-ubic-name">Nombre</Label>
                            <Input id="edit-ubic-name" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-ubic-code">Código</Label>
                            <Input id="edit-ubic-code" value={editForm.code} onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="Código (opcional)" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch id="edit-ubic-active" checked={editForm.is_active} onCheckedChange={(v) => setEditForm((prev) => ({ ...prev, is_active: !!v }))} />
                            <Label htmlFor="edit-ubic-active" className="cursor-pointer">Activa</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUbic(null)} disabled={savingEdit}>Cancelar</Button>
                        <Button onClick={saveEdit} disabled={savingEdit || !editForm.name.trim() || !editForm.sede_id}>{savingEdit ? "Guardando…" : "Guardar"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
