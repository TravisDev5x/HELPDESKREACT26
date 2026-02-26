import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { primaryBarColor } from "@/lib/chartColors";

/**
 * BarChart con ejes y cuadrícula para cards del dashboard.
 * Barras horizontales: etiqueta en Y, valor en X. Compatible con tema claro/oscuro.
 * Props: items [{ label, value }], height?
 */
export function CardBarChart({ items = [], height = 240 }) {
    const safeItems = Array.isArray(items) ? items : [];
    const data = useMemo(
        () =>
            safeItems.map((item) => ({
                label: String(item?.label ?? "").trim() || "—",
                value: Number(item?.value ?? 0) || 0,
            })),
        [safeItems]
    );
    const maxValue = useMemo(() => {
        const values = data.map((d) => d.value).filter(Number.isFinite);
        return values.length ? Math.max(...values) : 1;
    }, [data]);

    if (data.length === 0) return null;

    const gridStroke = "hsl(var(--border))";
    const tickStyle = { fill: "hsl(var(--muted-foreground))", fontSize: 10 };

    return (
        <div className="w-full" style={{ height }} role="img" aria-label="Gráfico de barras por categoría">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={data}
                    margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={gridStroke}
                        horizontal={true}
                        vertical={true}
                    />
                    <XAxis
                        type="number"
                        domain={[0, maxValue]}
                        tick={tickStyle}
                        axisLine={{ stroke: gridStroke }}
                        tickLine={{ stroke: gridStroke }}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={90}
                        tick={{ ...tickStyle, fontSize: 10 }}
                        axisLine={{ stroke: gridStroke }}
                        tickLine={false}
                        tickFormatter={(v) => (String(v).length > 14 ? String(v).slice(0, 12) + "…" : v)}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const p = payload[0].payload;
                            return (
                                <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md text-xs ring-1 ring-border/50">
                                    <p className="font-medium text-foreground truncate max-w-[180px]" title={p.label}>
                                        {p.label}
                                    </p>
                                    <p className="text-muted-foreground font-mono mt-0.5">{p.value}</p>
                                </div>
                            );
                        }}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    />
                    <Bar
                        dataKey="value"
                        fill={primaryBarColor}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={20}
                        isAnimationActive={true}
                        animationDuration={300}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
