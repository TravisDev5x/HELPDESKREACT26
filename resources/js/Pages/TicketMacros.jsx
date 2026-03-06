import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { handleAuthError, getApiErrorMessage } from "@/lib/apiErrors";
import { clearCatalogCache } from "@/lib/catalogCache";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";

const emptyForm = { name: "", content: "", category: "", is_active: true };
const PER_PAGE_OPTIONS = ["10", "15", "25", "50", "100"];

export default function TicketMacros() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [perPage, setPerPage] = useState(() => localStorage.getItem("ticketMacros.perPage") || "10");
    const [page, setPage] = useState(1);

    const canSave = useMemo(
        () => form.name.trim().length >= 2 && form.content.trim().length >= 1,
        [form.name, form.content]
    );

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/ticket-macros");
            setList(Array.isArray(data) ? data : []);
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudieron cargar las plantillas"));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditing(null);
    };

    const openCreate = () => {
        resetForm();
        setOpen(true);
    };

    const openEdit = (macro) => {
        setEditing(macro);
        setForm({
            name: macro.name ?? "",
            content: macro.content ?? "",
            category: macro.category ?? "",
            is_active: Boolean(macro.is_active),
        });
        setOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSave) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                content: form.content.trim(),
                category: form.category.trim() || null,
                is_active: form.is_active,
            };
            if (editing) {
                const { data } = await axios.put(`/api/ticket-macros/${editing.id}`, payload);
                setList((prev) => prev.map((m) => (m.id === data.id ? data : m)));
                notify.success("Plantilla actualizada");
            } else {
                const { data } = await axios.post("/api/ticket-macros", payload);
                setList((prev) => [data, ...prev]);
                notify.success("Plantilla creada");
            }
            clearCatalogCache();
            setOpen(false);
            resetForm();
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo guardar la plantilla"));
            }
        } finally {
            setSaving(false);
        }
    };

    const total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / Number(perPage)));
    const currentPage = Math.min(page, lastPage);
    const paginatedList = useMemo(() => list.slice((currentPage - 1) * Number(perPage), currentPage * Number(perPage)), [list, currentPage, perPage]);
    useEffect(() => { if (currentPage !== page) setPage(currentPage); }, [currentPage, page]);
    useEffect(() => { localStorage.setItem("ticketMacros.perPage", perPage); }, [perPage]);
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

    const toggleActive = async (macro) => {
        const next = !macro.is_active;
        try {
            const { data } = await axios.put(`/api/ticket-macros/${macro.id}`, {
                name: macro.name,
                content: macro.content,
                category: macro.category ?? null,
                is_active: next,
            });
            setList((prev) => prev.map((m) => (m.id === data.id ? data : m)));
            clearCatalogCache();
            notify.success(next ? "Plantilla activada" : "Plantilla desactivada");
        } catch (err) {
            if (!handleAuthError(err)) {
                notify.error(getApiErrorMessage(err, "No se pudo actualizar el estado"));
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Plantillas de respuesta (Macros)</h1>
                    <p className="text-muted-foreground text-sm">Catálogo de respuestas predefinidas para comentarios en tickets.</p>
                </div>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate}>Nueva plantilla</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editing ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
                        </DialogHeader>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label htmlFor="macro-name">Nombre</Label>
                                <Input
                                    id="macro-name"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Ej. Saludo inicial, Cierre por falta de respuesta"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="macro-category">Categoría (opcional)</Label>
                                <Input
                                    id="macro-category"
                                    value={form.category}
                                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                                    placeholder="Ej. Atención inicial, Cierre"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="macro-content">Contenido</Label>
                                <Textarea
                                    id="macro-content"
                                    value={form.content}
                                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                                    placeholder="Texto de la plantilla que se insertará en el comentario..."
                                    className="min-h-[180px] resize-y"
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                <div>
                                    <p className="text-sm font-medium">Activa</p>
                                    <p className="text-xs text-muted-foreground">Solo las plantillas activas aparecen en el desplegable al comentar.</p>
                                </div>
                                <Switch
                                    checked={form.is_active}
                                    onCheckedChange={(val) => setForm((f) => ({ ...f, is_active: val }))}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => { setOpen(false); resetForm(); }}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={!canSave || saving}>
                                    {saving ? (
                                        <>
                                            <span className="animate-spin mr-2 inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full" aria-hidden />
                                            Guardando...
                                        </>
                                    ) : editing ? "Actualizar" : "Crear"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="w-[180px]">Categoría</TableHead>
                            <TableHead className="w-[140px]">Estado</TableHead>
                            <TableHead className="text-right w-[120px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : list.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                                    No hay plantillas registradas. Crea una para que los agentes puedan insertarla al comentar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedList.map((macro) => (
                                <TableRow key={macro.id}>
                                    <TableCell className="font-medium">{macro.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{macro.category || "—"}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={Boolean(macro.is_active)}
                                                onCheckedChange={() => toggleActive(macro)}
                                            />
                                            <Badge variant={macro.is_active ? "default" : "secondary"}>
                                                {macro.is_active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(macro)}>
                                            Editar
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
            </div>
        </div>
    );
}
