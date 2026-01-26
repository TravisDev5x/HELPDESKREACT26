import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

export default function TicketEstados() {
    const [list, setList] = useState([]);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [isFinal, setIsFinal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/ticket-states");
            setList(data);
        } catch {
            toast({ description: "No se pudieron cargar", variant: "destructive" });
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const create = async (e) => {
        e.preventDefault();
        if (!name.trim() || !code.trim()) return;
        setSaving(true);
        try {
            const { data } = await axios.post("/api/ticket-states", { name, code, is_final: isFinal });
            setList((prev) => [data, ...prev]);
            setName(""); setCode(""); setIsFinal(false);
            toast({ description: "Estado creado" });
        } catch (err) {
            toast({ description: err?.response?.data?.message || "No se pudo crear", variant: "destructive" });
        } finally { setSaving(false); }
    };

    const toggle = async (item) => {
        try {
            const { data } = await axios.put(`/api/ticket-states/${item.id}`, { ...item, is_active: !item.is_active });
            setList((prev) => prev.map((s) => s.id === data.id ? data : s));
        } catch {
            toast({ description: "No se pudo actualizar", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Estados de Ticket</h1>
                    <p className="text-muted-foreground text-sm">Ciclo de vida configurable.</p>
                </div>
                <form onSubmit={create} className="flex flex-wrap gap-2">
                    <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
                    <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={isFinal} onCheckedChange={setIsFinal} />
                        Final
                    </label>
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
                                <TableHead>Final</TableHead>
                                <TableHead className="text-right">Activa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
                            ) : list.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
                            ) : list.map((st) => (
                                <TableRow key={st.id}>
                                    <TableCell>{st.name}</TableCell>
                                    <TableCell>{st.code}</TableCell>
                                    <TableCell>{st.is_final ? "Sí" : "No"}</TableCell>
                                    <TableCell className="text-right"><Switch checked={st.is_active} onCheckedChange={() => toggle(st)} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
