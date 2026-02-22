import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { Switch } from "@/components/ui/switch";
import { clearCatalogCache } from "@/lib/catalogCache";
import { getApiErrorMessage } from "@/lib/apiErrors";

export default function Ubicaciones() {
    const [sedes, setSedes] = useState([]);
    const [list, setList] = useState([]);
    const [sedeId, setSedeId] = useState("all");
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [sedeForNew, setSedeForNew] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
                is_active: !ubic.is_active,
            });
            setList((prev) => prev.map((u) => u.id === data.id ? data : u));
            clearCatalogCache();
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        }
    };

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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : filtered.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.name}</TableCell>
                                    <TableCell>{u.sede?.name || u.sede_name || "-"}</TableCell>
                                    <TableCell>{u.code || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <Switch checked={u.is_active} onCheckedChange={() => toggle(u)} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
