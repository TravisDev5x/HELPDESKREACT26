import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Sedes() {
    const [list, setList] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [type, setType] = useState("physical");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/sedes");
            setList(data);
        } catch (err) {
            toast({ description: "No se pudieron cargar las sedes", variant: "destructive" });
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
            setName(""); setCode(""); setType("physical");
            toast({ description: "Sede creada" });
        } catch (err) {
            toast({ description: err?.response?.data?.message || "No se pudo crear", variant: "destructive" });
        } finally { setSaving(false); }
    };

    const toggle = async (sede) => {
        try {
            const { data } = await axios.put(`/api/sedes/${sede.id}`, { ...sede, is_active: !sede.is_active });
            setList((prev) => prev.map((s) => s.id === data.id ? data : s));
        } catch {
            toast({ description: "No se pudo actualizar", variant: "destructive" });
        }
    };

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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
                            ) : list.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : (
                                list.map((sede) => (
                                    <TableRow key={sede.id}>
                                        <TableCell>{sede.name}</TableCell>
                                        <TableCell>{sede.code || "-"}</TableCell>
                                        <TableCell className="capitalize">{sede.type}</TableCell>
                                        <TableCell className="text-right">
                                            <Switch checked={sede.is_active} onCheckedChange={() => toggle(sede)} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
