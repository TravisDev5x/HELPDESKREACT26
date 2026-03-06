import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { notify } from "@/lib/notify";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearCatalogCache } from "@/lib/catalogCache";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { TablePagination } from "@/components/ui/table-pagination";
import { ArrowLeft, Pencil } from "lucide-react";

const RESOLVE_BASE = "/resolbeb";
const PER_PAGE_OPTIONS = ["10", "15", "25", "50", "100"];

export default function ResolbebTipos() {
    const [types, setTypes] = useState([]);
    const [areas, setAreas] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", code: "", area_ids: [] });
    const [savingEdit, setSavingEdit] = useState(false);
    const [perPage, setPerPage] = useState(() => localStorage.getItem("resolbebTipos.perPage") || "10");
    const [page, setPage] = useState(1);

    const load = async () => {
        setLoading(true);
        try {
            const [{ data: typeData }, { data: areasData }] = await Promise.all([
                axios.get("/api/ticket-types"),
                axios.get("/api/areas"),
            ]);
            setTypes(typeData);
            setAreas(areasData);
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudieron cargar"));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const toggleArea = (id) => {
        setSelectedAreas((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const create = async (e) => {
        e.preventDefault();
        if (!name.trim() || !code.trim()) return;
        setSaving(true);
        try {
            const { data } = await axios.post("/api/ticket-types", {
                name,
                code,
                area_ids: selectedAreas,
            });
            setTypes((prev) => [data, ...prev]);
            clearCatalogCache();
            setName(""); setCode(""); setSelectedAreas([]);
            notify.success("Tipo de ticket creado");
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo crear"));
        } finally { setSaving(false); }
    };

    const toggleActive = async (item) => {
        try {
            const { data } = await axios.put(`/api/ticket-types/${item.id}`, { ...item, is_active: !item.is_active });
            setTypes((prev) => prev.map((t) => t.id === data.id ? data : t));
            clearCatalogCache();
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        }
    };

    const openEdit = (item) => {
        setEditing(item);
        setEditForm({ name: item.name || "", code: item.code || "", area_ids: (item.areas || []).map((a) => a.id) });
    };
    const toggleEditArea = (areaId) => {
        setEditForm((prev) => prev.area_ids.includes(areaId) ? { ...prev, area_ids: prev.area_ids.filter((id) => id !== areaId) } : { ...prev, area_ids: [...prev.area_ids, areaId] });
    };
    const saveEdit = async () => {
        if (!editing || !editForm.name.trim() || !editForm.code.trim()) return;
        setSavingEdit(true);
        try {
            const { data } = await axios.put(`/api/ticket-types/${editing.id}`, { name: editForm.name.trim(), code: editForm.code.trim(), area_ids: editForm.area_ids, is_active: editing.is_active });
            setTypes((prev) => prev.map((t) => t.id === data.id ? data : t));
            clearCatalogCache(); setEditing(null); notify.success("Tipo actualizado");
        } catch (err) { notify.error(getApiErrorMessage(err, "No se pudo actualizar")); }
        finally { setSavingEdit(false); }
    };

    const total = types.length;
    const lastPage = Math.max(1, Math.ceil(total / Number(perPage)));
    const currentPage = Math.min(page, lastPage);
    const paginatedList = useMemo(() => types.slice((currentPage - 1) * Number(perPage), currentPage * Number(perPage)), [types, currentPage, perPage]);
    useEffect(() => { if (currentPage !== page) setPage(currentPage); }, [currentPage, page]);
    useEffect(() => { localStorage.setItem("resolbebTipos.perPage", perPage); }, [perPage]);
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
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link to={RESOLVE_BASE}><ArrowLeft className="h-4 w-4 mr-1" /> Volver a Resolbeb</Link>
                </Button>
            </div>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Tipos de Ticket (Resolbeb)</h1>
                    <p className="text-muted-foreground text-sm">Clasificación por falla/solicitud y áreas responsables.</p>
                </div>
                <form onSubmit={create} className="flex flex-wrap gap-2">
                    <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
                    <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
                    <Select value={selectedAreas[0] ? String(selectedAreas[0]) : ""} onValueChange={(v) => toggleArea(Number(v))}>
                        <SelectTrigger className="w-48 h-10">
                            <SelectValue placeholder="Agregar área" />
                        </SelectTrigger>
                        <SelectContent>
                            {areas.map((a) => (
                                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                                <TableHead>Áreas responsables</TableHead>
                                <TableHead className="text-right">Activa</TableHead>
                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>
                            ) : types.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : paginatedList.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.name}</TableCell>
                                    <TableCell>{t.code}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {t.areas?.length ? t.areas.map((a) => a.name).join(", ") : "—"}
                                    </TableCell>
                                    <TableCell className="text-right"><Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} /></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /> Editar</Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {!loading && types.length > 0 && (
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
                    <DialogHeader><DialogTitle>Editar tipo de ticket</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Nombre</Label><Input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre" /></div>
                        <div className="grid gap-2"><Label>Código</Label><Input value={editForm.code} onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="Código" /></div>
                        <div className="grid gap-2">
                            <Label>Áreas responsables</Label>
                            <div className="flex flex-wrap gap-2 border rounded-md p-2 max-h-32 overflow-y-auto">
                                {areas.map((a) => (
                                    <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" checked={editForm.area_ids.includes(a.id)} onChange={() => toggleEditArea(a.id)} className="rounded" />
                                        {a.name}
                                    </label>
                                ))}
                            </div>
                        </div>
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
