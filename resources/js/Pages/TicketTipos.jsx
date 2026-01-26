import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TicketTipos() {
    const [types, setTypes] = useState([]);
    const [areas, setAreas] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [{ data: typeData }, { data: areasData }] = await Promise.all([
                axios.get("/api/ticket-types"),
                axios.get("/api/areas"),
            ]);
            setTypes(typeData);
            setAreas(areasData);
        } catch {
            toast({ description: "No se pudieron cargar", variant: "destructive" });
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
            setName(""); setCode(""); setSelectedAreas([]);
            toast({ description: "Tipo de ticket creado" });
        } catch (err) {
            toast({ description: err?.response?.data?.message || "No se pudo crear", variant: "destructive" });
        } finally { setSaving(false); }
    };

    const toggleActive = async (item) => {
        try {
            const { data } = await axios.put(`/api/ticket-types/${item.id}`, { ...item, is_active: !item.is_active });
            setTypes((prev) => prev.map((t) => t.id === data.id ? data : t));
        } catch {
            toast({ description: "No se pudo actualizar", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Tipos de Ticket</h1>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
                            ) : types.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : types.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.name}</TableCell>
                                    <TableCell>{t.code}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {t.areas?.length ? t.areas.map((a) => a.name).join(", ") : "—"}
                                    </TableCell>
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
