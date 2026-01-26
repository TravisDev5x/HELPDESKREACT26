import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Ticket, Users, Network, Activity } from "lucide-react";

const MetricList = ({ title, icon: Icon, items }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            {items?.length ? items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{item.label}</span>
                        <Badge variant="secondary" className="text-xs px-2">{item.value}</Badge>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary/80"
                            style={{ width: `${Math.min(100, (item.value / (items[0]?.value || 1)) * 100)}%` }}
                        />
                    </div>
                </div>
            )) : <p className="text-xs text-muted-foreground">Sin datos</p>}
        </CardContent>
    </Card>
);

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get("/api/tickets/analytics");
                setData(data);
                setError("");
            } catch (err) {
                const msg = err?.response?.data?.message || "No se pudieron cargar las métricas";
                setError(msg);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="text-sm text-muted-foreground">Cargando panel...</div>;
    if (!data) return <div className="text-sm text-destructive">{error || "No se pudieron cargar métricas."}</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="col-span-full">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4 text-primary" />
                        Salud del sistema
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">RBAC aplicado</Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tickets quemados</p>
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <Flame className="h-4 w-4 text-destructive" />
                            {data.burned}
                        </div>
                    </div>
                    {data.states?.map((s, idx) => (
                        <div key={idx} className="space-y-1">
                            <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                            <div className="text-lg font-semibold">{s.value}</div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <MetricList title="Usuarios que más cierran" icon={Users} items={data.top_resolvers} />
            <MetricList title="Áreas que más reciben" icon={Network} items={data.areas_receive} />
            <MetricList title="Áreas que más resuelven" icon={Ticket} items={data.areas_resolve} />
            <MetricList title="Tipos más frecuentes" icon={Ticket} items={data.types_frequent} />
            <MetricList title="Tipos más resueltos" icon={Ticket} items={data.types_resolved} />
        </div>
    );
}
