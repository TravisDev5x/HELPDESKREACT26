import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { Tag } from "lucide-react";
import { clearCatalogCache } from "@/lib/catalogCache";
import { getApiErrorMessage } from "@/lib/apiErrors";

export default function IncidentTipos() {
    const [list, setList] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/incident-types");
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
            const { data } = await axios.post("/api/incident-types", { name, code });
            setList((prev) => [data, ...prev]);
            clearCatalogCache();
            setName(""); setCode("");
            notify.success("Tipo de incidencia creado");
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo crear"));
        } finally { setSaving(false); }
    };

    const toggleActive = async (item) => {
        try {
            const { data } = await axios.put(`/api/incident-types/${item.id}`, { ...item, is_active: !item.is_active });
            setList((prev) => prev.map((t) => t.id === data.id ? data : t));
            clearCatalogCache();
        } catch (err) {
            notify.error(getApiErrorMessage(err, "No se pudo actualizar"));
        }
    };

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                        <Tag className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tipos de Incidencia</h1>
                        <p className="text-muted-foreground text-sm">Clasificacion por tipo de evento.</p>
                    </div>
                </div>
            </div>

            <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Nuevo tipo</CardTitle>
                    <CardDescription className="text-xs">Registra un tipo para clasificar incidencias.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-3 items-end">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Nombre</Label>
                            <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Codigo</Label>
                            <Input placeholder="Codigo" value={code} onChange={(e) => setCode(e.target.value)} />
                        </div>
                        <Button type="submit" disabled={saving || !name.trim() || !code.trim()} className="h-9">
                            Agregar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle>Listado</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-b border-border/50 hover:bg-transparent">
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Nombre</TableHead>
                                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Codigo</TableHead>
                                <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Activa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-16">
                                        <div className="flex items-center gap-4 px-4">
                                            <Skeleton className="h-4 w-40" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : list.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">Sin registros</TableCell></TableRow>
                            ) : list.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.name}</TableCell>
                                    <TableCell>{t.code}</TableCell>
                                    <TableCell className="text-right"><Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
