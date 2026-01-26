import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

export default function Prioridades() {
    const [list, setList] = useState([]);
    const [name, setName] = useState("");
    const [level, setLevel] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/priorities");
            setList(data);
        } catch {
            toast({ description: "No se pudieron cargar", variant: "destructive" });
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const create = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const { data } = await axios.post("/api/priorities", { name, level });
            setList((prev) => [data, ...prev].sort((a, b) => a.level - b.level));
            setName(""); setLevel(1);
            toast({ description: "Prioridad creada" });
        } catch (err) {
            toast({ description: err?.response?.data?.message || "No se pudo crear", variant: "destructive" });
        } finally { setSaving(false); }
    };

    const toggle = async (item) => {
        try {
            const { data } = await axios.put(`/api/priorities/${item.id}`, { ...item, is_active: !item.is_active });
            setList((prev) => prev.map((p) => p.id === data.id ? data : p));
        } catch {
            toast({ description: "No se pudo actualizar", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Prioridades</h1>
                    <p className="text-muted-foreground text-sm">Base para SLAs futuros.</p>
                </div>
                <form onSubmit={create} className="flex flex-wrap gap-2">
                    <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
                    <Input type="number" min={1} max={10} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="w-24" />
                    <Button type="submit" disabled={saving || !name.trim()}>Agregar</Button>
                </form>
            </div>
            <Card>
                <CardHeader><CardTitle>Listado</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nivel</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="text-right">Activa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center">Cargando...</TableCell></TableRow>
                            ) : list.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : list.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.level}</TableCell>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell className="text-right"><Switch checked={p.is_active} onCheckedChange={() => toggle(p)} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
