import { useEffect, useState, useMemo } from "react";
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
import { Pencil } from "lucide-react";

const PER_PAGE_OPTIONS = ["10", "15", "25", "50", "100"];

export default function Sedes() {
    const [list, setList] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [type, setType] = useState("physical");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingSede, setEditingSede] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", code: "", type: "physical", is_active: true });
    const [savingEdit, setSavingEdit] = useState(false);
    const [perPage, setPerPage] = useState(() => localStorage.getItem("sedes.perPage") || "10");
    const [page, setPage] = useState(1);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/sedes");
            setList(data);
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudieron cargar las sedes"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const create = async (e) => {
        e.preventDefault();
        if (name.trim().length < 2) return;
        setSaving(true);
        try {
            const { data } = await axios.post("/api/sedes", { name, code: code || null, type });
            setList((prev) => [data, ...prev]);
            clearCatalogCache();
            setName(""); setCode(""); setType("physical");
            notify.success("Sede creada");
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo crear"));
        } finally { setSaving(false); }
    };

    const toggle = async (sede) => {
        try {
            const { data } = await axios.put(`/api/sedes/${sede.id}`, { ...sede, is_active: !sede.is_active });
            setList((prev) => prev.map((s) => s.id === data.id ? data : s));
            clearCatalogCache();
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        }
    };

    const openEdit = (sede) => {
        setEditingSede(sede);
        setEditForm({
            name: sede.name || "",
            code: sede.code || "",
            type: sede.type || "physical",
            is_active: Boolean(sede.is_active),
        });
    };

    const saveEdit = async () => {
        if (!editingSede || editForm.name.trim().length < 2) return;
        setSavingEdit(true);
        try {
            const { data } = await axios.put(`/api/sedes/${editingSede.id}`, {
                name: editForm.name.trim(),
                code: editForm.code.trim() || null,
                type: editForm.type,
                is_active: editForm.is_active,
            });
            setList((prev) => prev.map((s) => s.id === data.id ? data : s));
            clearCatalogCache();
            setEditingSede(null);
            notify.success("Sede actualizada");
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar la sede"));
        } finally {
            setSavingEdit(false);
        }
    };

    const total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / Number(perPage)));
    const currentPage = Math.min(page, lastPage);
    const paginatedList = useMemo(
        () => list.slice((currentPage - 1) * Number(perPage), currentPage * Number(perPage)),
        [list, currentPage, perPage]
    );

    useEffect(() => {
        if (currentPage !== page) setPage(currentPage);
    }, [currentPage, page]);

    useEffect(() => {
        localStorage.setItem("sedes.perPage", perPage);
    }, [perPage]);

    const goToPage = (p) => {
        const next = Math.max(1, Math.min(p, lastPage));
        setPage(next);
    };

    const from = total === 0 ? 0 : (currentPage - 1) * Number(perPage) + 1;
    const to = Math.min(currentPage * Number(perPage), total);
    const pageNumbers = useMemo(() => {
        if (lastPage <= 7) {
            return Array.from({ length: lastPage }, (_, i) => i + 1);
        }
        const pages = [1];
        if (currentPage > 3) pages.push("…");
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(lastPage - 1, currentPage + 1); i++) {
            if (!pages.includes(i)) pages.push(i);
        }
        if (currentPage < lastPage - 2) pages.push("…");
        if (lastPage > 1) pages.push(lastPage);
        return pages;
    }, [lastPage, currentPage]);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Sedes</h1>
                    <p className="text-muted-foreground">Catálogo de sedes físicas y virtuales.</p>
                </div>
                <form onSubmit={create} className="flex flex-wrap gap-2">
                    <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
                    <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-32 h-10">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="physical">Física</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="submit" disabled={saving || name.trim().length < 2}>{saving ? "Guardando" : "Agregar"}</Button>
                </form>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Activa</TableHead>
                                <TableHead className="w-[80px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>
                            ) : list.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : (
                                paginatedList.map((sede) => (
                                    <TableRow key={sede.id}>
                                        <TableCell>{sede.name}</TableCell>
                                        <TableCell>{sede.code || "-"}</TableCell>
                                        <TableCell className="capitalize">{sede.type === "physical" ? "Física" : "Virtual"}</TableCell>
                                        <TableCell className="text-right">
                                            <Switch checked={sede.is_active} onCheckedChange={() => toggle(sede)} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEdit(sede)}>
                                                <Pencil className="h-3.5 w-3.5" /> Editar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
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

            <Dialog open={!!editingSede} onOpenChange={(open) => { if (!savingEdit) setEditingSede(open ? editingSede : null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar sede</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Nombre</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Nombre de la sede"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-code">Código</Label>
                            <Input
                                id="edit-code"
                                value={editForm.code}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                                placeholder="Código (opcional)"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tipo</Label>
                            <Select value={editForm.type} onValueChange={(v) => setEditForm((prev) => ({ ...prev, type: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="physical">Física</SelectItem>
                                    <SelectItem value="virtual">Virtual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="edit-active"
                                checked={editForm.is_active}
                                onCheckedChange={(v) => setEditForm((prev) => ({ ...prev, is_active: !!v }))}
                            />
                            <Label htmlFor="edit-active" className="cursor-pointer">Activa</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSede(null)} disabled={savingEdit}>Cancelar</Button>
                        <Button onClick={saveEdit} disabled={savingEdit || editForm.name.trim().length < 2}>
                            {savingEdit ? "Guardando…" : "Guardar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
